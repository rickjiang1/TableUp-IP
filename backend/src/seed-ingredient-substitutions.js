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
  console.error("Usage: node backend/src/seed-ingredient-substitutions.js --env dev [--dry-run]");
  console.error("Use --env prod --allow-prod-write only for an intentional production seed.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

await bootstrapSubstitutionSchema();
const ingredients = await fetchIngredients();
const existingCount = await countExistingSubstitutions();

if (!args.dryRun) {
  await applySeedFiles();
}
const finalCount = args.dryRun ? existingCount : await countExistingSubstitutions();
const customComboCount = args.dryRun ? 0 : await countCustomComboSubstitutions();

console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  dryRun: args.dryRun,
  ingredients: ingredients.length,
  existingSubstitutions: existingCount,
  finalSubstitutions: finalCount,
  customComboSubstitutions: customComboCount,
  sample: args.dryRun ? [] : await sampleSubstitutions()
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

async function bootstrapSubstitutionSchema() {
  await query(readFileSync("backend/migrations/20260615_ingredient_substitutions_enrichment.sql", "utf8"));
  await query(readFileSync("backend/migrations/20260616_simplify_substitutions_mvp.sql", "utf8"));
}

async function fetchIngredients() {
  return await query(`
    select ingredient_id, canonical_name, category
    from ingredients
    order by ingredient_id
  `);
}

async function countExistingSubstitutions() {
  const rows = await query("select count(*)::int as count from ingredient_substitutions");
  return Number(rows[0]?.count || 0);
}

async function countCustomComboSubstitutions() {
  const rows = await query("select count(*)::int as count from ingredient_substitutions where position('__' in substitute_ingredient_id) > 0 or substitute_ingredient_id like 'custom\\_combo\\_%' escape '\\'");
  return Number(rows[0]?.count || 0);
}

async function applySeedFiles() {
  const seedFiles = [
    "backend/seeds/ingredient_substitutions_verified.sql",
    "backend/seeds/ingredient_substitutions_food_bible_auto.sql",
    "backend/seeds/ingredient_substitution_combo_components_food_bible_auto.sql",
    "backend/seeds/ingredient_substitutions_mvp_cleanup.sql"
  ];

  for (const seedFile of seedFiles) {
    await query(readFileSync(seedFile, "utf8"));
  }
  await query(readFileSync("backend/migrations/20260617_drop_deprecated_substitution_tables.sql", "utf8"));
  await query(readFileSync("backend/migrations/20260617_ingredient_uuid_relationships.sql", "utf8"));
}

async function sampleSubstitutions() {
  return await query(`
    select
      ingredient_id,
      substitute_ingredient_id,
      confidence_score,
      substitution_type,
      recipe_category,
      source_name
    from ingredient_substitutions
    where source_name <> ''
    order by ingredient_id, confidence_score desc
    limit 20
  `);
}
