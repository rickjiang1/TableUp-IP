create table if not exists ingredient_storage_life_rules (
  id uuid primary key default gen_random_uuid(),
  ingredient_id text not null default '',
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
