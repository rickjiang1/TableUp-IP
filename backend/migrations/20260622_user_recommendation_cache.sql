create table if not exists user_recommendation_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  recipe_id text not null,
  rank integer not null default 0,
  match_score numeric not null default 0,
  fridge_rescue_score numeric not null default 0,
  tonight_score numeric not null default 0,
  active_time_minutes integer not null default 0,
  difficulty text not null default '',
  leftover_score numeric not null default 0,
  reason_json jsonb not null default '{}'::jsonb,
  match_details_json jsonb not null default '{}'::jsonb,
  inventory_hash text not null,
  recipe_library_version text not null,
  algorithm_version text not null,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, recipe_id, inventory_hash, recipe_library_version, algorithm_version)
);

create index if not exists user_recommendation_cache_lookup_idx
  on user_recommendation_cache (user_id, inventory_hash, recipe_library_version, algorithm_version, tonight_score desc);

create index if not exists user_recommendation_cache_tonight_idx
  on user_recommendation_cache (user_id, tonight_score desc, rank asc);

create index if not exists user_recommendation_cache_match_idx
  on user_recommendation_cache (user_id, match_score desc);

create index if not exists user_recommendation_cache_fridge_idx
  on user_recommendation_cache (user_id, fridge_rescue_score desc);

create index if not exists user_recommendation_cache_time_idx
  on user_recommendation_cache (user_id, active_time_minutes asc);
