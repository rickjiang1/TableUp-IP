create table if not exists ingredient_substitutions (
  ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
  substitute_ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
  confidence_score numeric not null default 0,
  primary key (ingredient_id, substitute_ingredient_id)
);

alter table ingredient_substitutions add column if not exists substitution_score integer;
alter table ingredient_substitutions add column if not exists substitution_type text not null default 'same_family';
alter table ingredient_substitutions add column if not exists replacement_ratio text not null default '1:1';
alter table ingredient_substitutions add column if not exists recipe_category text not null default 'cooking';
alter table ingredient_substitutions add column if not exists notes text not null default '';
alter table ingredient_substitutions add column if not exists source_name text not null default '';
alter table ingredient_substitutions add column if not exists source_url text not null default '';
alter table ingredient_substitutions add column if not exists confidence_level text not null default 'medium';
alter table ingredient_substitutions add column if not exists created_at timestamptz not null default now();
alter table ingredient_substitutions add column if not exists updated_at timestamptz not null default now();

update ingredient_substitutions
set substitution_score = round(confidence_score * 100)::integer
where substitution_score is null;

alter table ingredient_substitutions alter column substitution_score set not null;
alter table ingredient_substitutions alter column substitution_score set default 0;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'ingredient_substitutions_pkey'
  ) then
    alter table ingredient_substitutions drop constraint ingredient_substitutions_pkey;
  end if;
end $$;

alter table ingredient_substitutions
  add constraint ingredient_substitutions_pkey
  primary key (ingredient_id, substitute_ingredient_id, recipe_category);

alter table ingredient_substitutions
  drop constraint if exists ingredient_substitutions_type_check;
alter table ingredient_substitutions
  add constraint ingredient_substitutions_type_check
  check (substitution_type in (
    'exact_equivalent',
    'same_family',
    'flavor_similar',
    'texture_similar',
    'functional',
    'emergency'
  ));

alter table ingredient_substitutions
  drop constraint if exists ingredient_substitutions_score_check;
alter table ingredient_substitutions
  add constraint ingredient_substitutions_score_check
  check (substitution_score >= 0 and substitution_score <= 100);

create table if not exists ingredient_substitution_combinations (
  combination_id text primary key,
  ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
  display_name text not null,
  substitution_score integer not null,
  substitution_type text not null,
  replacement_ratio text not null default '',
  recipe_category text not null default 'cooking',
  notes text not null default '',
  source_name text not null default '',
  source_url text not null default '',
  confidence_level text not null default 'medium',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ingredient_substitution_combinations
  drop constraint if exists ingredient_substitution_combinations_type_check;
alter table ingredient_substitution_combinations
  add constraint ingredient_substitution_combinations_type_check
  check (substitution_type in (
    'exact_equivalent',
    'same_family',
    'flavor_similar',
    'texture_similar',
    'functional',
    'emergency'
  ));

alter table ingredient_substitution_combinations
  drop constraint if exists ingredient_substitution_combinations_score_check;
alter table ingredient_substitution_combinations
  add constraint ingredient_substitution_combinations_score_check
  check (substitution_score >= 0 and substitution_score <= 100);

create table if not exists ingredient_substitution_components (
  combination_id text not null references ingredient_substitution_combinations(combination_id) on delete cascade,
  sequence_number integer not null,
  component_ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
  quantity numeric,
  unit text not null default '',
  notes text not null default '',
  primary key (combination_id, sequence_number)
);

create index if not exists ingredient_substitutions_lookup_idx
  on ingredient_substitutions (ingredient_id, recipe_category, substitution_score desc);

create index if not exists ingredient_substitution_combinations_lookup_idx
  on ingredient_substitution_combinations (ingredient_id, recipe_category, substitution_score desc)
  where active = true;

grant select, insert, update, delete on ingredient_substitutions to anon;
grant select, insert, update, delete on ingredient_substitution_combinations to anon;
grant select, insert, update, delete on ingredient_substitution_components to anon;
