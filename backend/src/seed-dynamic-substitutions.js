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
  console.error("Usage: node backend/src/seed-dynamic-substitutions.js --env dev [--dry-run]");
  console.error("Use --env prod --allow-prod-write only for an intentional production seed.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

if (!args.dryRun) {
  await query(readFileSync("backend/migrations/20260618_dynamic_substitution_engine.sql", "utf8"));
  await query(readFileSync("backend/seeds/dynamic_substitution_seed.sql", "utf8"));
}

const [categories, tags, profiles, rules, verified] = await Promise.all([
  countRows("ingredient_categories"),
  countRows("ingredient_tags"),
  countRows("ingredient_functional_profiles"),
  countRows("substitution_rules"),
  countRows("verified_substitutions")
]);

console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  dryRun: args.dryRun,
  categories,
  tags,
  functionalProfiles: profiles,
  substitutionRules: rules,
  verifiedSubstitutions: verified
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
    throw new Error(`Refusing to write ${target.label}. SUPABASE_DATABASE_URL points to ${host}, expected db.${target.projectRef}.*.`);
  }
}

async function countRows(tableName) {
  const rows = await query(`select count(*)::int as count from ${tableName};`);
  return Number(rows[0]?.count || 0);
}
