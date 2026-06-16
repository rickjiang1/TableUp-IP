-- Auto-extracted structured combination substitutions from The Food Substitutions Bible.
-- These rows keep formulas as normalized components instead of copying source text.

delete from ingredient_substitution_components
where combination_id in (
  select combination_id
  from ingredient_substitution_combinations
  where source_name = 'The Food Substitutions Bible (auto-extracted)'
);

delete from ingredient_substitution_combinations
where source_name = 'The Food Substitutions Bible (auto-extracted)';

with combos (
  combination_id,
  ingredient_id,
  display_name,
  substitution_score,
  substitution_type,
  replacement_ratio,
  recipe_category,
  notes,
  source_name,
  source_url,
  confidence_level
) as (
  values
    ('allspice__cinnamon_cloves_nutmeg__baking', 'allspice', 'Cinnamon plus cloves plus optional nutmeg', 72, 'flavor_similar', '1 tsp allspice = 1/2 tsp cinnamon plus 1/2 tsp cloves plus pinch nutmeg', 'baking', 'Structured formula extracted from Food Substitutions Bible; review before user-facing display.', 'The Food Substitutions Bible (auto-extracted)', '', 'medium'),
    ('baking_powder__baking_soda_buttermilk__baking', 'baking_powder', 'Baking soda plus buttermilk', 64, 'functional', '1 tsp baking powder = 1/4 tsp baking soda plus 1/2 cup buttermilk; reduce other liquid', 'baking', 'Acid plus baking soda formula. Works only when recipe liquid can be adjusted.', 'The Food Substitutions Bible (auto-extracted)', '', 'medium'),
    ('baking_powder__baking_soda_molasses__baking', 'baking_powder', 'Baking soda plus molasses', 62, 'functional', '1 tsp baking powder = 1/4 tsp baking soda plus 1/4 cup molasses; reduce other liquid', 'baking', 'Acidic sweetener plus baking soda formula; changes sweetness and color.', 'The Food Substitutions Bible (auto-extracted)', '', 'medium'),
    ('cajun_seasoning__paprika_black_pepper_garlic_onion__cooking', 'cajun_seasoning', 'Paprika plus pepper, garlic powder, and onion powder', 68, 'flavor_similar', 'Blend to taste from paprika, black pepper, garlic powder, and onion powder', 'cooking', 'Structured spice blend formula extracted from Food Substitutions Bible.', 'The Food Substitutions Bible (auto-extracted)', '', 'medium'),
    ('chaat_masala__garam_masala_amchur__cooking', 'chaat_masala', 'Garam masala plus amchur', 66, 'flavor_similar', 'Use garam masala plus amchur for a tart spice blend approximation', 'cooking', 'Structured spice blend formula extracted from Food Substitutions Bible.', 'The Food Substitutions Bible (auto-extracted)', '', 'medium'),
    ('chocolate__cocoa_powder_butter__baking', 'chocolate', 'Cocoa powder plus butter', 72, 'functional', '1 oz chocolate = 3 tbsp cocoa powder plus 1 tbsp butter', 'baking', 'Baking chocolate formula; changes sweetness depending on chocolate type.', 'The Food Substitutions Bible (auto-extracted)', '', 'medium'),
    ('cilantro__mint_lemon_juice__cooking', 'cilantro', 'Mint plus lemon juice', 58, 'emergency', 'Use chopped mint plus a dash of lemon juice', 'cooking', 'Emergency fresh herb approximation; flavor changes noticeably.', 'The Food Substitutions Bible (auto-extracted)', '', 'medium'),
    ('garlic_salt__garlic_powder_salt__cooking', 'garlic_salt', 'Garlic powder plus salt', 82, 'functional', '1 tsp garlic salt = 1/4 tsp garlic powder plus 3/4 tsp salt', 'cooking', 'Direct seasoning blend formula.', 'The Food Substitutions Bible (auto-extracted)', '', 'high'),
    ('soy_sauce__kosher_salt_sugar_water__sauce', 'soy_sauce', 'Kosher salt plus sugar in hot water', 46, 'emergency', '1 tbsp soy sauce = scant 3/4 tsp kosher salt plus 1/2 tsp sugar dissolved in 1 tbsp hot water', 'sauce', 'Emergency-only soy sauce approximation; lacks fermented umami.', 'The Food Substitutions Bible (auto-extracted)', '', 'medium'),
    ('tomato__bell_pepper_lemon_juice__cooking', 'tomato', 'Red bell pepper plus lemon juice', 54, 'emergency', '1 lb tomato = 1 lb red bell pepper plus 1 tsp lemon juice', 'cooking', 'Emergency acidity/color approximation; texture and tomato flavor differ.', 'The Food Substitutions Bible (auto-extracted)', '', 'medium')
)
insert into ingredient_substitution_combinations (
  combination_id,
  ingredient_id,
  display_name,
  substitution_score,
  substitution_type,
  replacement_ratio,
  recipe_category,
  notes,
  source_name,
  source_url,
  confidence_level,
  updated_at
)
select
  combos.combination_id,
  combos.ingredient_id,
  combos.display_name,
  combos.substitution_score,
  combos.substitution_type,
  combos.replacement_ratio,
  combos.recipe_category,
  combos.notes,
  combos.source_name,
  combos.source_url,
  combos.confidence_level,
  now()
from combos
where exists (select 1 from ingredients where ingredients.ingredient_id = combos.ingredient_id)
on conflict (combination_id) do update set
  ingredient_id = excluded.ingredient_id,
  display_name = excluded.display_name,
  substitution_score = excluded.substitution_score,
  substitution_type = excluded.substitution_type,
  replacement_ratio = excluded.replacement_ratio,
  recipe_category = excluded.recipe_category,
  notes = excluded.notes,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  confidence_level = excluded.confidence_level,
  active = true,
  updated_at = now();

with components (combination_id, sequence_number, component_ingredient_id, quantity, unit, notes) as (
  values
    ('allspice__cinnamon_cloves_nutmeg__baking', 1, 'cinnamon', 0.5, 'tsp', ''),
    ('allspice__cinnamon_cloves_nutmeg__baking', 2, 'cloves', 0.5, 'tsp', ''),
    ('allspice__cinnamon_cloves_nutmeg__baking', 3, 'nutmeg', null, 'pinch', 'Optional.'),
    ('baking_powder__baking_soda_buttermilk__baking', 1, 'baking_soda', 0.25, 'tsp', ''),
    ('baking_powder__baking_soda_buttermilk__baking', 2, 'buttermilk', 0.5, 'cup', 'Reduce other liquid.'),
    ('baking_powder__baking_soda_molasses__baking', 1, 'baking_soda', 0.25, 'tsp', ''),
    ('baking_powder__baking_soda_molasses__baking', 2, 'molasses', 0.25, 'cup', 'Reduce other liquid.'),
    ('cajun_seasoning__paprika_black_pepper_garlic_onion__cooking', 1, 'paprika', null, 'to taste', ''),
    ('cajun_seasoning__paprika_black_pepper_garlic_onion__cooking', 2, 'black_pepper', null, 'to taste', ''),
    ('cajun_seasoning__paprika_black_pepper_garlic_onion__cooking', 3, 'garlic_powder', null, 'to taste', ''),
    ('cajun_seasoning__paprika_black_pepper_garlic_onion__cooking', 4, 'onion_powder', null, 'to taste', ''),
    ('chaat_masala__garam_masala_amchur__cooking', 1, 'garam_masala', 1.5, 'tsp', ''),
    ('chaat_masala__garam_masala_amchur__cooking', 2, 'amchur', 1, 'tsp', ''),
    ('chocolate__cocoa_powder_butter__baking', 1, 'cocoa_powder', 3, 'tbsp', ''),
    ('chocolate__cocoa_powder_butter__baking', 2, 'butter', 1, 'tbsp', ''),
    ('cilantro__mint_lemon_juice__cooking', 1, 'mint', 1, 'tbsp', 'Use chopped fresh mint.'),
    ('cilantro__mint_lemon_juice__cooking', 2, 'lemon_juice', null, 'dash', ''),
    ('garlic_salt__garlic_powder_salt__cooking', 1, 'garlic_powder', 0.25, 'tsp', ''),
    ('garlic_salt__garlic_powder_salt__cooking', 2, 'salt', 0.75, 'tsp', ''),
    ('soy_sauce__kosher_salt_sugar_water__sauce', 1, 'kosher_salt', 0.75, 'tsp', 'Use scant measure.'),
    ('soy_sauce__kosher_salt_sugar_water__sauce', 2, 'sugar', 0.5, 'tsp', ''),
    ('soy_sauce__kosher_salt_sugar_water__sauce', 3, 'water', 1, 'tbsp', 'Use hot water to dissolve.'),
    ('tomato__bell_pepper_lemon_juice__cooking', 1, 'bell_pepper', 1, 'lb', 'Use red bell pepper when available.'),
    ('tomato__bell_pepper_lemon_juice__cooking', 2, 'lemon_juice', 1, 'tsp', '')
)
insert into ingredient_substitution_components (
  combination_id,
  sequence_number,
  component_ingredient_id,
  quantity,
  unit,
  notes
)
select
  components.combination_id,
  components.sequence_number,
  components.component_ingredient_id,
  components.quantity,
  components.unit,
  components.notes
from components
where exists (
    select 1
    from ingredient_substitution_combinations
    where ingredient_substitution_combinations.combination_id = components.combination_id
  )
  and exists (
    select 1
    from ingredients
    where ingredients.ingredient_id = components.component_ingredient_id
  )
on conflict (combination_id, sequence_number) do update set
  component_ingredient_id = excluded.component_ingredient_id,
  quantity = excluded.quantity,
  unit = excluded.unit,
  notes = excluded.notes;
