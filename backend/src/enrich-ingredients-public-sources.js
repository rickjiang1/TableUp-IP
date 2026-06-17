import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { canonicalUnitForIngredient } from "./ingredientUnitConversion.js";
import { query, sqlBoolean, sqlNumber, sqlString } from "./postgres.js";

const environmentTargets = {
  dev: { projectRef: "tochbwhcyoqqdepghisc", label: "TableUp-DEV" },
  prod: { projectRef: "oapybkblltlyugmmtqjr", label: "TableUp" }
};

const args = parseArgs(process.argv.slice(2));
loadEnv(args.environment);

if (!args.environment || !environmentTargets[args.environment]) {
  console.error("Usage: node backend/src/enrich-ingredients-public-sources.js --env dev [--dry-run]");
  console.error("Use --env prod --allow-prod-write only for an intentional production enrichment.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

const sourcePaths = {
  usdaFood: args.usdaFoodPath || "/private/tmp/fdc-sr-legacy/FoodData_Central_sr_legacy_food_csv_2018-04/food.csv",
  usdaCategory: args.usdaCategoryPath || "/private/tmp/fdc-sr-legacy/FoodData_Central_sr_legacy_food_csv_2018-04/food_category.csv",
  openFoodFacts: args.openFoodFactsPath || "/private/tmp/openfoodfacts-ingredients.json",
  wikidata: args.wikidataPath || "/private/tmp/wikidata-ingredients.json"
};

await main();

async function main() {
  for (const path of Object.values(sourcePaths)) {
    if (!existsSync(path)) {
      throw new Error(`Missing source file: ${path}`);
    }
  }

  await bootstrapSourceReferenceTable();
  const existing = await fetchExistingIngredientIndex();
  const candidates = buildCandidates(existing);
  const usableCandidates = [...candidates.values()]
    .filter((candidate) => candidate.qualityScore >= 0.78)
    .sort((left, right) => right.qualityScore - left.qualityScore || left.ingredient_slug.localeCompare(right.ingredient_slug));
  const accepted = usableCandidates
    .filter((candidate) => !existing.slugSet.has(candidate.ingredient_slug))
    .sort((left, right) => right.qualityScore - left.qualityScore || left.ingredient_slug.localeCompare(right.ingredient_slug));
  const enrichedExisting = usableCandidates
    .filter((candidate) => existing.slugSet.has(candidate.ingredient_slug))
    .sort((left, right) => right.qualityScore - left.qualityScore || left.ingredient_slug.localeCompare(right.ingredient_slug));
  const enrichmentTargets = [...accepted, ...enrichedExisting];

  const ingredients = accepted.map((candidate) => ({
    ingredient_slug: candidate.ingredient_slug,
    canonical_name: candidate.canonical_name,
    category: candidate.category,
    canonical_unit: canonicalUnitForIngredient({
      ingredient_slug: candidate.ingredient_slug,
      canonical_name: candidate.canonical_name,
      category: candidate.category
    })
  }));

  const aliases = buildAliasRows(enrichmentTargets, existing.aliasSet);
  const references = enrichmentTargets.flatMap((candidate) => candidate.sources.map((source) => ({
    ingredient_slug: candidate.ingredient_slug,
    source_name: source.source_name,
    source_id: source.source_id,
    source_url: source.source_url,
    quality_score: candidate.qualityScore,
    notes: source.notes
  })));

  const report = {
    environment: args.environment,
    target: environmentTargets[args.environment].label,
    dryRun: args.dryRun,
    sourceFiles: Object.fromEntries(Object.entries(sourcePaths).map(([key, value]) => [key, basename(value)])),
    existingIngredients: existing.slugSet.size,
    acceptedIngredients: ingredients.length,
    aliases: aliases.length,
    sourceReferences: references.length,
    enrichedExistingIngredients: enrichedExisting.length,
    byPrimarySource: countBy(enrichmentTargets, (item) => item.sources[0]?.source_name || "unknown"),
    byCategory: countBy(accepted, (item) => item.category),
    samples: accepted.slice(0, 30).map((item) => ({
      ingredient_slug: item.ingredient_slug,
      canonical_name: item.canonical_name,
      category: item.category,
      qualityScore: Number(item.qualityScore.toFixed(2)),
      sources: item.sources.map((source) => source.source_name)
    }))
  };

  if (!args.dryRun) {
    await upsertIngredients(ingredients);
    const refreshed = await fetchIngredientIds([...new Set(enrichmentTargets.map((item) => item.ingredient_slug))]);
    await upsertAliases(aliases, refreshed);
    await upsertReferences(references, refreshed);
  }

  if (args.reportPath) {
    writeFileSync(args.reportPath, JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report, null, 2));
}

function buildCandidates(existing) {
  const candidates = new Map();
  for (const candidate of usdaCandidates()) addCandidate(candidates, existing, candidate);
  for (const candidate of openFoodFactsCandidates()) addCandidate(candidates, existing, candidate);
  for (const candidate of wikidataCandidates()) addCandidate(candidates, existing, candidate);
  return candidates;
}

function addCandidate(candidates, existing, candidate) {
  const canonicalName = cleanDisplayName(candidate.canonical_name);
  if (!isAcceptableIngredientName(canonicalName)) return;

  const slug = cleanSlug(candidate.ingredient_slug || canonicalName);
  if (!slug || slug.length < 2 || slug.length > 80) return;
  const existingMatch = findExistingIngredientMatch(existing, slug, [canonicalName, ...(candidate.aliases || [])]);
  const targetSlug = existingMatch?.ingredient_slug || slug;

  const current = candidates.get(targetSlug);
  const source = {
    source_name: candidate.source_name,
    source_id: candidate.source_id,
    source_url: candidate.source_url,
    notes: candidate.notes || ""
  };
  if (!current) {
    candidates.set(targetSlug, {
      ingredient_slug: targetSlug,
      canonical_name: existingMatch?.canonical_name || titleIngredient(canonicalName),
      category: normalizeCategory(existingMatch?.category || candidate.category),
      qualityScore: candidate.qualityScore,
      aliases: new Set([canonicalName, slug.replace(/_/g, " "), ...(candidate.aliases || [])]),
      sources: [source]
    });
    return;
  }

  current.qualityScore = Math.min(1, Math.max(current.qualityScore, candidate.qualityScore) + 0.08);
  current.category = bestCategory(current.category, normalizeCategory(existingMatch?.category || candidate.category));
  current.sources.push(source);
  for (const alias of [canonicalName, slug.replace(/_/g, " "), ...(candidate.aliases || [])]) current.aliases.add(alias);
}

function findExistingIngredientMatch(existing, slug, aliases) {
  const direct = existing.ingredientBySlug.get(slug);
  if (direct) return direct;
  for (const alias of aliases) {
    const match = existing.ingredientByAlias.get(normalizeName(alias));
    if (match) return match;
  }
  return null;
}

function usdaCandidates() {
  const categories = Object.fromEntries(parseCsv(readFileSync(sourcePaths.usdaCategory, "utf8")).map((row) => [row.id, row.description]));
  const rows = parseCsv(readFileSync(sourcePaths.usdaFood, "utf8"));
  const output = [];
  for (const row of rows) {
    const categoryName = categories[row.food_category_id] || "";
    const category = categoryFromUsda(categoryName);
    if (!category) continue;
    if (!isUsdaBaseIngredient(row.description, categoryName)) continue;

    const name = cleanUsdaName(row.description, categoryName);
    if (!name) continue;
    output.push({
      ingredient_slug: cleanSlug(name),
      canonical_name: name,
      category,
      qualityScore: 0.93,
      aliases: [name, row.description],
      source_name: "USDA FoodData Central SR Legacy",
      source_id: row.fdc_id,
      source_url: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${row.fdc_id}/nutrients`,
      notes: `${categoryName}: ${row.description}`
    });
  }
  return output;
}

function openFoodFactsCandidates() {
  const taxonomy = JSON.parse(readFileSync(sourcePaths.openFoodFacts, "utf8"));
  const output = [];
  for (const [key, value] of Object.entries(taxonomy)) {
    if (!key.startsWith("en:")) continue;
    const name = value?.name?.en || key.slice(3).replace(/-/g, " ");
    const parents = Array.isArray(value.parents) ? value.parents : [];
    const category = categoryFromOpenFoodFacts(name, parents);
    if (!category) continue;
    if (!isOpenFoodFactsIngredient(name, key, parents)) continue;

    const aliases = new Set([name, key.slice(3).replace(/-/g, " ")]);
    for (const language of ["zh", "fr", "es", "it", "de"]) {
      if (value?.name?.[language]) aliases.add(value.name[language]);
    }
    output.push({
      ingredient_slug: cleanSlug(name),
      canonical_name: name,
      category,
      qualityScore: parents.some((parent) => /ingredient|food|fruit|vegetable|meat|fish|spice|herb|cereal|legume|nut|seed|oil|dairy/.test(parent)) ? 0.86 : 0.79,
      aliases: [...aliases],
      source_name: "OpenFoodFacts ingredients taxonomy",
      source_id: key,
      source_url: `https://world.openfoodfacts.org/ingredient/${encodeURIComponent(key.slice(3))}`,
      notes: `parents=${parents.slice(0, 6).join(",")}`
    });
  }
  return output;
}

function wikidataCandidates() {
  const data = JSON.parse(readFileSync(sourcePaths.wikidata, "utf8"));
  const rows = data?.results?.bindings || [];
  const output = [];
  for (const row of rows) {
    const itemUrl = row.item?.value || "";
    const label = row.itemLabel?.value || "";
    const altLabels = String(row.itemAltLabel?.value || "")
      .split(/\s*,\s*/)
      .filter(Boolean);
    const best = bestWikidataName(label, altLabels);
    if (!best) continue;
    const category = categoryFromText(best);
    if (!category) continue;
    output.push({
      ingredient_slug: cleanSlug(best),
      canonical_name: best,
      category,
      qualityScore: 0.78,
      aliases: [label, ...altLabels].filter((alias) => alias.length <= 96),
      source_name: "Wikidata",
      source_id: itemUrl.split("/").pop() || itemUrl,
      source_url: itemUrl,
      notes: `label=${label}`
    });
  }
  return output;
}

function isUsdaBaseIngredient(description, categoryName) {
  const text = description.toLowerCase();
  if (rejectName(text)) return false;
  if (/\b(babyfood|restaurant|fast foods?|meal|entree|snack|cake|pie|cookie|cracker|candy|pudding|soup|stew|pizza|sandwich|beverage|smoothie|juice drink)\b/.test(text)) return false;
  if (/\b(cooked|boiled|fried|baked|broiled|roasted|grilled|sauteed|prepared|with salt|with sauce|with gravy|canned in syrup)\b/.test(text)) return false;
  if (/\b(carcass|separable lean|separable fat|composite|retail cuts?|all grades?|choice|select|prime|imported|grass fed|america's beef roast|external fat|rotisserie|bbq|barbecue|variety meats?|by products?|substitute|dressing)\b/.test(text)) return false;
  if (categoryName === "Fruits and Fruit Juices" && /\bjuice|nectar|drink|smoothie|canned|frozen|dried\b/.test(text)) return false;
  if (categoryName === "Vegetables and Vegetable Products" && /\bcanned|frozen|pickled|dehydrated|cooked\b/.test(text)) return false;
  return /\b(raw|unprepared|fresh|dried|dry|flour|oil|seed|seeds|nuts?|meat|raw)\b/.test(text) || ["Spices and Herbs", "Fats and Oils", "Cereal Grains and Pasta"].includes(categoryName);
}

function cleanUsdaName(description, categoryName) {
  const parts = description.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0].replace(/\([^)]*\)/g, "").trim();
  if (["Beef Products", "Pork Products", "Poultry Products", "Lamb, Veal, and Game Products", "Finfish and Shellfish Products"].includes(categoryName)) {
    return parts.slice(0, 4)
      .filter((part) => !/\b(raw|cooked|separable|lean|fat|choice|select|prime|all grades|trimmed|grass fed|imported|america's beef roast)\b/i.test(part))
      .join(" ")
      .replace(/\([^)]*\)/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (categoryName === "Spices and Herbs" && /^spices$/i.test(first) && parts[1]) return parts[1];
  if (categoryName === "Fats and Oils" && /^oil$/i.test(first) && parts[1]) return `${parts[1]} oil`;
  if (categoryName === "Cereal Grains and Pasta" && parts[1] && /\bflour|bran|germ|meal|pasta|rice|oats?|barley|cornmeal\b/i.test(description)) {
    return parts.slice(0, 2).join(" ");
  }
  return first;
}

function isOpenFoodFactsIngredient(name, key, parents) {
  const text = `${name} ${key} ${parents.join(" ")}`.toLowerCase();
  if (rejectName(text)) return false;
  if (/\ben:e\d+\b|\be\d{3,}/.test(text)) return false;
  if (/\b(product|preparation|made from|from concentrate|pasteurized|deodorized|hydrogenated|powdered drink|flavouring|flavoring|extract of|culture|enzyme|color|colour)\b/.test(text)) return false;
  if (name.length > 48 || name.split(/\s+/).length > 5) return false;
  return true;
}

function bestWikidataName(label, altLabels) {
  const candidates = [label, ...altLabels]
    .map(cleanDisplayName)
    .filter((value) => value && value.length <= 48 && value.split(/\s+/).length <= 4)
    .filter((value) => !rejectName(value.toLowerCase()))
    .filter((value) => !/^[A-Z][a-z]+ [a-z]+$/.test(value));
  return candidates.find((value) => /^[a-z][a-z '-]+$/i.test(value)) || "";
}

function rejectName(text) {
  return /\b(soup|stew|snack|dish|recipe|restaurant|brand|product|sauce with|seasoning mix|babyfood|infant|cereal ready|fast food|candy|beverage|drink|smoothie|pastry|pie|cake|cookie|cracker|sandwich|pizza|burger|meal|entree|dinner|lunch|breakfast)\b/.test(text);
}

function categoryFromUsda(categoryName) {
  if (categoryName === "Dairy and Egg Products") return "dairy";
  if (categoryName === "Spices and Herbs") return "spice";
  if (categoryName === "Fats and Oils") return "pantry";
  if (["Poultry Products", "Pork Products", "Beef Products", "Lamb, Veal, and Game Products"].includes(categoryName)) return "protein";
  if (categoryName === "Finfish and Shellfish Products") return "seafood";
  if (categoryName === "Fruits and Fruit Juices") return "fruit";
  if (categoryName === "Vegetables and Vegetable Products") return "vegetable";
  if (categoryName === "Nut and Seed Products") return "nut_seed";
  if (categoryName === "Legumes and Legume Products") return "legume";
  if (categoryName === "Cereal Grains and Pasta") return "grain";
  return "";
}

function categoryFromOpenFoodFacts(name, parents) {
  const text = `${name} ${parents.join(" ")}`.toLowerCase();
  return categoryFromText(text);
}

function categoryFromText(text) {
  const value = text.toLowerCase();
  if (/\b(fruit|apple|banana|berry|berries|mango|melon|pear|peach|plum|cherry|grape|citrus|orange|lemon|lime|pineapple|kiwi|papaya|date|fig)\b/.test(value)) return "fruit";
  if (/\b(vegetable|lettuce|cabbage|carrot|onion|garlic|pepper|tomato|potato|yam|squash|bean sprout|mushroom|radish|turnip|okra|eggplant|zucchini|cucumber)\b/.test(value)) return "vegetable";
  if (/\b(herb|basil|mint|parsley|cilantro|coriander|dill|thyme|rosemary|sage|tarragon|chive|lemongrass)\b/.test(value)) return "herb";
  if (/\b(spice|peppercorn|cumin|paprika|turmeric|cinnamon|clove|nutmeg|cardamom|anise|saffron|vanilla|za'atar)\b/.test(value)) return "spice";
  if (/\b(beef|pork|chicken|turkey|duck|lamb|veal|goat|mutton|meat|bacon|ham|sausage)\b/.test(value)) return "protein";
  if (/\b(fish|salmon|tuna|cod|shrimp|prawn|crab|lobster|clam|mussel|oyster|scallop|seafood)\b/.test(value)) return "seafood";
  if (/\b(milk|cream|cheese|yogurt|butter|egg|dairy)\b/.test(value)) return "dairy";
  if (/\b(rice|wheat|oat|barley|rye|corn|flour|pasta|noodle|grain|cereal|quinoa|millet)\b/.test(value)) return "grain";
  if (/\b(bean|lentil|pea|chickpea|soybean|legume)\b/.test(value)) return "legume";
  if (/\b(nut|almond|walnut|cashew|hazelnut|pecan|peanut|seed|sesame|sunflower|pumpkin seed)\b/.test(value)) return "nut_seed";
  if (/\b(oil|vinegar|sugar|salt|starch|syrup|honey)\b/.test(value)) return "pantry";
  return "";
}

function normalizeCategory(category) {
  return category || "other";
}

function bestCategory(current, next) {
  if (!current || current === "other") return next || current;
  if (!next || next === "other") return current;
  if (current === next) return current;
  if (current === "spice" && next === "herb") return "herb";
  return current;
}

function buildAliasRows(candidates, existingAliasSet) {
  const aliases = new Map();
  for (const candidate of candidates) {
    const baseAliases = new Set([
      candidate.canonical_name,
      candidate.ingredient_slug.replace(/_/g, " "),
      singularize(candidate.canonical_name),
      pluralize(candidate.canonical_name),
      ...candidate.aliases
    ]);
    for (const alias of baseAliases) {
      const clean = cleanDisplayName(alias);
      if (!clean || clean.length > 96) continue;
      const key = normalizeName(clean);
      if (existingAliasSet.has(key)) continue;
      const current = aliases.get(key);
      const score = clean === candidate.canonical_name ? 1 : 0.86;
      if (!current || current.confidence_score < score) {
        aliases.set(key, {
          alias_name: clean,
          ingredient_slug: candidate.ingredient_slug,
          canonical_name: candidate.canonical_name,
          language: containsCjk(clean) ? "zh" : "en",
          category: candidate.category,
          confidence_score: score,
          verified: candidate.qualityScore >= 0.9
        });
      }
    }
  }
  return [...aliases.values()].sort((left, right) => left.ingredient_slug.localeCompare(right.ingredient_slug) || left.alias_name.localeCompare(right.alias_name));
}

async function bootstrapSourceReferenceTable() {
  await query(`
    create table if not exists ingredient_source_references (
      id uuid primary key default gen_random_uuid(),
      ingredient_id uuid references ingredients(ingredient_id) on delete cascade,
      ingredient_slug text not null,
      source_name text not null,
      source_id text not null,
      source_url text not null default '',
      quality_score numeric not null default 0,
      notes text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create unique index if not exists ingredient_source_references_unique_idx
      on ingredient_source_references (ingredient_slug, source_name, source_id);
    grant select, insert, update, delete on ingredient_source_references to anon;
  `);
}

async function fetchExistingIngredientIndex() {
  const ingredients = await query(`select ingredient_id, ingredient_slug, canonical_name, category from ingredients;`);
  const aliases = await query(`select alias_name, ingredient_slug, ingredient_id from ingredient_aliases;`);
  const ingredientBySlug = new Map(ingredients.map((row) => [String(row.ingredient_slug || "").toLowerCase(), row]));
  const ingredientById = new Map(ingredients.map((row) => [String(row.ingredient_id || ""), row]));
  const ingredientByAlias = new Map();
  for (const row of ingredients) {
    ingredientByAlias.set(normalizeName(row.ingredient_slug), row);
    ingredientByAlias.set(normalizeName(row.canonical_name), row);
  }
  for (const row of aliases) {
    const ingredient = ingredientBySlug.get(String(row.ingredient_slug || "").toLowerCase()) || ingredientById.get(String(row.ingredient_id || ""));
    if (ingredient) {
      ingredientByAlias.set(normalizeName(row.alias_name), ingredient);
    }
  }
  const slugSet = new Set(ingredientBySlug.keys());
  const aliasSet = new Set([
    ...ingredients.flatMap((row) => [row.ingredient_slug, row.canonical_name].map(normalizeName)),
    ...aliases.map((row) => normalizeName(row.alias_name))
  ].filter(Boolean));
  return { slugSet, aliasSet, ingredientBySlug, ingredientByAlias };
}

async function fetchIngredientIds(slugs) {
  if (slugs.length === 0) return new Map();
  const rows = await query(`
    select ingredient_id, ingredient_slug
    from ingredients
    where ingredient_slug in (${slugs.map(sqlString).join(",")});
  `);
  return new Map(rows.map((row) => [String(row.ingredient_slug), String(row.ingredient_id)]));
}

async function upsertIngredients(rows) {
  for (const chunk of chunks(rows, 400)) {
    if (chunk.length === 0) continue;
    await query(`
      insert into ingredients (ingredient_slug, canonical_name, category, canonical_unit)
      values ${chunk.map((row) => `(${sqlString(row.ingredient_slug)}, ${sqlString(row.canonical_name)}, ${sqlString(row.category)}, ${sqlString(row.canonical_unit)})`).join(",\n")}
      on conflict (ingredient_slug) do update set
        canonical_name = excluded.canonical_name,
        category = excluded.category,
        canonical_unit = excluded.canonical_unit;
    `);
  }
}

async function upsertAliases(rows, ingredientIdsBySlug) {
  for (const chunk of chunks(rows, 500)) {
    if (chunk.length === 0) continue;
    await query(`
      insert into ingredient_aliases (
        alias_name, ingredient_slug, ingredient_id, canonical_name, language, category, confidence_score, verified, updated_at
      )
      values ${chunk.map((row) => `(
        ${sqlString(row.alias_name)},
        ${sqlString(row.ingredient_slug)},
        ${ingredientIdsBySlug.get(row.ingredient_slug) ? `${sqlString(ingredientIdsBySlug.get(row.ingredient_slug))}::uuid` : "null"},
        ${sqlString(row.canonical_name)},
        ${sqlString(row.language)},
        ${sqlString(row.category)},
        ${sqlNumber(row.confidence_score, 0.85)},
        ${sqlBoolean(row.verified)},
        now()
      )`).join(",\n")}
      on conflict (alias_name) do update set
        ingredient_slug = excluded.ingredient_slug,
        ingredient_id = excluded.ingredient_id,
        canonical_name = excluded.canonical_name,
        language = excluded.language,
        category = excluded.category,
        confidence_score = greatest(ingredient_aliases.confidence_score, excluded.confidence_score),
        verified = ingredient_aliases.verified or excluded.verified,
        updated_at = now();
    `);
  }
}

async function upsertReferences(rows, ingredientIdsBySlug) {
  for (const chunk of chunks(rows, 500)) {
    if (chunk.length === 0) continue;
    await query(`
      insert into ingredient_source_references (
        ingredient_id, ingredient_slug, source_name, source_id, source_url, quality_score, notes, updated_at
      )
      values ${chunk.map((row) => `(
        ${ingredientIdsBySlug.get(row.ingredient_slug) ? `${sqlString(ingredientIdsBySlug.get(row.ingredient_slug))}::uuid` : "null"},
        ${sqlString(row.ingredient_slug)},
        ${sqlString(row.source_name)},
        ${sqlString(row.source_id)},
        ${sqlString(row.source_url)},
        ${sqlNumber(row.quality_score, 0)},
        ${sqlString(row.notes)},
        now()
      )`).join(",\n")}
      on conflict (ingredient_slug, source_name, source_id) do update set
        ingredient_id = excluded.ingredient_id,
        source_url = excluded.source_url,
        quality_score = excluded.quality_score,
        notes = excluded.notes,
        updated_at = now();
    `);
  }
}

function parseArgs(argv) {
  const parsed = {
    environment: "",
    dryRun: false,
    allowProdWrite: false,
    reportPath: "",
    usdaFoodPath: "",
    usdaCategoryPath: "",
    openFoodFactsPath: "",
    wikidataPath: ""
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--env") parsed.environment = String(argv[++index] || "").trim().toLowerCase();
    else if (value.startsWith("--env=")) parsed.environment = value.slice("--env=".length).trim().toLowerCase();
    else if (value === "--dry-run") parsed.dryRun = true;
    else if (value === "--allow-prod-write") parsed.allowProdWrite = true;
    else if (value === "--report") parsed.reportPath = String(argv[++index] || "");
    else if (value === "--usda-food") parsed.usdaFoodPath = String(argv[++index] || "");
    else if (value === "--usda-category") parsed.usdaCategoryPath = String(argv[++index] || "");
    else if (value === "--openfoodfacts") parsed.openFoodFactsPath = String(argv[++index] || "");
    else if (value === "--wikidata") parsed.wikidataPath = String(argv[++index] || "");
  }
  return parsed;
}

function assertTargetEnvironment(environment) {
  const target = environmentTargets[environment];
  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!databaseUrl) throw new Error("SUPABASE_DATABASE_URL is required.");
  const host = new URL(databaseUrl).host;
  if (!host.startsWith(`db.${target.projectRef}.`)) {
    throw new Error(`Refusing to write ${target.label}. SUPABASE_DATABASE_URL points to ${host}, expected db.${target.projectRef}.*.`);
  }
}

function loadEnv(environment) {
  const paths = [
    new URL("../.env", import.meta.url),
    environment ? new URL(`../.env.${environment}`, import.meta.url) : null,
    environment ? new URL(`../.env.${environment}.local`, import.meta.url) : null
  ].filter(Boolean);
  for (const envPath of paths) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      process.env[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [headers = [], ...body] = rows.filter((csvRow) => csvRow.some((value) => String(value || "").trim()));
  return body.map((values) => Object.fromEntries(headers.map((header, index) => [header.replace(/^\ufeff/, ""), values[index] || ""])));
}

function cleanDisplayName(value) {
  return String(value || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isAcceptableIngredientName(value) {
  const name = cleanDisplayName(value);
  if (!name || name.length < 2 || name.length > 64) return false;
  if (/^q\d+$/i.test(name)) return false;
  if (/^\d/.test(name)) return false;
  if (/[^a-zA-Z0-9\u3400-\u9fff '&/.-]/.test(name)) return false;
  return !rejectName(name.toLowerCase());
}

function titleIngredient(value) {
  const cleaned = cleanDisplayName(value).toLowerCase();
  if (containsCjk(cleaned)) return cleaned;
  return cleaned.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function cleanSlug(value) {
  return cleanDisplayName(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function normalizeName(value) {
  return cleanDisplayName(value).toLowerCase();
}

function singularize(value) {
  const text = cleanDisplayName(value);
  if (text.endsWith("ies")) return `${text.slice(0, -3)}y`;
  if (text.endsWith("es")) return text.slice(0, -2);
  if (text.endsWith("s") && !text.endsWith("ss")) return text.slice(0, -1);
  return text;
}

function pluralize(value) {
  const text = cleanDisplayName(value);
  if (text.endsWith("s")) return text;
  if (text.endsWith("y")) return `${text.slice(0, -1)}ies`;
  return `${text}s`;
}

function containsCjk(value) {
  return /[\u3400-\u9fff]/.test(value);
}

function chunks(rows, size) {
  const output = [];
  for (let index = 0; index < rows.length; index += size) output.push(rows.slice(index, index + size));
  return output;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}
