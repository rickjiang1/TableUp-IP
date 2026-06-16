create extension if not exists pgcrypto;

create table if not exists ingredient_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_category_id uuid references ingredient_categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ingredient_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tag_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredient_tags_type_check check (tag_type in (
    'flavor',
    'texture',
    'function',
    'nutrition',
    'form',
    'cooking_role'
  ))
);

alter table ingredients
  add column if not exists category_id uuid references ingredient_categories(id) on delete set null,
  add column if not exists subcategory_id uuid references ingredient_categories(id) on delete set null,
  add column if not exists default_unit text;

update ingredients
set default_unit = coalesce(nullif(default_unit, ''), canonical_unit, 'gram');

create index if not exists ingredients_category_id_idx
  on ingredients (category_id);

create index if not exists ingredients_subcategory_id_idx
  on ingredients (subcategory_id);

create table if not exists ingredient_functional_profiles (
  ingredient_id uuid not null references ingredients(ingredient_id) on delete cascade,
  tag_id uuid not null references ingredient_tags(id) on delete cascade,
  weight numeric not null default 1.0,
  source text not null default 'seed',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (ingredient_id, tag_id),
  constraint ingredient_functional_profiles_weight_check check (weight > 0 and weight <= 3)
);

create index if not exists ingredient_functional_profiles_tag_idx
  on ingredient_functional_profiles (tag_id);

create table if not exists substitution_rules (
  id uuid primary key default gen_random_uuid(),
  source_category_id uuid references ingredient_categories(id) on delete cascade,
  target_category_id uuid references ingredient_categories(id) on delete cascade,
  context text not null default 'general',
  base_score numeric not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint substitution_rules_base_score_check check (base_score >= 0 and base_score <= 1),
  constraint substitution_rules_unique_context unique (source_category_id, target_category_id, context)
);

create index if not exists substitution_rules_lookup_idx
  on substitution_rules (source_category_id, target_category_id, context);

create table if not exists verified_substitutions (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(ingredient_id) on delete cascade,
  substitute_ingredient_id uuid references ingredients(ingredient_id) on delete cascade,
  substitute_combo_slug text not null default '',
  context text not null default 'general',
  confidence_score numeric not null,
  replacement_ratio text not null default '1:1',
  notes text not null default '',
  source_name text not null default '',
  source_url text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_substitutions_score_check check (confidence_score >= 0 and confidence_score <= 1),
  constraint verified_substitutions_target_check check (
    substitute_ingredient_id is not null or substitute_combo_slug <> ''
  )
);

create unique index if not exists verified_substitutions_pair_context_idx
  on verified_substitutions (ingredient_id, substitute_ingredient_id, context)
  where substitute_ingredient_id is not null;

create unique index if not exists verified_substitutions_combo_context_idx
  on verified_substitutions (ingredient_id, substitute_combo_slug, context)
  where substitute_combo_slug <> '';

grant select, insert, update, delete on ingredient_categories to anon;
grant select, insert, update, delete on ingredient_tags to anon;
grant select, insert, update, delete on ingredient_functional_profiles to anon;
grant select, insert, update, delete on substitution_rules to anon;
grant select, insert, update, delete on verified_substitutions to anon;
