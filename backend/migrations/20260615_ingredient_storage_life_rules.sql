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
