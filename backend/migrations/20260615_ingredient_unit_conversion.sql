create extension if not exists pgcrypto;

alter table ingredients
  add column if not exists canonical_unit text not null default 'gram';

create table if not exists unit_aliases (
  alias text primary key,
  unit text not null,
  language text not null default 'unknown',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists ingredient_unit_conversion (
  id uuid primary key default gen_random_uuid(),
  ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
  from_unit text not null,
  to_unit text not null,
  ratio numeric not null,
  conversion_type text not null default 'average',
  is_default boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists ingredient_unit_conversion_unique_rule_idx
  on ingredient_unit_conversion (ingredient_id, from_unit, to_unit);

create index if not exists ingredient_unit_conversion_ingredient_idx
  on ingredient_unit_conversion (ingredient_id);

grant select, insert, update, delete on unit_aliases to anon;
grant select, insert, update, delete on ingredient_unit_conversion to anon;
