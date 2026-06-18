create index if not exists pantry_recipes_active_updated_name_idx
  on pantry_recipes (active, updated_at desc, name asc);

create index if not exists pantry_recipe_ingredients_recipe_sort_idx
  on pantry_recipe_ingredients (recipe_id, sort_order, ingredient_id);

create index if not exists pantry_recipe_steps_recipe_sort_idx
  on pantry_recipe_steps (recipe_id, step_order, step_id);

create index if not exists ingredients_category_name_idx
  on ingredients (category, canonical_name);

create index if not exists ingredient_aliases_language_verified_ingredient_idx
  on ingredient_aliases (language, verified, ingredient_id, alias_name);

create index if not exists ingredient_aliases_alias_name_idx
  on ingredient_aliases (alias_name);

create index if not exists unknown_ingredients_pending_lookup_idx
  on unknown_ingredients (status, source, last_seen_at desc)
  where status = 'pending';

create index if not exists unknown_ingredients_pending_name_source_idx
  on unknown_ingredients (normalized_name, source)
  where status = 'pending';

create index if not exists unit_aliases_language_unit_alias_idx
  on unit_aliases (language, unit, alias);

create index if not exists verified_substitutions_active_lookup_idx
  on verified_substitutions (active, ingredient_id, context, confidence_score desc)
  where active = true;

create index if not exists substitution_rules_context_lookup_idx
  on substitution_rules (context, source_category_id, target_category_id);
