create extension if not exists pgcrypto;

create table if not exists ingredient_external_ids (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(ingredient_id) on delete cascade,
  source_name text not null,
  external_id text not null,
  external_url text not null default '',
  match_name text not null default '',
  match_method text not null default '',
  confidence_score numeric not null default 0,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredient_external_ids_confidence_check check (confidence_score >= 0 and confidence_score <= 1)
);

create unique index if not exists ingredient_external_ids_unique_idx
  on ingredient_external_ids (ingredient_id, source_name, external_id);

create index if not exists ingredient_external_ids_source_lookup_idx
  on ingredient_external_ids (source_name, external_id);

create index if not exists ingredient_external_ids_ingredient_source_confidence_idx
  on ingredient_external_ids (ingredient_id, source_name, confidence_score desc);

create table if not exists ingredient_nutrition_profiles (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(ingredient_id) on delete cascade,
  source_name text not null,
  source_food_id text not null,
  source_url text not null default '',
  food_description text not null default '',
  data_type text not null default '',
  preparation_state text not null default 'unknown',
  serving_basis text not null default 'per_100g',
  calories_kcal numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  calcium_mg numeric,
  iron_mg numeric,
  potassium_mg numeric,
  confidence_score numeric not null default 0,
  match_method text not null default '',
  raw_payload jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredient_nutrition_profiles_confidence_check check (confidence_score >= 0 and confidence_score <= 1),
  constraint ingredient_nutrition_profiles_serving_basis_check check (serving_basis in ('per_100g', 'per_100ml', 'per_serving', 'unknown'))
);

create unique index if not exists ingredient_nutrition_profiles_unique_idx
  on ingredient_nutrition_profiles (ingredient_id, source_name, source_food_id, preparation_state, serving_basis);

create index if not exists ingredient_nutrition_profiles_lookup_idx
  on ingredient_nutrition_profiles (ingredient_id, active, confidence_score desc);

create index if not exists ingredient_nutrition_profiles_source_idx
  on ingredient_nutrition_profiles (source_name, source_food_id);

grant select, insert, update, delete on ingredient_external_ids to anon;
grant select, insert, update, delete on ingredient_nutrition_profiles to anon;
