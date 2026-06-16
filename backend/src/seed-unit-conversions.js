import { existsSync, readFileSync } from "node:fs";
import { buildConversionSeedRows, canonicalUnitForIngredient, unitAliasRows } from "./ingredientUnitConversion.js";
import { query, sqlBoolean, sqlNumber, sqlString } from "./postgres.js";

const environmentTargets = {
  dev: {
    projectRef: "tochbwhcyoqqdepghisc",
    label: "TableUp-DEV"
  },
  prod: {
    projectRef: "oapybkblltlyugmmtqjr",
    label: "TableUp"
  }
};

const args = parseArgs(process.argv.slice(2));
loadEnv(args.environment);

if (!args.environment || !environmentTargets[args.environment]) {
  console.error("Usage: node backend/src/seed-unit-conversions.js --env dev");
  console.error("Use --env prod --allow-prod-write only for an intentional production seed.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

await bootstrapUnitConversionSchema();
const ingredients = await fetchIngredients();
await seedCanonicalUnits(ingredients);
await seedUnitAliases();
const ingredientSlugById = new Map(ingredients.map((ingredient) => [
  String(ingredient.ingredient_id),
  String(ingredient.ingredient_slug || ingredient.ingredient_id)
]));
const conversions = buildConversionSeedRows(ingredients).map((row) => ({
  ...row,
  ingredient_slug: row.ingredient_slug || ingredientSlugById.get(String(row.ingredient_id)) || row.ingredient_id
}));
await seedConversions(conversions);

console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  ingredients: ingredients.length,
  unitAliases: unitAliasRows.length,
  conversions: conversions.length
}, null, 2));

function parseArgs(argv) {
  const parsed = {
    environment: "",
    allowProdWrite: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--env") {
      parsed.environment = String(argv[index + 1] || "").trim().toLowerCase();
      index += 1;
      continue;
    }
    if (value.startsWith("--env=")) {
      parsed.environment = value.slice("--env=".length).trim().toLowerCase();
      continue;
    }
    if (value === "--allow-prod-write") {
      parsed.allowProdWrite = true;
    }
  }

  return parsed;
}

function assertTargetEnvironment(environment) {
  const target = environmentTargets[environment];
  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "";
  if (!databaseUrl) {
    throw new Error("SUPABASE_DATABASE_URL is required.");
  }
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

async function bootstrapUnitConversionSchema() {
  await query(`
    create extension if not exists pgcrypto;

    alter table ingredients
      add column if not exists canonical_unit text not null default 'gram';

    create table if not exists unit_aliases (
      alias text primary key,
      unit text not null,
      language text not null default 'unknown',
      notes text not null default '',
      created_at timestamptz not null default now()
    );

    create table if not exists ingredient_unit_conversion (
      id uuid primary key default gen_random_uuid(),
      ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
      ingredient_slug text,
      from_unit text not null,
      to_unit text not null,
      ratio numeric not null,
      conversion_type text not null default 'average',
      is_default boolean not null default true,
      notes text,
      created_at timestamptz not null default now()
    );

    create unique index if not exists ingredient_unit_conversion_unique_rule_idx
      on ingredient_unit_conversion (ingredient_id, from_unit, to_unit);

    alter table ingredient_unit_conversion
      add column if not exists ingredient_slug text;

    create index if not exists ingredient_unit_conversion_ingredient_idx
      on ingredient_unit_conversion (ingredient_id);

    grant select, insert, update, delete on unit_aliases to anon;
    grant select, insert, update, delete on ingredient_unit_conversion to anon;
  `);
}

async function fetchIngredients() {
  const rows = await query(`
    select ingredient_id, ingredient_slug, canonical_name, category, canonical_unit
    from ingredients
    order by canonical_name asc, ingredient_id asc;
  `);
  return rows.map((row) => ({
    ingredient_id: row.ingredient_id,
    ingredient_slug: row.ingredient_slug,
    canonical_name: row.canonical_name,
    category: row.category,
    canonical_unit: row.canonical_unit
  }));
}

async function seedCanonicalUnits(ingredients) {
  const rows = ingredients.map((ingredient) => ({
    ingredient_id: ingredient.ingredient_id,
    canonical_unit: canonicalUnitForIngredient(ingredient)
  }));

  for (let index = 0; index < rows.length; index += 400) {
    const chunk = rows.slice(index, index + 400);
    await query(`
      update ingredients
      set canonical_unit = seed.canonical_unit
      from (
        values ${chunk.map((row) => `(${sqlString(row.ingredient_id)}, ${sqlString(row.canonical_unit)})`).join(",\n")}
      ) as seed(ingredient_id, canonical_unit)
      where ingredients.ingredient_id::text = seed.ingredient_id;
    `);
  }
}

async function seedUnitAliases() {
  const aliases = uniqueRows(unitAliasRows, "alias");
  await query(`
    insert into unit_aliases (alias, unit, language, notes)
    values ${aliases.map((row) => `(${sqlString(row.alias)}, ${sqlString(row.unit)}, ${sqlString(row.language)}, ${sqlString(row.notes)})`).join(",\n")}
    on conflict (alias) do update set
      unit = excluded.unit,
      language = excluded.language,
      notes = excluded.notes;
  `);
}

async function seedConversions(conversions) {
  for (let index = 0; index < conversions.length; index += 400) {
    const chunk = conversions.slice(index, index + 400);
    await query(`
      insert into ingredient_unit_conversion (
        ingredient_id, ingredient_slug, from_unit, to_unit, ratio, conversion_type, is_default, notes
      )
      values ${chunk.map((row) => `(
        ${sqlString(row.ingredient_id)},
        ${sqlString(row.ingredient_slug)},
        ${sqlString(row.from_unit)},
        ${sqlString(row.to_unit)},
        ${sqlNumber(row.ratio, 1)},
        ${sqlString(row.conversion_type)},
        ${sqlBoolean(row.is_default)},
        ${sqlString(row.notes)}
      )`).join(",\n")}
      on conflict (ingredient_id, from_unit, to_unit) do update set
        ingredient_slug = excluded.ingredient_slug,
        ratio = excluded.ratio,
        conversion_type = excluded.conversion_type,
        is_default = excluded.is_default,
        notes = excluded.notes;
    `);
  }
}

function uniqueRows(rows, key) {
  return [...new Map(rows.map((row) => [String(row[key]).toLowerCase(), row])).values()];
}

function loadEnv(environment) {
  const paths = [
    new URL("../.env", import.meta.url),
    environment ? new URL(`../.env.${environment}`, import.meta.url) : null,
    environment ? new URL(`../.env.${environment}.local`, import.meta.url) : null
  ].filter(Boolean);

  for (const envPath of paths) {
    if (!existsSync(envPath)) {
      continue;
    }
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (key) {
        process.env[key] = value;
      }
    }
  }
}
