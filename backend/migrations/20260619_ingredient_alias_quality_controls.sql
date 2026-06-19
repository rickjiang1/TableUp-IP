alter table ingredient_aliases
  add column if not exists active boolean not null default true,
  add column if not exists review_status text not null default 'accepted',
  add column if not exists review_reason text not null default '';

create index if not exists ingredient_aliases_active_lookup_idx
  on ingredient_aliases (active, alias_name, ingredient_id)
  where active = true;

create index if not exists ingredient_aliases_review_status_idx
  on ingredient_aliases (review_status, active);
