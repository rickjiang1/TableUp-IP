import { existsSync, readFileSync } from "node:fs";
import { query } from "./postgres.js";

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
  console.error("Usage: node backend/src/audit-unit-conversions.js --env dev");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

const summary = await fetchSummary();
const missingCanonicalUnit = await fetchMissingCanonicalUnit();
const ingredientsWithoutConversions = await fetchIngredientsWithoutConversions();
const missingIdentityConversions = await fetchMissingIdentityConversions();
const conversionCoverageByUnit = await fetchConversionCoverageByUnit();

console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  summary,
  conversionCoverageByUnit,
  samples: {
    missingCanonicalUnit,
    ingredientsWithoutConversions,
    missingIdentityConversions
  }
}, null, 2));

function parseArgs(argv) {
  const parsed = {
    environment: ""
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
    }
  }

  return parsed;
}

async function fetchSummary() {
  const [row] = await query(`
    select
      count(*)::int as ingredients,
      count(*) filter (where nullif(trim(coalesce(canonical_unit, '')), '') is null)::int as missing_canonical_unit,
      count(*) filter (
        where not exists (
          select 1
          from ingredient_unit_conversion conversions
          where conversions.ingredient_id = ingredients.ingredient_id
        )
      )::int as ingredients_without_conversions,
      count(*) filter (
        where nullif(trim(coalesce(canonical_unit, '')), '') is not null
          and not exists (
            select 1
            from ingredient_unit_conversion conversions
            where conversions.ingredient_id = ingredients.ingredient_id
              and conversions.from_unit = ingredients.canonical_unit
              and conversions.to_unit = ingredients.canonical_unit
              and conversions.ratio = 1
          )
      )::int as missing_identity_conversions
    from ingredients;
  `);
  return numberize(row);
}

async function fetchConversionCoverageByUnit() {
  const rows = await query(`
    select
      coalesce(nullif(trim(ingredients.canonical_unit), ''), '<missing>') as canonical_unit,
      count(*)::int as ingredient_count,
      count(*) filter (
        where exists (
          select 1
          from ingredient_unit_conversion conversions
          where conversions.ingredient_id = ingredients.ingredient_id
        )
      )::int as with_any_conversion,
      count(*) filter (
        where exists (
          select 1
          from ingredient_unit_conversion conversions
          where conversions.ingredient_id = ingredients.ingredient_id
            and conversions.from_unit = ingredients.canonical_unit
            and conversions.to_unit = ingredients.canonical_unit
            and conversions.ratio = 1
        )
      )::int as with_identity_conversion
    from ingredients
    group by coalesce(nullif(trim(ingredients.canonical_unit), ''), '<missing>')
    order by ingredient_count desc, canonical_unit asc;
  `);
  return rows.map(numberize);
}

async function fetchMissingCanonicalUnit() {
  const rows = await query(`
    select ingredient_id, ingredient_slug, canonical_name, category, canonical_unit
    from ingredients
    where nullif(trim(coalesce(canonical_unit, '')), '') is null
    order by canonical_name asc
    limit 30;
  `);
  return rows;
}

async function fetchIngredientsWithoutConversions() {
  const rows = await query(`
    select ingredient_id, ingredient_slug, canonical_name, category, canonical_unit
    from ingredients
    where not exists (
      select 1
      from ingredient_unit_conversion conversions
      where conversions.ingredient_id = ingredients.ingredient_id
    )
    order by canonical_name asc
    limit 30;
  `);
  return rows;
}

async function fetchMissingIdentityConversions() {
  const rows = await query(`
    select ingredient_id, ingredient_slug, canonical_name, category, canonical_unit
    from ingredients
    where nullif(trim(coalesce(canonical_unit, '')), '') is not null
      and not exists (
        select 1
        from ingredient_unit_conversion conversions
        where conversions.ingredient_id = ingredients.ingredient_id
          and conversions.from_unit = ingredients.canonical_unit
          and conversions.to_unit = ingredients.canonical_unit
          and conversions.ratio = 1
      )
    order by canonical_name asc
    limit 30;
  `);
  return rows;
}

function numberize(row) {
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => {
    if (typeof value === "string" && /^-?\d+$/.test(value)) {
      return [key, Number(value)];
    }
    return [key, value];
  }));
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
    throw new Error(`Refusing to audit ${target.label}. SUPABASE_DATABASE_URL points to ${host}, expected db.${target.projectRef}.*.`);
  }
}
