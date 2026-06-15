create table if not exists ingredient_storage_life_rules (
  id uuid primary key default gen_random_uuid(),
  ingredient_id text,
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
alter table ingredient_storage_life_rules alter column ingredient_id drop not null;
alter table ingredient_storage_life_rules alter column ingredient_id drop default;

update ingredient_storage_life_rules
set ingredient_id = null
where ingredient_id = ''
   or ingredient_id like '%\_category' escape '\';

with ranked as (
  select
    id,
    row_number() over (
      partition by coalesce(ingredient_id, ''), category, storage_approach, storage_location, condition_state
      order by priority asc, updated_at desc, created_at desc, id
    ) as row_rank
  from ingredient_storage_life_rules
)
delete from ingredient_storage_life_rules
using ranked
where ingredient_storage_life_rules.id = ranked.id
  and ranked.row_rank > 1;

do $$
begin
  if to_regclass('public.ingredients') is not null then
    update ingredient_storage_life_rules rules
    set ingredient_id = null
    where rules.ingredient_id is not null
      and not exists (
        select 1
        from ingredients
        where ingredients.ingredient_id = rules.ingredient_id
      );

    if not exists (
      select 1
      from pg_constraint
      where conname = 'ingredient_storage_life_rules_ingredient_fk'
    ) then
      alter table ingredient_storage_life_rules
        add constraint ingredient_storage_life_rules_ingredient_fk
        foreign key (ingredient_id)
        references ingredients(ingredient_id)
        on delete cascade;
    end if;
  end if;
end $$;

create index if not exists ingredient_storage_life_rules_lookup_idx
  on ingredient_storage_life_rules (active, ingredient_id, category, storage_approach, storage_location, priority);

drop index if exists ingredient_storage_life_rules_unique_idx;
create unique index if not exists ingredient_storage_life_rules_unique_idx
  on ingredient_storage_life_rules (
    coalesce(ingredient_id, ''),
    category,
    storage_approach,
    storage_location,
    condition_state
  );

grant select, insert, update, delete on ingredient_storage_life_rules to anon;
