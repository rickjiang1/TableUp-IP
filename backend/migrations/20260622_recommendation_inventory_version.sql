create table if not exists household_inventory_state (
  household_id uuid primary key references households(id) on delete cascade,
  inventory_version bigint not null default 0,
  recommendation_cache_status text not null default 'stale'
    check (recommendation_cache_status in ('ready', 'stale', 'running')),
  inventory_hash text not null default '',
  recipe_library_version text not null default '',
  algorithm_version text not null default '',
  recalculation_started_at timestamptz,
  recalculation_finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_recommendation_cache
  add column if not exists household_id uuid references households(id) on delete cascade,
  add column if not exists inventory_version bigint not null default 0;

create index if not exists household_inventory_state_status_idx
  on household_inventory_state (recommendation_cache_status, updated_at desc);

create index if not exists user_recommendation_cache_version_lookup_idx
  on user_recommendation_cache (
    household_id,
    inventory_version,
    inventory_hash,
    recipe_library_version,
    algorithm_version,
    match_score desc
  );
