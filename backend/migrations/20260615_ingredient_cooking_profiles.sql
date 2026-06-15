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

create table if not exists ingredient_substitution_contexts (
  ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
  substitute_ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
  compatible_methods text[] not null default '{}',
  time_adjustment text not null default 'same',
  texture_impact text not null default '',
  fat_impact text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (ingredient_id, substitute_ingredient_id)
);

create index if not exists ingredient_cooking_profiles_cut_group_idx
  on ingredient_cooking_profiles (cut_group);

create index if not exists ingredient_substitution_contexts_methods_idx
  on ingredient_substitution_contexts using gin (compatible_methods);

grant select, insert, update, delete on ingredient_cooking_profiles to anon;
grant select, insert, update, delete on ingredient_substitution_contexts to anon;
