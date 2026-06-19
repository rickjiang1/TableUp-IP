import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { query, sqlBoolean, sqlNumber, sqlString } from "./postgres.js";

const environmentTargets = {
  dev: { projectRef: "tochbwhcyoqqdepghisc", label: "TableUp-DEV" },
  prod: { projectRef: "oapybkblltlyugmmtqjr", label: "TableUp" }
};

const nutritionFields = {
  calories_kcal: [
    { nutrientId: 1008, name: "Energy", units: ["KCAL"] },
    { nutrientId: 2047, name: "Energy (Atwater General Factors)", units: ["KCAL"] },
    { nutrientId: 2048, name: "Energy (Atwater Specific Factors)", units: ["KCAL"] }
  ],
  protein_g: [
    { nutrientId: 1003, name: "Protein", units: ["G"] }
  ],
  fat_g: [
    { nutrientId: 1004, name: "Total lipid (fat)", units: ["G"] },
    { name: "Total lipid (fat)", units: ["G"] }
  ],
  carbs_g: [
    { nutrientId: 1005, name: "Carbohydrate, by difference", units: ["G"] }
  ],
  fiber_g: [
    { nutrientId: 1079, name: "Fiber, total dietary", units: ["G"] },
    { name: "Fiber, total dietary", units: ["G"] }
  ],
  sugar_g: [
    { nutrientId: 2000, name: "Sugars, total including NLEA", units: ["G"] },
    { nutrientId: 1063, name: "Sugars, Total", units: ["G"] },
    { name: "Sugars, total", units: ["G"] }
  ],
  sodium_mg: [
    { nutrientId: 1093, name: "Sodium, Na", units: ["MG"] }
  ],
  calcium_mg: [
    { nutrientId: 1087, name: "Calcium, Ca", units: ["MG"] }
  ],
  iron_mg: [
    { nutrientId: 1089, name: "Iron, Fe", units: ["MG"] }
  ],
  potassium_mg: [
    { nutrientId: 1092, name: "Potassium, K", units: ["MG"] }
  ]
};

let localUsdaFoodsPromise = null;

const args = parseArgs(process.argv.slice(2));
loadEnv(args.environment);

if (!args.environment || !environmentTargets[args.environment]) {
  console.error("Usage: node backend/src/enrich-ingredient-nutrition.js --env dev [--dry-run] [--limit 50]");
  console.error("Use --env prod --allow-prod-write only for intentional production enrichment.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

await main();

async function main() {
  await query(readFileSync(new URL("../migrations/20260618_ingredient_nutrition_profiles.sql", import.meta.url), "utf8"));

  const ingredients = await fetchIngredients();
  const targets = ingredients.slice(args.offset, args.limit ? args.offset + args.limit : undefined);
  const report = {
    environment: args.environment,
    target: environmentTargets[args.environment].label,
    dryRun: args.dryRun,
    sources: {
      usda: !args.skipUsda,
      wikidata: !args.skipWikidata
    },
    totalIngredients: ingredients.length,
    processedIngredients: targets.length,
    offset: args.offset,
    limit: args.limit || null,
    usdaProfiles: 0,
    wikidataIds: 0,
    lowConfidenceUsda: [],
    missingUsda: [],
    missingWikidata: [],
    samples: []
  };
  const pendingExternalIds = [];
  const pendingNutritionProfiles = [];

  for (const [index, ingredient] of targets.entries()) {
    const aliases = ingredient.aliases.slice(0, 10);
    const result = {
      ingredient_id: ingredient.ingredient_id,
      ingredient_slug: ingredient.ingredient_slug,
      canonical_name: ingredient.canonical_name
    };

    if (!args.skipWikidata) {
      const wikidata = await findWikidataEntity(ingredient, aliases);
      if (wikidata) {
        result.wikidata = summarizeExternal(wikidata);
        report.wikidataIds += 1;
        pendingExternalIds.push(wikidata);
      } else {
        report.missingWikidata.push(sampleIngredient(ingredient));
      }
      await delay(args.wikidataDelayMs);
    }

    if (!args.skipUsda) {
      const usda = await findUsdaNutritionProfile(ingredient, aliases);
      if (usda) {
        result.usda = summarizeNutrition(usda);
        report.usdaProfiles += 1;
        if (usda.confidence_score < 0.82) report.lowConfidenceUsda.push(result.usda);
        pendingExternalIds.push(usda.externalId);
        pendingNutritionProfiles.push(usda);
      } else {
        report.missingUsda.push(sampleIngredient(ingredient));
      }
      await delay(args.usdaDelayMs);
    }

    if (report.samples.length < 25) report.samples.push(result);
    if ((index + 1) % 25 === 0) {
      console.error(`Processed ${index + 1}/${targets.length} ingredients...`);
    }
  }

  report.lowConfidenceUsda = report.lowConfidenceUsda.slice(0, 80);
  report.missingUsda = report.missingUsda.slice(0, 120);
  report.missingWikidata = report.missingWikidata.slice(0, 120);

  if (!args.dryRun) {
    await upsertExternalIds(pendingExternalIds);
    await upsertNutritionProfiles(pendingNutritionProfiles);
  }

  if (args.reportPath) writeFileSync(args.reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

async function fetchIngredients() {
  const rows = await query(`
    select
      ingredients.ingredient_id,
      ingredients.ingredient_slug,
      ingredients.canonical_name,
      ingredients.category,
      coalesce(
        json_agg(distinct ingredient_aliases.alias_name) filter (where ingredient_aliases.alias_name is not null),
        '[]'
      ) as aliases
    from ingredients
    left join ingredient_aliases
      on ingredient_aliases.ingredient_id = ingredients.ingredient_id
    group by ingredients.ingredient_id, ingredients.ingredient_slug, ingredients.canonical_name, ingredients.category
    order by ingredients.canonical_name asc;
  `);
  return rows.map((row) => ({
    ...row,
    aliases: parseJsonArray(row.aliases)
  }));
}

async function findWikidataEntity(ingredient, aliases) {
  const terms = searchTerms(ingredient, aliases, 2);
  let best = null;
  for (const term of terms) {
    const url = new URL("https://www.wikidata.org/w/api.php");
    url.searchParams.set("action", "wbsearchentities");
    url.searchParams.set("format", "json");
    url.searchParams.set("language", containsCjk(term) ? "zh" : "en");
    url.searchParams.set("uselang", "en");
    url.searchParams.set("type", "item");
    url.searchParams.set("limit", "5");
    url.searchParams.set("search", term);
    let data;
    try {
      data = await fetchJson(url);
    } catch (error) {
      console.warn(`Wikidata search skipped for "${term}": ${error.message}`);
      continue;
    }
    for (const item of data.search || []) {
      const score = scoreWikidataCandidate(ingredient, term, item);
      if (!best || score > best.confidence_score) {
        best = {
          ingredient_id: ingredient.ingredient_id,
          source_name: "Wikidata",
          external_id: item.id,
          external_url: `https://www.wikidata.org/wiki/${item.id}`,
          match_name: item.label || term,
          match_method: `wbsearchentities:${term}`,
          confidence_score: score,
          raw_payload: {
            id: item.id,
            label: item.label,
            description: item.description,
            aliases: item.aliases
          }
        };
      }
    }
  }
  if (!best || best.confidence_score < args.wikidataMinConfidence) return null;
  return best;
}

async function findUsdaNutritionProfile(ingredient, aliases) {
  const localFoods = await localUsdaFoods();
  if (localFoods.length > 0) {
    return findUsdaNutritionProfileFromLocalCsv(ingredient, aliases, localFoods);
  }
  return findUsdaNutritionProfileFromApi(ingredient, aliases);
}

function findUsdaNutritionProfileFromLocalCsv(ingredient, aliases, localFoods) {
  const terms = searchTerms(ingredient, aliases, 3, { asciiOnly: true, maxAliasTerms: 1 });
  let best = null;
  const candidates = candidateLocalUsdaFoods(terms, localFoods);
  for (const term of terms) {
    for (const food of candidates) {
      const score = scoreUsdaCandidate(ingredient, term, food);
      if (score < args.usdaMinConfidence) continue;
      if (!hasUsefulNutrition(food.nutrients)) continue;
      const preparationState = inferPreparationState(food.description || "");
      const profile = {
        ingredient_id: ingredient.ingredient_id,
        source_name: "USDA FoodData Central",
        source_food_id: String(food.fdcId),
        source_url: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${food.fdcId}/nutrients`,
        food_description: food.description || "",
        data_type: food.dataType || "",
        preparation_state: preparationState,
        serving_basis: "per_100g",
        confidence_score: score,
        match_method: `local_csv:${food.dataset}:${term}`,
        raw_payload: compactUsdaPayload(food),
        externalId: {
          ingredient_id: ingredient.ingredient_id,
          source_name: "USDA FoodData Central",
          external_id: String(food.fdcId),
          external_url: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${food.fdcId}/nutrients`,
          match_name: food.description || "",
          match_method: `local_csv:${food.dataset}:${term}`,
          confidence_score: score,
          raw_payload: compactUsdaPayload(food)
        },
        ...food.nutrients
      };
      if (!best || profile.confidence_score > best.confidence_score) best = profile;
    }
  }
  return best;
}

function candidateLocalUsdaFoods(terms, localFoods) {
  const index = localFoods.tokenIndex;
  if (!index) return localFoods;
  const candidates = new Set();
  for (const term of terms) {
    for (const token of tokens(term)) {
      const matches = index.get(token);
      if (!matches) continue;
      for (const food of matches) candidates.add(food);
    }
  }
  return candidates.size > 0 ? [...candidates] : localFoods;
}

async function findUsdaNutritionProfileFromApi(ingredient, aliases) {
  const terms = searchTerms(ingredient, aliases, 3, { asciiOnly: true, maxAliasTerms: 1 });
  let best = null;
  for (const term of terms) {
    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("api_key", args.usdaApiKey || process.env.USDA_FDC_API_KEY || "DEMO_KEY");
    url.searchParams.set("query", term);
    url.searchParams.set("pageSize", String(args.usdaPageSize));
    url.searchParams.set("dataType", "Foundation,SR Legacy");
    let data;
    try {
      data = await fetchJson(url);
    } catch (error) {
      console.warn(`USDA search skipped for "${term}": ${error.message}`);
      continue;
    }
    for (const food of data.foods || []) {
      const score = scoreUsdaCandidate(ingredient, term, food);
      const nutrients = extractNutrients(food.foodNutrients || []);
      if (!hasUsefulNutrition(nutrients)) continue;
      const preparationState = inferPreparationState(food.description || "");
      const profile = {
        ingredient_id: ingredient.ingredient_id,
        source_name: "USDA FoodData Central",
        source_food_id: String(food.fdcId),
        source_url: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${food.fdcId}/nutrients`,
        food_description: food.description || "",
        data_type: food.dataType || "",
        preparation_state: preparationState,
        serving_basis: "per_100g",
        confidence_score: score,
        match_method: `foods/search:${term}`,
        raw_payload: compactUsdaPayload(food),
        externalId: {
          ingredient_id: ingredient.ingredient_id,
          source_name: "USDA FoodData Central",
          external_id: String(food.fdcId),
          external_url: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${food.fdcId}/nutrients`,
          match_name: food.description || "",
          match_method: `foods/search:${term}`,
          confidence_score: score,
          raw_payload: compactUsdaPayload(food)
        },
        ...nutrients
      };
      if (!best || profile.confidence_score > best.confidence_score) best = profile;
    }
  }
  if (!best || best.confidence_score < args.usdaMinConfidence) return null;
  return best;
}

function scoreWikidataCandidate(ingredient, term, item) {
  const label = normalizeName(item.label || "");
  const description = normalizeName(item.description || "");
  const termKey = normalizeName(term);
  const canonicalKey = normalizeName(ingredient.canonical_name);
  let score = tokenSimilarity(canonicalKey, label) * 0.55 + tokenSimilarity(termKey, label) * 0.30;
  if (label === canonicalKey || label === termKey) score += 0.18;
  if (/(food|ingredient|vegetable|fruit|meat|beef|pork|chicken|fish|seafood|herb|spice|plant|edible|dish|cuisine|dairy|cheese|grain|cereal|legume|nut|seed|oil)/.test(description)) score += 0.12;
  if (/(surname|given name|film|album|song|company|place|village|human|fictional)/.test(description)) score -= 0.35;
  if (containsCjk(term) && containsCjk(item.label || "")) score += 0.08;
  return clamp(score, 0, 1);
}

function scoreUsdaCandidate(ingredient, term, food) {
  const description = normalizeName(food.description || "");
  const termKey = normalizeName(term);
  const canonicalKey = normalizeName(ingredient.canonical_name);
  let score = tokenSimilarity(canonicalKey, description) * 0.48 + tokenSimilarity(termKey, description) * 0.36;
  if (description.includes(canonicalKey) || description.includes(termKey)) score += 0.12;
  if (food.dataType === "Foundation") score += 0.08;
  if (food.dataType === "SR Legacy") score += 0.06;
  if (food.dataType === "Survey (FNDDS)") score += 0.02;
  if (food.priority) score += Number(food.priority) * 0.01;
  if (/\braw\b|uncooked|fresh/.test(description)) score += 0.05;
  if (/babyfood|formula|restaurant|fast food|branded|upc|prepared meal|school lunch/.test(description)) score -= 0.20;
  if (/without salt|with salt|canned|frozen|boiled|cooked|roasted|fried|drained/.test(description)) score -= 0.03;
  return clamp(score, 0, 1);
}

function extractNutrients(foodNutrients) {
  const output = {};
  for (const [field, candidates] of Object.entries(nutritionFields)) {
    const match = foodNutrients.find((nutrient) => nutrientMatches(nutrient, candidates));
    output[field] = match ? Number(match.value ?? match.amount) : null;
  }
  return output;
}

async function localUsdaFoods() {
  if (!localUsdaFoodsPromise) {
    localUsdaFoodsPromise = Promise.resolve(loadLocalUsdaFoods());
  }
  return await localUsdaFoodsPromise;
}

function loadLocalUsdaFoods() {
  const datasets = [
    { dataset: "foundation", root: args.usdaFoundationDir, priority: 2 },
    { dataset: "sr_legacy", root: args.usdaSrLegacyDir, priority: 1 }
  ].filter((item) => item.root && existsSync(item.root));

  const foods = [];
  for (const dataset of datasets) {
    const dir = findCsvDatasetDir(dataset.root);
    if (!dir) {
      console.warn(`USDA local dataset skipped; CSV files not found under ${dataset.root}`);
      continue;
    }
    foods.push(...loadLocalUsdaDataset({ ...dataset, dir }));
  }
  if (foods.length > 0) {
    const tokenIndex = new Map();
    for (const food of foods) {
      for (const token of new Set(tokens(food.description))) {
        if (!tokenIndex.has(token)) tokenIndex.set(token, []);
        tokenIndex.get(token).push(food);
      }
    }
    foods.tokenIndex = tokenIndex;
    console.error(`Loaded ${foods.length} USDA local food records from ${datasets.map((item) => item.dataset).join(", ")}.`);
  }
  return foods;
}

function findCsvDatasetDir(root) {
  const directFood = `${root}/food.csv`;
  if (existsSync(directFood) && existsSync(`${root}/food_nutrient.csv`)) return root;
  for (const name of readdirSync(root, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const candidate = `${root}/${name.name}`;
    if (existsSync(`${candidate}/food.csv`) && existsSync(`${candidate}/food_nutrient.csv`)) return candidate;
  }
  return "";
}

function loadLocalUsdaDataset({ dataset, dir, priority }) {
  const foodRows = parseCsv(readFileSync(`${dir}/food.csv`, "utf8"));
  const nutrientRows = parseCsv(readFileSync(`${dir}/food_nutrient.csv`, "utf8"));
  const nutrientMap = new Map();
  for (const row of nutrientRows) {
    const nutrientId = Number(row.nutrient_id);
    if (!isTrackedNutrientId(nutrientId)) continue;
    const fdcId = String(row.fdc_id || "");
    if (!fdcId) continue;
    const current = nutrientMap.get(fdcId) || {};
    for (const [field, candidates] of Object.entries(nutritionFields)) {
      if (candidates.some((candidate) => candidate.nutrientId === nutrientId)) {
        const value = Number(row.amount);
        if (Number.isFinite(value) && current[field] == null) current[field] = value;
      }
    }
    nutrientMap.set(fdcId, current);
  }

  return foodRows
    .map((food) => {
      const fdcId = String(food.fdc_id || "");
      const nutrients = nutrientMap.get(fdcId) || {};
      if (!hasUsefulNutrition(nutrients)) return null;
      const dataType = dataset === "foundation" ? "Foundation" : "SR Legacy";
      return {
        fdcId,
        description: food.description || "",
        dataType,
        foodCategory: food.food_category_id || "",
        publishedDate: food.publication_date || "",
        dataset,
        priority,
        nutrients
      };
    })
    .filter(Boolean);
}

function isTrackedNutrientId(nutrientId) {
  return Object.values(nutritionFields)
    .flat()
    .some((candidate) => candidate.nutrientId === nutrientId);
}

function nutrientMatches(nutrient, candidates) {
  const id = Number(nutrient.nutrientId ?? nutrient.nutrientNumber);
  const name = String(nutrient.nutrientName || nutrient.name || "").toLowerCase();
  const unit = String(nutrient.unitName || nutrient.unit || "").toUpperCase();
  return candidates.some((candidate) => {
    if (candidate.nutrientId && id === candidate.nutrientId) return true;
    if (candidate.name && name.includes(candidate.name.toLowerCase())) {
      return !candidate.units || candidate.units.includes(unit);
    }
    return false;
  });
}

function hasUsefulNutrition(nutrients) {
  return Number.isFinite(Number(nutrients.calories_kcal))
    && (Number.isFinite(Number(nutrients.protein_g))
      || Number.isFinite(Number(nutrients.fat_g))
      || Number.isFinite(Number(nutrients.carbs_g)));
}

async function upsertExternalIds(rows) {
  for (const chunk of chunks(rows, 250)) {
    if (chunk.length === 0) continue;
    await query(`
    insert into ingredient_external_ids (
      ingredient_id, source_name, external_id, external_url, match_name, match_method,
      confidence_score, raw_payload, updated_at
    )
    values ${chunk.map((row) => `(
      ${sqlString(row.ingredient_id)}::uuid,
      ${sqlString(row.source_name)},
      ${sqlString(row.external_id)},
      ${sqlString(row.external_url)},
      ${sqlString(row.match_name)},
      ${sqlString(row.match_method)},
      ${sqlNumber(row.confidence_score, 0)},
      ${sqlJson(row.raw_payload)},
      now()
    )`).join(",\n")}
    on conflict (ingredient_id, source_name, external_id) do update set
      external_url = excluded.external_url,
      match_name = excluded.match_name,
      match_method = excluded.match_method,
      confidence_score = greatest(ingredient_external_ids.confidence_score, excluded.confidence_score),
      raw_payload = excluded.raw_payload,
      updated_at = now();
  `);
  }
}

async function upsertNutritionProfiles(rows) {
  for (const chunk of chunks(rows, 150)) {
    if (chunk.length === 0) continue;
    await query(`
    insert into ingredient_nutrition_profiles (
      ingredient_id, source_name, source_food_id, source_url, food_description,
      data_type, preparation_state, serving_basis, calories_kcal, protein_g, fat_g,
      carbs_g, fiber_g, sugar_g, sodium_mg, calcium_mg, iron_mg, potassium_mg,
      confidence_score, match_method, raw_payload, active, updated_at
    )
    values ${chunk.map((row) => `(
      ${sqlString(row.ingredient_id)}::uuid,
      ${sqlString(row.source_name)},
      ${sqlString(row.source_food_id)},
      ${sqlString(row.source_url)},
      ${sqlString(row.food_description)},
      ${sqlString(row.data_type)},
      ${sqlString(row.preparation_state)},
      ${sqlString(row.serving_basis)},
      ${sqlNullableNumber(row.calories_kcal)},
      ${sqlNullableNumber(row.protein_g)},
      ${sqlNullableNumber(row.fat_g)},
      ${sqlNullableNumber(row.carbs_g)},
      ${sqlNullableNumber(row.fiber_g)},
      ${sqlNullableNumber(row.sugar_g)},
      ${sqlNullableNumber(row.sodium_mg)},
      ${sqlNullableNumber(row.calcium_mg)},
      ${sqlNullableNumber(row.iron_mg)},
      ${sqlNullableNumber(row.potassium_mg)},
      ${sqlNumber(row.confidence_score, 0)},
      ${sqlString(row.match_method)},
      ${sqlJson(row.raw_payload)},
      true,
      now()
    )`).join(",\n")}
    on conflict (ingredient_id, source_name, source_food_id, preparation_state, serving_basis) do update set
      source_url = excluded.source_url,
      food_description = excluded.food_description,
      data_type = excluded.data_type,
      calories_kcal = excluded.calories_kcal,
      protein_g = excluded.protein_g,
      fat_g = excluded.fat_g,
      carbs_g = excluded.carbs_g,
      fiber_g = excluded.fiber_g,
      sugar_g = excluded.sugar_g,
      sodium_mg = excluded.sodium_mg,
      calcium_mg = excluded.calcium_mg,
      iron_mg = excluded.iron_mg,
      potassium_mg = excluded.potassium_mg,
      confidence_score = excluded.confidence_score,
      match_method = excluded.match_method,
      raw_payload = excluded.raw_payload,
      active = true,
      updated_at = now();
  `);
  }
}

function searchTerms(ingredient, aliases, maxTerms, options = {}) {
  const aliasTerms = aliases
    .filter((alias) => !options.asciiOnly || /^[\x00-\x7F]+$/.test(alias))
    .slice(0, options.maxAliasTerms ?? aliases.length);
  const terms = [
    ingredient.canonical_name,
    ingredient.ingredient_slug?.replaceAll("_", " "),
    ...aliasTerms
  ].map(cleanSearchTerm).filter(Boolean);
  const unique = [];
  const seen = new Set();
  for (const term of terms) {
    const key = normalizeName(term);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(term);
    if (unique.length >= maxTerms) break;
  }
  return unique;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "user-agent": "TableUp ingredient nutrition enrichment/0.1 (local development)"
    }
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} from ${url.hostname}: ${body.slice(0, 220)}`);
  }
  return await response.json();
}

function compactUsdaPayload(food) {
  return {
    fdcId: food.fdcId,
    description: food.description,
    dataType: food.dataType,
    foodCategory: food.foodCategory,
    publishedDate: food.publishedDate
  };
}

function summarizeExternal(row) {
  return {
    source_name: row.source_name,
    external_id: row.external_id,
    match_name: row.match_name,
    confidence_score: Number(row.confidence_score.toFixed(3))
  };
}

function summarizeNutrition(row) {
  return {
    ingredient_id: row.ingredient_id,
    source_food_id: row.source_food_id,
    food_description: row.food_description,
    data_type: row.data_type,
    preparation_state: row.preparation_state,
    calories_kcal: row.calories_kcal,
    protein_g: row.protein_g,
    fat_g: row.fat_g,
    carbs_g: row.carbs_g,
    confidence_score: Number(row.confidence_score.toFixed(3))
  };
}

function sampleIngredient(ingredient) {
  return {
    ingredient_id: ingredient.ingredient_id,
    ingredient_slug: ingredient.ingredient_slug,
    canonical_name: ingredient.canonical_name
  };
}

function inferPreparationState(description) {
  const text = normalizeName(description);
  if (/\braw\b|uncooked|fresh/.test(text)) return "raw";
  if (/boiled|cooked|roasted|fried|baked|grilled|steamed|braised|sauteed|sautéed/.test(text)) return "cooked";
  if (/dried|dehydrated/.test(text)) return "dried";
  if (/frozen/.test(text)) return "frozen";
  if (/canned/.test(text)) return "canned";
  return "unknown";
}

function parseArgs(argv) {
  const parsed = {
    environment: "",
    allowProdWrite: false,
    dryRun: false,
    skipUsda: false,
    skipWikidata: false,
    limit: 0,
    offset: 0,
    reportPath: "",
    usdaApiKey: "",
    usdaFoundationDir: "/private/tmp/tableup-fdc/foundation",
    usdaSrLegacyDir: "/private/tmp/tableup-fdc/sr_legacy",
    usdaPageSize: 8,
    usdaDelayMs: 120,
    wikidataDelayMs: 1200,
    usdaMinConfidence: 0.88,
    wikidataMinConfidence: 0.62
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--env") parsed.environment = String(argv[++index] || "").trim().toLowerCase();
    else if (value.startsWith("--env=")) parsed.environment = value.slice("--env=".length).trim().toLowerCase();
    else if (value === "--allow-prod-write") parsed.allowProdWrite = true;
    else if (value === "--dry-run") parsed.dryRun = true;
    else if (value === "--skip-usda") parsed.skipUsda = true;
    else if (value === "--skip-wikidata") parsed.skipWikidata = true;
    else if (value === "--limit") parsed.limit = Number(argv[++index] || 0);
    else if (value === "--offset") parsed.offset = Number(argv[++index] || 0);
    else if (value === "--report") parsed.reportPath = String(argv[++index] || "");
    else if (value === "--usda-api-key") parsed.usdaApiKey = String(argv[++index] || "");
    else if (value === "--usda-foundation-dir") parsed.usdaFoundationDir = String(argv[++index] || "");
    else if (value === "--usda-sr-legacy-dir") parsed.usdaSrLegacyDir = String(argv[++index] || "");
    else if (value === "--usda-page-size") parsed.usdaPageSize = Number(argv[++index] || 8);
    else if (value === "--usda-delay-ms") parsed.usdaDelayMs = Number(argv[++index] || 120);
    else if (value === "--wikidata-delay-ms") parsed.wikidataDelayMs = Number(argv[++index] || 80);
    else if (value === "--usda-min-confidence") parsed.usdaMinConfidence = Number(argv[++index] || 0.88);
    else if (value === "--wikidata-min-confidence") parsed.wikidataMinConfidence = Number(argv[++index] || 0.62);
  }
  return parsed;
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
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (key) process.env[key] = value;
    }
  }
}

function assertTargetEnvironment(environment) {
  const target = environmentTargets[environment];
  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!databaseUrl) throw new Error("SUPABASE_DATABASE_URL is required.");
  let host = "";
  try {
    host = new URL(databaseUrl).host;
  } catch {
    throw new Error("SUPABASE_DATABASE_URL must be a valid URL.");
  }
  if (!host.startsWith(`db.${target.projectRef}.`)) {
    throw new Error(`Refusing to write ${target.label}. SUPABASE_DATABASE_URL points to ${host}, expected db.${target.projectRef}.*.`);
  }
}

function tokenSimilarity(left, right) {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return 0;
  const rightSet = new Set(rightTokens);
  const overlap = leftTokens.filter((token) => rightSet.has(token)).length;
  const containment = overlap / leftTokens.length;
  const jaccard = overlap / new Set([...leftTokens, ...rightTokens]).size;
  return containment * 0.7 + jaccard * 0.3;
}

function tokens(value) {
  return normalizeName(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .map(singularToken)
    .filter((token) => token && !["fresh", "raw", "whole", "food", "ingredient", "chinese", "american"].includes(token));
}

function singularToken(token) {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[()[\],;:]/g, " ")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSearchTerm(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\([^)]*\)/g, " ")
    .replace(/["']/g, "")
    .replace(/\b(genuine|unopened|opened|glass|plastic|from france|from usa|fresh)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsCjk(value) {
  return /[\u3400-\u9fff]/.test(String(value || ""));
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
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
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((item) => item.some((value) => value !== ""));
  return body.map((values) => Object.fromEntries(header.map((name, index) => [name, values[index] ?? ""])));
}

function sqlNullableNumber(value) {
  return Number.isFinite(Number(value)) ? String(Number(value)) : "null";
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value || {}))}::jsonb`;
}

function chunks(values, size) {
  const output = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
