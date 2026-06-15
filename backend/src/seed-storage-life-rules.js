import { existsSync, readFileSync } from "node:fs";
import { ingredientStorageLifeRules } from "./ingredientStorageLifeSeeds.js";
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
  console.error("Usage: node backend/src/seed-storage-life-rules.js --env dev [--dry-run]");
  console.error("Use --env prod --allow-prod-write only for an intentional production seed.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}

assertTargetEnvironment(args.environment);
await bootstrapSchema();

const rows = ingredientStorageLifeRules.flat();
if (!args.dryRun) {
  await seedRules(rows);
}

console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  dryRun: args.dryRun,
  rules: rows.length,
  sample: rows.slice(0, 10)
}, null, 2));

async function bootstrapSchema() {
  await query(`
    create extension if not exists pgcrypto;

    create table if not exists ingredient_storage_life_rules (
      id uuid primary key default gen_random_uuid(),
      ingredient_id text not null default '',
      category text not null default '',
      storage_approach text not null,
      storage_location text not null default '',
      default_days integer not null,
      condition_state text not null default 'default',
      aliases text[] not null default '{}',
      priority integer not null default 100,
      notes text not null default '',
      active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists ingredient_storage_life_rules_lookup_idx
      on ingredient_storage_life_rules (active, ingredient_id, category, storage_approach, storage_location, priority);

    create unique index if not exists ingredient_storage_life_rules_unique_idx
      on ingredient_storage_life_rules (
        ingredient_id,
        category,
        storage_approach,
        storage_location,
        condition_state
      );

    grant select, insert, update, delete on ingredient_storage_life_rules to anon;
  `);
}

async function seedRules(rows) {
  if (rows.length === 0) {
    return;
  }

  await query(`
    insert into ingredient_storage_life_rules (
      ingredient_id, category, storage_approach, storage_location,
      default_days, condition_state, aliases, priority, notes, active, updated_at
    )
    values ${rows.map((row) => `(
      ${sqlString(row.ingredient_id)},
      ${sqlString(row.category)},
      ${sqlString(row.storage_approach)},
      ${sqlString(row.storage_location)},
      ${sqlNumber(row.default_days, 0)},
      ${sqlString(row.condition_state)},
      ${sqlTextArray(row.aliases)},
      ${sqlNumber(row.priority, 100)},
      ${sqlString(row.notes)},
      ${sqlBoolean(row.active)},
      now()
    )`).join(",\n")}
    on conflict (ingredient_id, category, storage_approach, storage_location, condition_state)
    do update set
      default_days = excluded.default_days,
      aliases = excluded.aliases,
      priority = excluded.priority,
      notes = excluded.notes,
      active = excluded.active,
      updated_at = now();
  `);
}

function sqlTextArray(values) {
  const items = Array.isArray(values) ? values : [];
  return `array[${items.map(sqlString).join(", ")}]::text[]`;
}

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
  const envFiles = environment === "dev"
    ? ["backend/.env.dev.local", "backend/.env"]
    : ["backend/.env"];

  for (const file of envFiles) {
    if (!existsSync(file)) {
      continue;
    }
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
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
    host = new URL(databaseUrl).hostname;
  } catch {
    throw new Error("SUPABASE_DATABASE_URL must be a valid URL.");
  }

  if (!host.startsWith(`db.${target.projectRef}.`)) {
    throw new Error(`Refusing to write ${target.label}. SUPABASE_DATABASE_URL points to ${host}, expected db.${target.projectRef}.*.`);
  }
}

