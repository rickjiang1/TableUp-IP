create extension if not exists pgcrypto;

-- Smart migration:
-- 1. Keep the readable old text ids as *_slug.
-- 2. Promote the existing UUID columns into the canonical *_ingredient_id columns.
-- 3. Make every ingredient relationship point to ingredients(ingredient_id), now UUID.

do $$
declare
  item record;
begin
  for item in
    select con.conname, rel.relname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
    where con.contype = 'f'
      and rel.relname in (
        'ingredient_aliases',
        'ingredient_substitutions',
        'ingredient_substitution_components',
        'ingredient_unit_conversion',
        'ingredient_storage_life_rules',
        'ingredient_cooking_profiles',
        'pantry_recipe_ingredients',
        'unknown_ingredients'
      )
      and att.attname in (
        'ingredient_id',
        'substitute_ingredient_id',
        'component_ingredient_id',
        'canonical_ingredient_id',
        'suggested_ingredient_id'
      )
  loop
    execute format('alter table %I drop constraint %I', item.relname, item.conname);
  end loop;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ingredients'
      and column_name = 'id'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ingredients'
      and column_name = 'ingredient_id'
      and udt_name <> 'uuid'
  ) then
    alter table ingredients rename column ingredient_id to ingredient_slug;
    alter table ingredients rename column id to ingredient_id;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'ingredients_pkey') then
    alter table ingredients drop constraint ingredients_pkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ingredients_ingredient_id_pkey') then
    alter table ingredients add constraint ingredients_ingredient_id_pkey primary key (ingredient_id);
  end if;
end $$;

create unique index if not exists ingredients_ingredient_slug_unique_idx
  on ingredients (ingredient_slug);

comment on column ingredients.ingredient_id is
  'Canonical UUID ingredient id. This is the only ingredient id foreign keys should reference.';
comment on column ingredients.ingredient_slug is
  'Old readable ingredient id kept for imports, debug, and backward compatibility only.';

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_aliases' and column_name = 'ingredient_uuid')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_aliases' and column_name = 'ingredient_id' and udt_name <> 'uuid') then
    alter table ingredient_aliases rename column ingredient_id to ingredient_slug;
    alter table ingredient_aliases rename column ingredient_uuid to ingredient_id;
  end if;
end $$;

alter table ingredient_aliases
  drop constraint if exists ingredient_aliases_ingredient_id_fk;
alter table ingredient_aliases
  add constraint ingredient_aliases_ingredient_id_fk
  foreign key (ingredient_id)
  references ingredients(ingredient_id)
  on delete cascade;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_substitutions' and column_name = 'ingredient_uuid')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_substitutions' and column_name = 'ingredient_id' and udt_name <> 'uuid') then
    alter table ingredient_substitutions rename column ingredient_id to ingredient_slug;
    alter table ingredient_substitutions rename column ingredient_uuid to ingredient_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_substitutions' and column_name = 'substitute_ingredient_uuid')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_substitutions' and column_name = 'substitute_ingredient_id' and udt_name <> 'uuid') then
    alter table ingredient_substitutions rename column substitute_ingredient_id to substitute_ingredient_slug;
    alter table ingredient_substitutions rename column substitute_ingredient_uuid to substitute_ingredient_id;
  end if;
end $$;

alter table ingredient_substitutions add column if not exists id uuid default gen_random_uuid();
update ingredient_substitutions set id = gen_random_uuid() where id is null;
alter table ingredient_substitutions alter column id set not null;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'ingredient_substitutions_pkey') then
    alter table ingredient_substitutions drop constraint ingredient_substitutions_pkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ingredient_substitutions_id_pkey') then
    alter table ingredient_substitutions add constraint ingredient_substitutions_id_pkey primary key (id);
  end if;
end $$;

alter table ingredient_substitutions
  drop constraint if exists ingredient_substitutions_ingredient_id_fk;
alter table ingredient_substitutions
  add constraint ingredient_substitutions_ingredient_id_fk
  foreign key (ingredient_id)
  references ingredients(ingredient_id)
  on delete cascade;

alter table ingredient_substitutions
  drop constraint if exists ingredient_substitutions_substitute_ingredient_id_fk;
alter table ingredient_substitutions
  add constraint ingredient_substitutions_substitute_ingredient_id_fk
  foreign key (substitute_ingredient_id)
  references ingredients(ingredient_id)
  on delete cascade;

drop index if exists ingredient_substitutions_lookup_idx;
drop index if exists ingredient_substitutions_mvp_match_idx;
create index if not exists ingredient_substitutions_match_idx
  on ingredient_substitutions (ingredient_id, context, confidence_score desc)
  where needs_review = false
    and confidence_score >= 0.70
    and substitution_type not in ('alias', 'variety', 'category_mapping');

create unique index if not exists ingredient_substitutions_unique_rule_idx
  on ingredient_substitutions (ingredient_id, substitute_ingredient_id, recipe_category)
  where substitute_ingredient_id is not null;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_substitution_components' and column_name = 'component_ingredient_uuid')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_substitution_components' and column_name = 'component_ingredient_id' and udt_name <> 'uuid') then
    alter table ingredient_substitution_components rename column component_ingredient_id to component_ingredient_slug;
    alter table ingredient_substitution_components rename column component_ingredient_uuid to component_ingredient_id;
  end if;
end $$;

alter table ingredient_substitution_components
  drop constraint if exists ingredient_substitution_components_component_ingredient_id_fk;
alter table ingredient_substitution_components
  add constraint ingredient_substitution_components_component_ingredient_id_fk
  foreign key (component_ingredient_id)
  references ingredients(ingredient_id)
  on delete cascade;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_unit_conversion' and column_name = 'ingredient_uuid')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_unit_conversion' and column_name = 'ingredient_id' and udt_name <> 'uuid') then
    alter table ingredient_unit_conversion rename column ingredient_id to ingredient_slug;
    alter table ingredient_unit_conversion rename column ingredient_uuid to ingredient_id;
  end if;
end $$;

alter table ingredient_unit_conversion
  drop constraint if exists ingredient_unit_conversion_ingredient_id_fk;
alter table ingredient_unit_conversion
  add constraint ingredient_unit_conversion_ingredient_id_fk
  foreign key (ingredient_id)
  references ingredients(ingredient_id)
  on delete cascade;

drop index if exists ingredient_unit_conversion_unique_rule_idx;
create unique index if not exists ingredient_unit_conversion_unique_rule_idx
  on ingredient_unit_conversion (ingredient_id, from_unit, to_unit);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_storage_life_rules' and column_name = 'ingredient_uuid')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_storage_life_rules' and column_name = 'ingredient_id' and udt_name <> 'uuid') then
    alter table ingredient_storage_life_rules rename column ingredient_id to ingredient_slug;
    alter table ingredient_storage_life_rules rename column ingredient_uuid to ingredient_id;
  end if;
end $$;

alter table ingredient_storage_life_rules
  drop constraint if exists ingredient_storage_life_rules_ingredient_id_fk;
alter table ingredient_storage_life_rules
  add constraint ingredient_storage_life_rules_ingredient_id_fk
  foreign key (ingredient_id)
  references ingredients(ingredient_id)
  on delete cascade;

drop index if exists ingredient_storage_life_rules_unique_idx;
create unique index if not exists ingredient_storage_life_rules_unique_idx
  on ingredient_storage_life_rules (
    ingredient_id,
    category,
    storage_approach,
    storage_location,
    condition_state
  )
  where ingredient_id is not null;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pantry_recipe_ingredients' and column_name = 'canonical_ingredient_uuid')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pantry_recipe_ingredients' and column_name = 'canonical_ingredient_id' and udt_name <> 'uuid') then
    alter table pantry_recipe_ingredients rename column canonical_ingredient_id to canonical_ingredient_slug;
    alter table pantry_recipe_ingredients rename column canonical_ingredient_uuid to canonical_ingredient_id;
  end if;
end $$;

alter table pantry_recipe_ingredients
  drop constraint if exists pantry_recipe_ingredients_canonical_ingredient_id_fk;
alter table pantry_recipe_ingredients
  add constraint pantry_recipe_ingredients_canonical_ingredient_id_fk
  foreign key (canonical_ingredient_id)
  references ingredients(ingredient_id)
  on delete set null;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'unknown_ingredients' and column_name = 'suggested_ingredient_uuid')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'unknown_ingredients' and column_name = 'suggested_ingredient_id' and udt_name <> 'uuid') then
    alter table unknown_ingredients rename column suggested_ingredient_id to suggested_ingredient_slug;
    alter table unknown_ingredients rename column suggested_ingredient_uuid to suggested_ingredient_id;
  end if;
end $$;

alter table unknown_ingredients
  drop constraint if exists unknown_ingredients_suggested_ingredient_id_fk;
alter table unknown_ingredients
  add constraint unknown_ingredients_suggested_ingredient_id_fk
  foreign key (suggested_ingredient_id)
  references ingredients(ingredient_id)
  on delete set null;

do $$
begin
  if to_regclass('public.ingredient_cooking_profiles') is not null then
    alter table ingredient_cooking_profiles add column if not exists ingredient_uuid uuid;
    update ingredient_cooking_profiles profiles
    set ingredient_uuid = ingredients.ingredient_id
    from ingredients
    where profiles.ingredient_uuid is null
      and profiles.ingredient_id = ingredients.ingredient_slug;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_cooking_profiles' and column_name = 'ingredient_uuid')
       and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ingredient_cooking_profiles' and column_name = 'ingredient_id' and udt_name <> 'uuid') then
      alter table ingredient_cooking_profiles rename column ingredient_id to ingredient_slug;
      alter table ingredient_cooking_profiles rename column ingredient_uuid to ingredient_id;
    end if;

    if exists (select 1 from pg_constraint where conname = 'ingredient_cooking_profiles_pkey') then
      alter table ingredient_cooking_profiles drop constraint ingredient_cooking_profiles_pkey;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'ingredient_cooking_profiles_ingredient_id_pkey') then
      alter table ingredient_cooking_profiles add constraint ingredient_cooking_profiles_ingredient_id_pkey primary key (ingredient_id);
    end if;

    alter table ingredient_cooking_profiles
      drop constraint if exists ingredient_cooking_profiles_ingredient_id_fk;
    alter table ingredient_cooking_profiles
      add constraint ingredient_cooking_profiles_ingredient_id_fk
      foreign key (ingredient_id)
      references ingredients(ingredient_id)
      on delete cascade;
  end if;
end $$;
