import { existsSync, readFileSync } from "node:fs";
import { query } from "./postgres.js";

loadEnv("prod");
assertProd();

await query(`
create extension if not exists pgcrypto;

update ingredient_aliases aliases
set ingredient_uuid = ingredients.id
from ingredients
where aliases.ingredient_uuid is null
  and aliases.ingredient_id = ingredients.ingredient_id;

update ingredient_storage_life_rules rules
set ingredient_uuid = ingredients.id
from ingredients
where rules.ingredient_uuid is null
  and rules.ingredient_id = ingredients.ingredient_id;

update ingredient_unit_conversion conversions
set ingredient_uuid = ingredients.id
from ingredients
where conversions.ingredient_uuid is null
  and conversions.ingredient_id = ingredients.ingredient_id;

update pantry_recipe_ingredients recipe_ingredients
set canonical_ingredient_uuid = ingredients.id
from ingredients
where recipe_ingredients.canonical_ingredient_uuid is null
  and recipe_ingredients.canonical_ingredient_id = ingredients.ingredient_id;

update unknown_ingredients unknowns
set suggested_ingredient_uuid = ingredients.id
from ingredients
where unknowns.suggested_ingredient_uuid is null
  and unknowns.suggested_ingredient_id = ingredients.ingredient_id;

do $$
declare item record;
begin
  for item in
    select con.conname, rel.relname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where con.contype = 'f'
      and con.confrelid = 'public.ingredients'::regclass
  loop
    execute format('alter table %I drop constraint %I', item.relname, item.conname);
  end loop;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingredients' and column_name='id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingredients' and column_name='ingredient_id' and udt_name <> 'uuid') then
    alter table ingredients rename column ingredient_id to ingredient_slug;
    alter table ingredients rename column id to ingredient_id;
  end if;
end $$;

alter table ingredients drop constraint if exists ingredients_pkey;
alter table ingredients drop constraint if exists ingredients_ingredient_id_pkey;
alter table ingredients add constraint ingredients_ingredient_id_pkey primary key (ingredient_id);
create unique index if not exists ingredients_ingredient_slug_unique_idx on ingredients (ingredient_slug);

alter table ingredient_aliases drop constraint if exists ingredient_aliases_ingredient_id_fkey;
alter table ingredient_aliases drop constraint if exists ingredient_aliases_ingredient_uuid_fk;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingredient_aliases' and column_name='ingredient_uuid')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingredient_aliases' and column_name='ingredient_id' and udt_name <> 'uuid') then
    alter table ingredient_aliases rename column ingredient_id to ingredient_slug;
    alter table ingredient_aliases rename column ingredient_uuid to ingredient_id;
  end if;
end $$;
alter table ingredient_aliases add constraint ingredient_aliases_ingredient_id_fk foreign key (ingredient_id) references ingredients(ingredient_id) on delete cascade;

alter table ingredient_storage_life_rules drop constraint if exists ingredient_storage_life_rules_ingredient_fk;
alter table ingredient_storage_life_rules drop constraint if exists ingredient_storage_life_rules_ingredient_uuid_fk;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingredient_storage_life_rules' and column_name='ingredient_uuid')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingredient_storage_life_rules' and column_name='ingredient_id' and udt_name <> 'uuid') then
    alter table ingredient_storage_life_rules rename column ingredient_id to ingredient_slug;
    alter table ingredient_storage_life_rules rename column ingredient_uuid to ingredient_id;
  end if;
end $$;
alter table ingredient_storage_life_rules add constraint ingredient_storage_life_rules_ingredient_id_fk foreign key (ingredient_id) references ingredients(ingredient_id) on delete cascade;

alter table ingredient_unit_conversion drop constraint if exists ingredient_unit_conversion_ingredient_id_fkey;
alter table ingredient_unit_conversion drop constraint if exists ingredient_unit_conversion_ingredient_uuid_fk;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingredient_unit_conversion' and column_name='ingredient_uuid')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingredient_unit_conversion' and column_name='ingredient_id' and udt_name <> 'uuid') then
    update ingredient_unit_conversion set ingredient_slug = ingredient_id where ingredient_slug is null or ingredient_slug = '';
    alter table ingredient_unit_conversion drop column ingredient_id;
    alter table ingredient_unit_conversion rename column ingredient_uuid to ingredient_id;
  end if;
end $$;
alter table ingredient_unit_conversion add constraint ingredient_unit_conversion_ingredient_id_fk foreign key (ingredient_id) references ingredients(ingredient_id) on delete cascade;
drop index if exists ingredient_unit_conversion_unique_rule_idx;
create unique index if not exists ingredient_unit_conversion_unique_rule_idx on ingredient_unit_conversion (ingredient_id, from_unit, to_unit);

alter table pantry_recipe_ingredients drop constraint if exists pantry_recipe_ingredients_canonical_ingredient_uuid_fk;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pantry_recipe_ingredients' and column_name='canonical_ingredient_uuid')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='pantry_recipe_ingredients' and column_name='canonical_ingredient_id' and udt_name <> 'uuid') then
    alter table pantry_recipe_ingredients rename column canonical_ingredient_id to canonical_ingredient_slug;
    alter table pantry_recipe_ingredients rename column canonical_ingredient_uuid to canonical_ingredient_id;
  end if;
end $$;
alter table pantry_recipe_ingredients add constraint pantry_recipe_ingredients_canonical_ingredient_id_fk foreign key (canonical_ingredient_id) references ingredients(ingredient_id) on delete set null;

alter table unknown_ingredients drop constraint if exists unknown_ingredients_suggested_ingredient_uuid_fk;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='unknown_ingredients' and column_name='suggested_ingredient_uuid')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='unknown_ingredients' and column_name='suggested_ingredient_id' and udt_name <> 'uuid') then
    alter table unknown_ingredients rename column suggested_ingredient_id to suggested_ingredient_slug;
    alter table unknown_ingredients rename column suggested_ingredient_uuid to suggested_ingredient_id;
  end if;
end $$;
alter table unknown_ingredients add constraint unknown_ingredients_suggested_ingredient_id_fk foreign key (suggested_ingredient_id) references ingredients(ingredient_id) on delete set null;
`);

console.log(JSON.stringify({ repaired: true }, null, 2));

function loadEnv(environment) {
  const paths = [
    new URL("../.env", import.meta.url),
    new URL(`../.env.${environment}`, import.meta.url),
    new URL(`../.env.${environment}.local`, import.meta.url)
  ];

  for (const envPath of paths) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (key) process.env[key] = value;
    }
  }
}

function assertProd() {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "";
  const host = new URL(databaseUrl).host;
  if (!host.startsWith("db.oapybkblltlyugmmtqjr.")) {
    throw new Error(`Refusing to repair PROD. SUPABASE_DATABASE_URL points to ${host}.`);
  }
}
