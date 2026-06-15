insert into ingredients (ingredient_id, canonical_name, category, canonical_unit)
values
  ('cake_flour', 'Cake flour', 'grain', 'gram'),
  ('brown_sugar', 'Brown sugar', 'pantry', 'gram'),
  ('molasses', 'Molasses', 'pantry', 'ml'),
  ('flaxseed', 'Flaxseed', 'pantry', 'gram'),
  ('water', 'Water', 'pantry', 'ml'),
  ('shortening', 'Shortening', 'pantry', 'gram')
on conflict (ingredient_id) do nothing;

delete from ingredient_substitutions
where source_name = '';

with rows (
  ingredient_id,
  substitute_ingredient_id,
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
    ('soy_sauce', 'tamari', 90, 'flavor_similar', 'Start 1:1, then adjust salt to taste', 'sauce', 'Both provide salty umami. Tamari is often thicker, mellower, and can be less salty, so seasoning may need adjustment.', 'Serious Eats', 'https://www.seriouseats.com/tamari-vs-soy-sauce-11987350', 'high'),
    ('tamari', 'soy_sauce', 85, 'flavor_similar', 'Start with 1/2 soy sauce, then adjust to taste', 'sauce', 'Soy sauce can replace tamari, but it may taste saltier and sharper; not suitable when gluten-free is required.', 'Serious Eats', 'https://www.seriouseats.com/tamari-vs-soy-sauce-11987350', 'high'),
    ('chicken_stock', 'chicken_broth', 82, 'functional', '1:1', 'soup', 'Works for lighter soups, rice, and general cooking, but broth lacks the gelatin/body expected in reduced sauces.', 'Serious Eats', 'https://www.seriouseats.com/chicken-stock-vs-broth-11899112', 'high'),
    ('chicken_broth', 'chicken_stock', 86, 'functional', '1:1; dilute if too gelatinous or intense', 'soup', 'Stock can replace broth in many pragmatic uses, but may add body and richness beyond a light broth.', 'Serious Eats', 'https://www.seriouseats.com/chicken-stock-vs-broth-11899112', 'high'),
    ('chicken_stock', 'vegetable_stock', 62, 'emergency', '1:1', 'soup', 'Acceptable when chicken flavor is not central; loses collagen/body and poultry flavor.', 'Serious Eats', 'https://www.seriouseats.com/save-your-vegetable-scraps-make-stock', 'medium'),

    ('onion', 'shallot', 84, 'same_family', '1 small shallot for about 1/2 onion; scale by taste', 'cooking', 'Shallots can stand in for smaller amounts of onion, especially cooked; they are milder, sweeter, and more delicate.', 'Serious Eats', 'https://www.seriouseats.com/difference-between-shallots-and-onions-11976289', 'high'),
    ('shallot', 'onion', 74, 'same_family', 'Use red onion plus a little garlic, or sweet onion, to approximate shallot', 'cooking', 'Onion can replace shallot but tastes stronger and has more bite, especially raw.', 'Serious Eats', 'https://www.seriouseats.com/difference-between-shallots-and-onions-11976289', 'high'),
    ('shallot', 'red_onion', 76, 'same_family', '1:1 by volume, use less for raw applications', 'cooking', 'Red onion is specifically useful when replacing shallot, though stronger; a little garlic can approximate shallot complexity.', 'Serious Eats', 'https://www.seriouseats.com/difference-between-shallots-and-onions-11976289', 'high'),
    ('onion', 'red_onion', 92, 'exact_equivalent', '1:1', 'cooking', 'Same core ingredient family; choose based on raw bite, color, and flavor intensity.', 'Serious Eats', 'https://www.seriouseats.com/difference-between-shallots-and-onions-11976289', 'medium'),

    ('chicken_thigh', 'chicken_breast', 70, 'same_family', '1:1 by weight; reduce cooking time and protect from drying', 'protein', 'Breast is leaner and less forgiving than thigh. Works in many dishes but can dry out in longer cooking.', 'Serious Eats', 'https://www.seriouseats.com/chicken-thigh-recipes', 'medium'),
    ('chicken_breast', 'chicken_thigh', 82, 'same_family', '1:1 by weight; allow extra cooking time if bone-in or skin-on', 'protein', 'Thighs are flavorful and forgiving for braises, baking, frying, and grilling, but add dark-meat flavor and fat.', 'Serious Eats', 'https://www.seriouseats.com/chicken-thigh-recipes', 'medium'),

    ('buttermilk', 'plain_yogurt', 88, 'functional', '1:1, thin with milk or water if too thick', 'baking', 'Cultured dairy is the preferred substitute class because it contributes acidity, tang, and body.', 'Southern Living', 'https://www.southernliving.com/best-buttermilk-substitutes-8769327', 'high'),
    ('buttermilk', 'sour_cream', 84, 'functional', '1:1 after thinning to pourable consistency', 'baking', 'Sour cream can replace buttermilk when thinned; it preserves cultured dairy acidity better than plain milk.', 'Southern Living', 'https://www.southernliving.com/best-buttermilk-substitutes-8769327', 'high'),
    ('sour_cream', 'plain_yogurt', 82, 'functional', '1:1', 'baking', 'Plain yogurt can replace sour cream in baking where tang and dairy body are needed.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),

    ('baking_soda', 'baking_powder', 50, 'emergency', '3 tsp baking powder for 1 tsp baking soda', 'baking', 'Emergency leavening swap; baking powder is weaker and already contains acid, so final flavor/texture can change.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('cake_flour', 'flour', 72, 'functional', '1 cup cake flour = 1 cup minus 2 tbsp all-purpose flour', 'baking', 'Acceptable in a pinch but higher protein can make cakes less tender.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('cornstarch', 'flour', 68, 'functional', '1 tbsp cornstarch = 2 tbsp all-purpose flour for thickening', 'sauce', 'Works as a thickener replacement but can produce a different opacity and texture.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('white_vinegar', 'lemon_juice', 70, 'flavor_similar', '1 tsp white vinegar = 1 tsp lemon/lime juice in small amounts', 'sauce', 'Useful for acidity in small quantities; fruit flavor may be noticeable.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('butter', 'shortening', 62, 'functional', '1 cup butter = 1 cup shortening plus 1/4 tsp salt', 'baking', 'Shortening can replace butter structurally, but loses butter flavor and water content.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('butter', 'oil', 52, 'emergency', '1 tbsp butter = about 1 tbsp neutral oil for sauteing only', 'cooking', 'Works for cooking fat, not for butter-forward flavor or baking structure.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('oil', 'olive_oil', 82, 'same_family', '1:1 where olive flavor is acceptable', 'cooking', 'Olive oil can replace generic cooking oil in many applications but changes flavor and smoke-point behavior.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('sugar', 'brown_sugar', 72, 'flavor_similar', '1 cup granulated sugar = 1 cup packed brown sugar in many baked goods', 'baking', 'Brown sugar adds molasses flavor and moisture; texture/color can change.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('corn_syrup', 'sugar', 60, 'functional', '1 cup corn syrup = 1 cup sugar plus 1/4 cup water', 'baking', 'Emergency syrup replacement; sweetness and crystallization behavior differ.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('honey', 'sugar', 55, 'emergency', '1 cup honey = about 1 1/4 cups sugar plus 1/4 cup water when reversing BHG sugar-to-honey guidance', 'baking', 'Emergency sweetness replacement; flavor, browning, and moisture change.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium')
)
insert into ingredient_substitutions (
  ingredient_id,
  substitute_ingredient_id,
  confidence_score,
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
  rows.ingredient_id,
  rows.substitute_ingredient_id,
  rows.substitution_score / 100.0,
  rows.substitution_score,
  rows.substitution_type,
  rows.replacement_ratio,
  rows.recipe_category,
  rows.notes,
  rows.source_name,
  rows.source_url,
  rows.confidence_level,
  now()
from rows
where exists (select 1 from ingredients where ingredients.ingredient_id = rows.ingredient_id)
  and exists (select 1 from ingredients where ingredients.ingredient_id = rows.substitute_ingredient_id)
on conflict (ingredient_id, substitute_ingredient_id, recipe_category) do update set
  confidence_score = excluded.confidence_score,
  substitution_score = excluded.substitution_score,
  substitution_type = excluded.substitution_type,
  replacement_ratio = excluded.replacement_ratio,
  notes = excluded.notes,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  confidence_level = excluded.confidence_level,
  updated_at = now();

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
    ('buttermilk__milk_lemon_juice__baking', 'buttermilk', 'Milk plus lemon juice', 72, 'functional', '1 cup buttermilk = 1 tbsp lemon juice plus enough milk to make 1 cup; stand 5 minutes', 'baking', 'Acceptable in a pinch; Southern Living prefers cultured dairy, so this is scored below yogurt/sour cream.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('buttermilk__milk_white_vinegar__baking', 'buttermilk', 'Milk plus white vinegar', 72, 'functional', '1 cup buttermilk = 1 tbsp white vinegar plus enough milk to make 1 cup; stand 5 minutes', 'baking', 'Acceptable in a pinch; provides acid but less cultured dairy body and flavor.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('baking_powder__cream_of_tartar_baking_soda__baking', 'baking_powder', 'Cream of tartar plus baking soda', 84, 'functional', '1 tsp baking powder = 1/2 tsp cream of tartar plus 1/4 tsp baking soda', 'baking', 'Functional homemade leavening substitute.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('brown_sugar__sugar_molasses__baking', 'brown_sugar', 'Granulated sugar plus molasses', 86, 'functional', '1 cup packed brown sugar = 1 cup granulated sugar plus 2 tbsp molasses', 'baking', 'Strong functional substitute for brown sugar flavor and moisture.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('cake_flour__flour_cornstarch__baking', 'cake_flour', 'All-purpose flour plus cornstarch', 80, 'functional', 'Common method: replace 2 tbsp per cup flour with cornstarch, then sift; use when cake flour is unavailable', 'baking', 'Functional approximation intended to lower protein effect and improve tenderness.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('egg__flaxseed_water__baking', 'egg', 'Ground flaxseed plus water', 58, 'emergency', '1 egg = 1 tbsp ground flaxseed plus 3 tbsp water', 'baking', 'Vegan/emergency binder; not equivalent for egg-forward recipes or aeration.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium')
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
    ('buttermilk__milk_lemon_juice__baking', 1, 'lemon_juice', 1, 'tbsp', 'Add acid first.'),
    ('buttermilk__milk_lemon_juice__baking', 2, 'milk', null, 'to make 1 cup', 'Let stand 5 minutes.'),
    ('buttermilk__milk_white_vinegar__baking', 1, 'white_vinegar', 1, 'tbsp', 'Add acid first.'),
    ('buttermilk__milk_white_vinegar__baking', 2, 'milk', null, 'to make 1 cup', 'Let stand 5 minutes.'),
    ('baking_powder__cream_of_tartar_baking_soda__baking', 1, 'cream_of_tartar', 0.5, 'tsp', ''),
    ('baking_powder__cream_of_tartar_baking_soda__baking', 2, 'baking_soda', 0.25, 'tsp', ''),
    ('brown_sugar__sugar_molasses__baking', 1, 'sugar', 1, 'cup', ''),
    ('brown_sugar__sugar_molasses__baking', 2, 'molasses', 2, 'tbsp', ''),
    ('cake_flour__flour_cornstarch__baking', 1, 'flour', 0.875, 'cup', '1 cup minus 2 tbsp.'),
    ('cake_flour__flour_cornstarch__baking', 2, 'cornstarch', 2, 'tbsp', 'Sift with flour.'),
    ('egg__flaxseed_water__baking', 1, 'flaxseed', 1, 'tbsp', 'Use ground flaxseed.'),
    ('egg__flaxseed_water__baking', 2, 'water', 3, 'tbsp', 'Rest until gelled.')
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
