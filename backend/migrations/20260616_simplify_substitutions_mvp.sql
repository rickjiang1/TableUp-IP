alter table ingredient_substitutions add column if not exists context text not null default 'general';
alter table ingredient_substitutions add column if not exists limitations text not null default '';
alter table ingredient_substitutions add column if not exists needs_review boolean not null default false;
alter table ingredient_substitutions add column if not exists review_reason text not null default '';
alter table ingredient_substitutions add column if not exists recommended_substitution_type text not null default '';
alter table ingredient_substitutions add column if not exists recommended_confidence_score numeric;
alter table ingredient_substitutions add column if not exists recommended_action text not null default '';

alter table ingredient_substitutions
  drop constraint if exists ingredient_substitutions_type_check;
alter table ingredient_substitutions
  add constraint ingredient_substitutions_type_check
  check (substitution_type in (
    'exact_equivalent',
    'alias',
    'variety',
    'same_family',
    'flavor_similar',
    'texture_similar',
    'functional',
    'emergency',
    'category_mapping'
  ));

alter table ingredient_substitutions
  drop constraint if exists ingredient_substitutions_context_check;
alter table ingredient_substitutions
  add constraint ingredient_substitutions_context_check
  check (context in (
    'cooking',
    'baking',
    'sauce',
    'soup',
    'salad',
    'stir_fry',
    'marinade',
    'dessert',
    'general'
  ));

alter table ingredient_substitutions
  drop constraint if exists ingredient_substitutions_recommended_action_check;
alter table ingredient_substitutions
  add constraint ingredient_substitutions_recommended_action_check
  check (
    recommended_action = ''
    or recommended_action in (
      'keep',
      'lower_confidence',
      'move_to_aliases',
      'move_to_varieties',
      'remove_from_substitutions',
      'add_context',
      'add_replacement_ratio',
      'manual_review'
    )
  );

alter table ingredient_substitutions
  drop constraint if exists ingredient_substitutions_recommended_score_check;
alter table ingredient_substitutions
  add constraint ingredient_substitutions_recommended_score_check
  check (
    recommended_confidence_score is null
    or (recommended_confidence_score >= 0 and recommended_confidence_score <= 1)
  );

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
    where rel.relname = 'ingredient_substitutions'
      and con.contype = 'f'
      and att.attname = 'substitute_ingredient_id'
  loop
    execute format('alter table ingredient_substitutions drop constraint %I', constraint_name);
  end loop;
end $$;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'ingredient_substitution_components'
      and con.contype = 'f'
      and pg_get_constraintdef(con.oid) ilike '%ingredient_substitution_combinations%'
  loop
    execute format('alter table ingredient_substitution_components drop constraint %I', constraint_name);
  end loop;
end $$;

create index if not exists ingredient_substitutions_mvp_match_idx
  on ingredient_substitutions (ingredient_id, context, confidence_score desc)
  where needs_review = false
    and confidence_score >= 0.70
    and substitution_type not in ('alias', 'variety', 'category_mapping');

comment on table ingredient_substitution_contexts is
  'Deprecated for MVP matching. Context has been folded into ingredient_substitutions.context, notes, and limitations.';

comment on table ingredient_substitution_combinations is
  'Deprecated for MVP matching. Combination substitutes are represented as ingredient_substitutions rows whose substitute_ingredient_id is a custom combo id, with components stored in ingredient_substitution_components.';

comment on column ingredient_substitution_components.combination_id is
  'MVP custom substitute id. This may reference a deprecated ingredient_substitution_combinations row or a custom_combo_* substitute id in ingredient_substitutions.';
