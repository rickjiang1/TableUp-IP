import { existsSync, readFileSync } from "node:fs";
import {
  ingredientStorageLifeAliasRows,
  ingredientStorageLifeIngredientRows,
  ingredientStorageLifeRules,
  ingredientStorageLifeSource
} from "./ingredientStorageLifeSeeds.js";
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

const rows = prepareStorageRows(ingredientStorageLifeRules.flat());
const ingredientRows = ingredientStorageLifeIngredientRows;
const aliasRows = ingredientStorageLifeAliasRows;
if (!args.dryRun) {
  await seedIngredientData(ingredientRows, aliasRows);
  await clearRules();
  await ensureRuleUniqueIndex();
  await seedRules(rows);
  await enforceRelationships();
  await applyIngredientUuidMigration();
}

console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  dryRun: args.dryRun,
  replacedTable: !args.dryRun,
  source: ingredientStorageLifeSource,
  ingredients: ingredientRows.length,
  aliases: aliasRows.length,
  rules: rows.length,
  sample: rows.slice(0, 10)
}, null, 2));

async function bootstrapSchema() {
  await query(`
    create extension if not exists pgcrypto;

    create table if not exists ingredient_storage_life_rules (
      id uuid primary key default gen_random_uuid(),
      ingredient_id text,
      category text not null default '',
      storage_approach text not null,
      storage_location text not null default '',
      default_days integer not null,
      condition_state text not null default 'default',
      priority integer not null default 100,
      notes text not null default '',
      source_name text not null default '',
      source_url text not null default '',
      source_priority integer not null default 100,
      safety_note text not null default '',
      active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table ingredient_storage_life_rules add column if not exists source_name text not null default '';
    alter table ingredient_storage_life_rules add column if not exists source_url text not null default '';
    alter table ingredient_storage_life_rules add column if not exists source_priority integer not null default 100;
    alter table ingredient_storage_life_rules add column if not exists safety_note text not null default '';
    alter table ingredient_storage_life_rules drop column if exists aliases;
    alter table ingredient_storage_life_rules alter column ingredient_id drop not null;
    alter table ingredient_storage_life_rules alter column ingredient_id drop default;

    create table if not exists ingredient_aliases (
      alias_name text primary key,
      ingredient_id text not null
    );

    alter table ingredient_aliases add column if not exists canonical_name text not null default '';
    alter table ingredient_aliases add column if not exists language text not null default 'unknown';
    alter table ingredient_aliases add column if not exists category text not null default 'other';
    alter table ingredient_aliases add column if not exists confidence_score double precision not null default 1;
    alter table ingredient_aliases add column if not exists verified boolean not null default true;
    alter table ingredient_aliases add column if not exists created_at timestamptz not null default now();
    alter table ingredient_aliases add column if not exists updated_at timestamptz not null default now();

    grant select, insert, update, delete on ingredient_storage_life_rules to anon;
    grant select, insert, update, delete on ingredient_aliases to anon;
  `);
  await ensureIngredientsTable();
  await query(`
    update ingredient_storage_life_rules
    set ingredient_id = null
    where ingredient_id = ''
       or ingredient_id like '%\\_category' escape '\\';

    create index if not exists ingredient_storage_life_rules_lookup_idx
      on ingredient_storage_life_rules (active, ingredient_id, category, storage_approach, storage_location, priority);

    drop index if exists ingredient_storage_life_rules_unique_idx;

    grant select, insert, update, delete on ingredients to anon;
  `);
}

async function ensureIngredientsTable() {
  await query(`
    create table if not exists ingredients (
      ingredient_id text primary key,
      canonical_name text not null,
      category text not null,
      canonical_unit text not null default 'gram'
    );

    alter table ingredients add column if not exists canonical_unit text not null default 'gram';
  `);
}

async function clearRules() {
  await query("delete from ingredient_storage_life_rules;");
}

async function ensureRuleUniqueIndex() {
  await query(`
    create unique index if not exists ingredient_storage_life_rules_unique_idx
      on ingredient_storage_life_rules (
        coalesce(ingredient_id, ''),
        category,
        storage_approach,
        storage_location,
        condition_state
      );
  `);
}

async function seedRules(rows) {
  if (rows.length === 0) {
    return;
  }

  await query(`
    insert into ingredient_storage_life_rules (
      ingredient_id, category, storage_approach, storage_location,
      default_days, condition_state, priority, notes,
      source_name, source_url, source_priority, safety_note, active, updated_at
    )
    values ${rows.map((row) => `(
      ${sqlNullableString(storageRuleIngredientId(row))},
      ${sqlString(row.category)},
      ${sqlString(row.storage_approach)},
      ${sqlString(row.storage_location)},
      ${sqlNumber(row.default_days, 0)},
      ${sqlString(row.condition_state)},
      ${sqlNumber(row.priority, 100)},
      ${sqlString(row.notes)},
      ${sqlString(row.source_name)},
      ${sqlString(row.source_url)},
      ${sqlNumber(row.source_priority, 100)},
      ${sqlString(row.safety_note)},
      ${sqlBoolean(row.active)},
      now()
    )`).join(",\n")}
    on conflict (
      coalesce(ingredient_id, ''),
      category,
      storage_approach,
      storage_location,
      condition_state
    )
    do update set
      default_days = excluded.default_days,
      priority = excluded.priority,
      notes = excluded.notes,
      source_name = excluded.source_name,
      source_url = excluded.source_url,
      source_priority = excluded.source_priority,
      safety_note = excluded.safety_note,
      active = excluded.active,
      updated_at = now();
  `);
}

async function enforceRelationships() {
  await query(`
    do $$
    begin
      if not exists (
        select 1
        from pg_constraint
        where conname = 'ingredient_storage_life_rules_ingredient_fk'
      ) then
        alter table ingredient_storage_life_rules
          add constraint ingredient_storage_life_rules_ingredient_fk
          foreign key (ingredient_id)
          references ingredients(ingredient_id)
          on delete cascade;
      end if;
    end $$;
  `);
}

async function applyIngredientUuidMigration() {
  await query(readFileSync("backend/migrations/20260617_ingredient_uuid_relationships.sql", "utf8"));
}

function storageRuleIngredientId(row) {
  const ingredientId = String(row?.ingredient_id || "").trim();
  return ingredientId && !ingredientId.endsWith("_category") ? ingredientId : null;
}

function prepareStorageRows(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const normalized = {
      ...row,
      ingredient_id: storageRuleIngredientId(row)
    };
    const key = [
      normalized.ingredient_id || "",
      normalized.category || "",
      normalized.storage_approach || "",
      normalized.storage_location || "",
      normalized.condition_state || ""
    ].join("::");
    const existing = byKey.get(key);
    if (!existing || Number(normalized.priority ?? 100) < Number(existing.priority ?? 100)) {
      byKey.set(key, normalized);
    }
  }
  return Array.from(byKey.values());
}

function sqlNullableString(value) {
  return value === null || value === undefined ? "null" : sqlString(value);
}

async function seedIngredientData(ingredients, aliases) {
  if (ingredients.length > 0) {
    await query(`
      insert into ingredients (ingredient_id, canonical_name, category, canonical_unit)
      values ${ingredients.map((row) => `(
        ${sqlString(row.ingredient_id)},
        ${sqlString(row.canonical_name)},
        ${sqlString(row.category)},
        ${sqlString(row.canonical_unit)}
      )`).join(",\n")}
      on conflict (ingredient_id) do nothing;
    `);
  }

  for (const chunk of chunks(aliases, 300)) {
    await query(`
      insert into ingredient_aliases (
        alias_name, ingredient_id, canonical_name, language, category, confidence_score, verified, updated_at
      )
      values ${chunk.map((row) => `(
        ${sqlString(row.alias_name)},
        ${sqlString(row.ingredient_id)},
        ${sqlString(row.canonical_name)},
        ${sqlString(row.language)},
        ${sqlString(row.category)},
        ${sqlNumber(row.confidence_score, 0.85)},
        ${sqlBoolean(row.verified)},
        now()
      )`).join(",\n")}
      on conflict (alias_name) do nothing;
    `);
  }
}

function chunks(values, size) {
  const output = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
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
