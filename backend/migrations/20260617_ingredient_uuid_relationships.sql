create extension if not exists pgcrypto;

alter table ingredients
  add column if not exists id uuid default gen_random_uuid();

update ingredients
set id = gen_random_uuid()
where id is null;

alter table ingredients
  alter column id set not null;

create unique index if not exists ingredients_id_unique_idx
  on ingredients (id);

create unique index if not exists ingredients_ingredient_id_unique_idx
  on ingredients (ingredient_id);

comment on column ingredients.id is
  'Canonical UUID identifier for relational references. The legacy ingredient_id text column is kept as a stable slug for compatibility during the migration.';

comment on column ingredients.ingredient_id is
  'Legacy stable ingredient slug. Do not use as the long-term relational key for new tables.';

alter table ingredient_aliases
  add column if not exists ingredient_uuid uuid;

update ingredient_aliases aliases
set ingredient_uuid = ingredients.id
from ingredients
where aliases.ingredient_uuid is null
  and aliases.ingredient_id = ingredients.ingredient_id;

alter table ingredient_aliases
  drop constraint if exists ingredient_aliases_ingredient_uuid_fk;

alter table ingredient_aliases
  add constraint ingredient_aliases_ingredient_uuid_fk
  foreign key (ingredient_uuid)
  references ingredients(id)
  on delete cascade;

create index if not exists ingredient_aliases_ingredient_uuid_idx
  on ingredient_aliases (ingredient_uuid);

alter table ingredient_substitutions
  add column if not exists ingredient_uuid uuid,
  add column if not exists substitute_ingredient_uuid uuid;

update ingredient_substitutions substitutions
set ingredient_uuid = ingredients.id
from ingredients
where substitutions.ingredient_uuid is null
  and substitutions.ingredient_id = ingredients.ingredient_id;

update ingredient_substitutions substitutions
set substitute_ingredient_uuid = ingredients.id
from ingredients
where substitutions.substitute_ingredient_uuid is null
  and substitutions.substitute_ingredient_id = ingredients.ingredient_id
  and substitutions.substitute_ingredient_id not like 'custom\_combo\_%' escape '\'
  and position('__' in substitutions.substitute_ingredient_id) = 0;

alter table ingredient_substitutions
  drop constraint if exists ingredient_substitutions_ingredient_uuid_fk;

alter table ingredient_substitutions
  add constraint ingredient_substitutions_ingredient_uuid_fk
  foreign key (ingredient_uuid)
  references ingredients(id)
  on delete cascade;

alter table ingredient_substitutions
  drop constraint if exists ingredient_substitutions_substitute_ingredient_uuid_fk;

alter table ingredient_substitutions
  add constraint ingredient_substitutions_substitute_ingredient_uuid_fk
  foreign key (substitute_ingredient_uuid)
  references ingredients(id)
  on delete cascade;

create index if not exists ingredient_substitutions_ingredient_uuid_idx
  on ingredient_substitutions (ingredient_uuid, context, confidence_score desc)
  where needs_review = false
    and confidence_score >= 0.70
    and substitution_type not in ('alias', 'variety', 'category_mapping');

create index if not exists ingredient_substitutions_substitute_ingredient_uuid_idx
  on ingredient_substitutions (substitute_ingredient_uuid);

alter table ingredient_substitution_components
  add column if not exists component_ingredient_uuid uuid;

update ingredient_substitution_components components
set component_ingredient_uuid = ingredients.id
from ingredients
where components.component_ingredient_uuid is null
  and components.component_ingredient_id = ingredients.ingredient_id;

alter table ingredient_substitution_components
  drop constraint if exists ingredient_substitution_components_component_ingredient_uuid_fk;

alter table ingredient_substitution_components
  add constraint ingredient_substitution_components_component_ingredient_uuid_fk
  foreign key (component_ingredient_uuid)
  references ingredients(id)
  on delete cascade;

create index if not exists ingredient_substitution_components_component_uuid_idx
  on ingredient_substitution_components (component_ingredient_uuid);

alter table ingredient_unit_conversion
  add column if not exists ingredient_uuid uuid;

update ingredient_unit_conversion conversions
set ingredient_uuid = ingredients.id
from ingredients
where conversions.ingredient_uuid is null
  and conversions.ingredient_id = ingredients.ingredient_id;

alter table ingredient_unit_conversion
  drop constraint if exists ingredient_unit_conversion_ingredient_uuid_fk;

alter table ingredient_unit_conversion
  add constraint ingredient_unit_conversion_ingredient_uuid_fk
  foreign key (ingredient_uuid)
  references ingredients(id)
  on delete cascade;

create index if not exists ingredient_unit_conversion_ingredient_uuid_idx
  on ingredient_unit_conversion (ingredient_uuid);

alter table ingredient_storage_life_rules
  add column if not exists ingredient_uuid uuid;

update ingredient_storage_life_rules rules
set ingredient_uuid = ingredients.id
from ingredients
where rules.ingredient_uuid is null
  and rules.ingredient_id = ingredients.ingredient_id;

alter table ingredient_storage_life_rules
  drop constraint if exists ingredient_storage_life_rules_ingredient_uuid_fk;

alter table ingredient_storage_life_rules
  add constraint ingredient_storage_life_rules_ingredient_uuid_fk
  foreign key (ingredient_uuid)
  references ingredients(id)
  on delete cascade;

create index if not exists ingredient_storage_life_rules_ingredient_uuid_idx
  on ingredient_storage_life_rules (active, ingredient_uuid, category, storage_approach, storage_location, priority);

alter table pantry_recipe_ingredients
  add column if not exists canonical_ingredient_uuid uuid;

update pantry_recipe_ingredients recipe_ingredients
set canonical_ingredient_uuid = ingredients.id
from ingredients
where recipe_ingredients.canonical_ingredient_uuid is null
  and recipe_ingredients.canonical_ingredient_id = ingredients.ingredient_id;

alter table pantry_recipe_ingredients
  drop constraint if exists pantry_recipe_ingredients_canonical_ingredient_uuid_fk;

alter table pantry_recipe_ingredients
  add constraint pantry_recipe_ingredients_canonical_ingredient_uuid_fk
  foreign key (canonical_ingredient_uuid)
  references ingredients(id)
  on delete set null;

create index if not exists pantry_recipe_ingredients_canonical_ingredient_uuid_idx
  on pantry_recipe_ingredients (canonical_ingredient_uuid);

alter table unknown_ingredients
  add column if not exists suggested_ingredient_uuid uuid;

update unknown_ingredients unknowns
set suggested_ingredient_uuid = ingredients.id
from ingredients
where unknowns.suggested_ingredient_uuid is null
  and unknowns.suggested_ingredient_id = ingredients.ingredient_id;

alter table unknown_ingredients
  drop constraint if exists unknown_ingredients_suggested_ingredient_uuid_fk;

alter table unknown_ingredients
  add constraint unknown_ingredients_suggested_ingredient_uuid_fk
  foreign key (suggested_ingredient_uuid)
  references ingredients(id)
  on delete set null;

create index if not exists unknown_ingredients_suggested_ingredient_uuid_idx
  on unknown_ingredients (suggested_ingredient_uuid);
