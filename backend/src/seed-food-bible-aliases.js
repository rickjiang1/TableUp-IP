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
  console.error("Usage: node backend/src/seed-food-bible-aliases.js --env dev [--dry-run]");
  console.error("Use --env prod --allow-prod-write only for an intentional production seed.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

const beforeCount = await countFoodBibleAliases();
if (!args.dryRun) {
  await bootstrapAliasSchema();
  await applyAliasSeed();
  await applyIngredientUuidMigration();
}
const afterCount = args.dryRun ? beforeCount : await countFoodBibleAliases();

console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  dryRun: args.dryRun,
  foodBibleAliasesBefore: beforeCount,
  foodBibleAliasesAfter: afterCount,
  sample: args.dryRun ? [] : await sampleFoodBibleAliases()
}, null, 2));

function parseArgs(argv) {
  const parsed = {
    environment: "",
    allowProdWrite: false,
    dryRun: false
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
    if (value === "--dry-run") {
      parsed.dryRun = true;
    }
  }

  return parsed;
}

function loadEnv(environment) {
  const candidates = [
    environment ? `backend/.env.${environment}` : "",
    "backend/.env"
  ].filter(Boolean);

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
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
    throw new Error(`Refusing to write ${target.label}. SUPABASE_DATABASE_URL points to ${host}, expected db.${target.projectRef}.*.`);
  }
}

async function bootstrapAliasSchema() {
  await query(`
    create table if not exists ingredient_aliases (
      alias_name text primary key,
      ingredient_id text not null references ingredients(ingredient_id) on delete cascade
    );

    alter table ingredient_aliases add column if not exists canonical_name text not null default '';
    alter table ingredient_aliases add column if not exists language text not null default 'unknown';
    alter table ingredient_aliases add column if not exists category text not null default 'other';
    alter table ingredient_aliases add column if not exists confidence_score double precision not null default 1;
    alter table ingredient_aliases add column if not exists verified boolean not null default true;
    alter table ingredient_aliases add column if not exists created_at timestamptz not null default now();
    alter table ingredient_aliases add column if not exists updated_at timestamptz not null default now();

    grant select, insert, update, delete on ingredient_aliases to anon;
  `);
}

async function applyAliasSeed() {
  await query(readFileSync("backend/seeds/ingredient_aliases_food_bible_auto.sql", "utf8"));
}

async function applyIngredientUuidMigration() {
  await query(readFileSync("backend/migrations/20260617_ingredient_uuid_relationships.sql", "utf8"));
}

async function countFoodBibleAliases() {
  const rows = await query("select count(*)::int as count from ingredient_aliases where confidence_score = 0.86 and verified = true");
  return Number(rows[0]?.count || 0);
}

async function sampleFoodBibleAliases() {
  return await query(`
    select alias_name, ingredient_id, canonical_name, category
    from ingredient_aliases
    where confidence_score = 0.86
      and verified = true
    order by ingredient_id, alias_name
    limit 20
  `);
}
