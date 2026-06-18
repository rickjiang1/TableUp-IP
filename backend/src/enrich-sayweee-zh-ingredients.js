import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { query, sqlBoolean, sqlNumber, sqlString } from "./postgres.js";
import { canonicalUnitForIngredient } from "./ingredientUnitConversion.js";

const environmentTargets = {
  dev: { projectRef: "tochbwhcyoqqdepghisc", label: "TableUp-DEV" },
  prod: { projectRef: "oapybkblltlyugmmtqjr", label: "TableUp" }
};

const args = parseArgs(process.argv.slice(2));
loadEnv(args.environment);

if (!args.environment || !environmentTargets[args.environment]) {
  console.error("Usage: node src/enrich-sayweee-zh-ingredients.js --env dev [--dry-run]");
  console.error("Use --env prod --allow-prod-write only for an intentional production enrichment.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

await main();

async function main() {
  const seedPath = args.seedPath || new URL("../data/sayweee_zh_ingredient_enrichment.tsv", import.meta.url);
  if (!existsSync(seedPath)) {
    throw new Error(`Missing SayWeee enrichment seed: ${seedPath}`);
  }

  await bootstrapSourceReferenceTable();
  const existing = await fetchExistingIngredientIndex();
  const seedRows = parseTsv(readFileSync(seedPath, "utf8"));
  const merged = mergeSeedRows(seedRows);

  const planned = merged.map((row) => {
    const slug = cleanSlug(row.ingredient_slug || row.canonical_name);
    const aliases = splitList(row.aliases);
    const existingMatch = findExistingIngredientMatch(existing, slug, [row.canonical_name, ...aliases]);
    const targetSlug = existingMatch?.ingredient_slug || slug;
    const canonicalName = existingMatch?.canonical_name || titleIngredient(row.canonical_name);
    const category = normalizeCategory(existingMatch?.category || row.category);
    return {
      ...row,
      ingredient_slug: targetSlug,
      original_slug: slug,
      canonical_name: canonicalName,
      category,
      aliases: unique([canonicalName, targetSlug.replace(/_/g, " "), row.canonical_name, ...aliases]),
      isNewIngredient: !existingMatch && !existing.slugSet.has(targetSlug)
    };
  }).filter((row) => row.ingredient_slug && row.canonical_name);

  const ingredients = planned.filter((row) => row.isNewIngredient).map((row) => ({
    ingredient_slug: row.ingredient_slug,
    canonical_name: row.canonical_name,
    category: row.category,
    canonical_unit: canonicalUnitForIngredient(row)
  }));
  const aliases = buildAliasRows(planned, existing.aliasSet);
  const references = planned.map((row) => ({
    ingredient_slug: row.ingredient_slug,
    source_name: "SayWeee Chinese marketplace",
    source_id: row.original_slug,
    source_url: row.source_url || "https://www.sayweee.com/zh",
    quality_score: row.isNewIngredient ? 0.82 : 0.88,
    notes: [row.evidence_terms, row.notes].filter(Boolean).join(" | ")
  }));

  if (!args.dryRun) {
    await upsertIngredients(ingredients);
    const refreshed = await fetchIngredientIds([...new Set(planned.map((row) => row.ingredient_slug))]);
    await upsertAliases(aliases, refreshed);
    await upsertReferences(references, refreshed);
  }

  const report = {
    environment: args.environment,
    target: environmentTargets[args.environment].label,
    dryRun: args.dryRun,
    seedRows: seedRows.length,
    mergedIngredients: planned.length,
    newIngredients: ingredients.length,
    aliases: aliases.length,
    sourceReferences: references.length,
    byCategory: countBy(planned, (row) => row.category),
    hotPotRows: planned.filter((row) => /hot pot|火锅|涮|丸|滑|毛肚|黄喉|鸭血|肥牛|羊肉卷/i.test(`${row.notes} ${row.aliases.join(" ")}`)).length,
    samples: planned.slice(0, 30).map((row) => ({
      ingredient_slug: row.ingredient_slug,
      canonical_name: row.canonical_name,
      category: row.category,
      isNewIngredient: row.isNewIngredient,
      aliases: row.aliases.slice(0, 6)
    }))
  };

  if (args.reportPath) {
    writeFileSync(args.reportPath, JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report, null, 2));
}

function mergeSeedRows(rows) {
  const bySlug = new Map();
  for (const row of rows) {
    const slug = cleanSlug(row.ingredient_slug || row.canonical_name);
    if (!slug || !isLikelyIngredient(row)) continue;
    const current = bySlug.get(slug);
    if (!current) {
      bySlug.set(slug, { ...row, ingredient_slug: slug });
      continue;
    }
    current.aliases = unique([...splitList(current.aliases), ...splitList(row.aliases)]).join(";");
    current.evidence_terms = unique([...splitList(current.evidence_terms), ...splitList(row.evidence_terms)]).join(";");
    current.notes = unique([current.notes, row.notes].filter(Boolean)).join(" | ");
  }
  return [...bySlug.values()];
}

function isLikelyIngredient(row) {
  const text = `${row.ingredient_slug} ${row.canonical_name} ${row.aliases} ${row.notes}`.toLowerCase();
  if (/\bbrand|mooncake|snack|restaurant|medicine|soap|skincare|mask|drink|beverage|ready meal\b/.test(text)) return false;
  if (/月饼|药|软膏|肥皂|护肤|面膜|零食|饮料|预制菜/.test(text)) return false;
  return true;
}

function buildAliasRows(rows, existingAliasSet) {
  const output = new Map();
  for (const row of rows) {
    for (const alias of row.aliases) {
      const clean = cleanDisplayName(alias);
      if (!clean || clean.length > 96) continue;
      const key = normalizeName(clean);
      if (existingAliasSet.has(key)) continue;
      const score = clean === row.canonical_name || clean === row.ingredient_slug ? 1 : containsCjk(clean) ? 0.94 : 0.88;
      const current = output.get(key);
      if (!current || current.confidence_score < score) {
        output.set(key, {
          alias_name: clean,
          ingredient_slug: row.ingredient_slug,
          canonical_name: row.canonical_name,
          language: containsCjk(clean) ? "zh" : "en",
          category: row.category,
          confidence_score: score,
          verified: true
        });
      }
    }
  }
  return [...output.values()].sort((left, right) => left.ingredient_slug.localeCompare(right.ingredient_slug) || left.alias_name.localeCompare(right.alias_name));
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
    if (ingredient) ingredientByAlias.set(normalizeName(row.alias_name), ingredient);
  }
  const slugSet = new Set(ingredientBySlug.keys());
  const aliasSet = new Set([
    ...ingredients.flatMap((row) => [row.ingredient_slug, row.canonical_name].map(normalizeName)),
    ...aliases.map((row) => normalizeName(row.alias_name))
  ].filter(Boolean));
  return { slugSet, aliasSet, ingredientBySlug, ingredientByAlias };
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
  for (const chunk of chunks(rows, 300)) {
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
        ${sqlNumber(row.confidence_score, 0.9)},
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
  const parsed = { environment: "", dryRun: false, allowProdWrite: false, seedPath: "", reportPath: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--env") parsed.environment = String(argv[++index] || "").trim().toLowerCase();
    else if (value.startsWith("--env=")) parsed.environment = value.slice("--env=".length).trim().toLowerCase();
    else if (value === "--dry-run") parsed.dryRun = true;
    else if (value === "--allow-prod-write") parsed.allowProdWrite = true;
    else if (value === "--seed") parsed.seedPath = String(argv[++index] || "");
    else if (value === "--report") parsed.reportPath = String(argv[++index] || "");
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

function parseTsv(text) {
  const [headerLine = "", ...lines] = text.split(/\r?\n/).filter((line) => line.trim());
  const headers = headerLine.split("\t");
  return lines.map((line) => Object.fromEntries(headers.map((header, index) => [header, line.split("\t")[index] || ""])));
}

function splitList(value) {
  return String(value || "").split(/[;；]/g).map((item) => cleanDisplayName(item)).filter(Boolean);
}

function cleanDisplayName(value) {
  return String(value || "").replace(/\([^)]*\)/g, " ").replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
}

function cleanSlug(value) {
  return cleanDisplayName(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_");
}

function normalizeName(value) {
  return cleanDisplayName(value).toLowerCase();
}

function titleIngredient(value) {
  const clean = cleanDisplayName(value).toLowerCase();
  return containsCjk(clean) ? clean : clean.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function normalizeCategory(category) {
  const value = String(category || "other").trim().toLowerCase();
  if (value === "meat") return "protein";
  return value || "other";
}

function containsCjk(value) {
  return /[\u3400-\u9fff]/.test(String(value || ""));
}

function unique(values) {
  return [...new Map(values.map((value) => [normalizeName(value), value])).values()].filter(Boolean);
}

function countBy(rows, getKey) {
  return rows.reduce((counts, row) => {
    const key = getKey(row) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function chunks(rows, size) {
  const output = [];
  for (let index = 0; index < rows.length; index += size) output.push(rows.slice(index, index + size));
  return output;
}
