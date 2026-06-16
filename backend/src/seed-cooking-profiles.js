import { existsSync, readFileSync } from "node:fs";
import { buildCookingProfileSeedRows } from "./ingredientCookingProfileSeeds.js";
import { query, sqlString } from "./postgres.js";

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
  console.error("Usage: node backend/src/seed-cooking-profiles.js --env dev [--dry-run]");
  console.error("Use --env prod --allow-prod-write only for an intentional production seed.");
  process.exit(1);
}
if (args.environment === "prod" && !args.allowProdWrite) {
  console.error("Refusing to write production data without --allow-prod-write.");
  process.exit(1);
}
assertTargetEnvironment(args.environment);

await bootstrapCookingProfileSchema();
const ingredients = await fetchIngredients();
const profiles = buildCookingProfileSeedRows(ingredients);

if (!args.dryRun) {
  await seedProfiles(profiles);
}

console.log(JSON.stringify({
  environment: args.environment,
  target: environmentTargets[args.environment].label,
  dryRun: args.dryRun,
  ingredients: ingredients.length,
  profiles: profiles.length,
  profileSample: profiles.slice(0, 12)
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

async function bootstrapCookingProfileSchema() {
  await query(`
    create table if not exists ingredient_cooking_profiles (
      ingredient_id text primary key references ingredients(ingredient_id) on delete cascade,
      primary_methods text[] not null default '{}',
      cooking_time_class text not null default 'medium',
      texture_class text not null default '',
      fat_level text not null default '',
      cut_group text not null default '',
      notes text not null default '',
      updated_at timestamptz not null default now()
    );

    create index if not exists ingredient_cooking_profiles_cut_group_idx
      on ingredient_cooking_profiles (cut_group);

    grant select, insert, update, delete on ingredient_cooking_profiles to anon;
  `);
}

async function fetchIngredients() {
  return await query(`
    select ingredient_id, canonical_name, category
    from ingredients
    order by ingredient_id
  `);
}

async function seedProfiles(profiles) {
  if (!profiles.length) return;
  await query(`
    insert into ingredient_cooking_profiles (
      ingredient_id, primary_methods, cooking_time_class, texture_class, fat_level, cut_group, notes, updated_at
    )
    values ${profiles.map((item) => `(
      ${sqlString(item.ingredient_id)},
      ${sqlTextArray(item.primary_methods)},
      ${sqlString(item.cooking_time_class)},
      ${sqlString(item.texture_class)},
      ${sqlString(item.fat_level)},
      ${sqlString(item.cut_group)},
      ${sqlString(item.notes)},
      now()
    )`).join(",\n")}
    on conflict (ingredient_id) do update set
      primary_methods = excluded.primary_methods,
      cooking_time_class = excluded.cooking_time_class,
      texture_class = excluded.texture_class,
      fat_level = excluded.fat_level,
      cut_group = excluded.cut_group,
      notes = excluded.notes,
      updated_at = now()
  `);
}

function sqlTextArray(values) {
  const items = Array.isArray(values) ? values : [];
  return `array[${items.map(sqlString).join(", ")}]::text[]`;
}
