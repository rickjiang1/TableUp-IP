import { existsSync, readFileSync } from "node:fs";
import { buildIngredientSubstitutionSeedRows } from "./ingredientSubstitutionSeeds.js";
import { query, sqlNumber, sqlString } from "./postgres.js";

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
const substitutions = buildIngredientSubstitutionSeedRows(ingredients);
const existingCount = await countExistingSubstitutions();

if (!args.dryRun) {
  await seedSubstitutions(substitutions);
}

console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  dryRun: args.dryRun,
  ingredients: ingredients.length,
  existingSubstitutions: existingCount,
  generatedSubstitutions: substitutions.length,
  sample: substitutions.slice(0, 20)
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
  await query(`
    create table if not exists ingredient_substitutions (
      ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
      substitute_ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
      confidence_score numeric not null,
      primary key (ingredient_id, substitute_ingredient_id)
    );

    grant select, insert, update, delete on ingredient_substitutions to anon;
  `);
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

async function seedSubstitutions(substitutions) {
  if (!substitutions.length) return;
  const batchSize = 400;
  for (let index = 0; index < substitutions.length; index += batchSize) {
    const batch = substitutions.slice(index, index + batchSize);
    await query(`
      insert into ingredient_substitutions (ingredient_id, substitute_ingredient_id, confidence_score)
      values ${batch.map((item) => `(${sqlString(item.ingredient_id)}, ${sqlString(item.substitute_ingredient_id)}, ${sqlNumber(item.confidence_score, 0)})`).join(",\n")}
      on conflict (ingredient_id, substitute_ingredient_id) do update set
        confidence_score = greatest(ingredient_substitutions.confidence_score, excluded.confidence_score)
    `);
  }
}
