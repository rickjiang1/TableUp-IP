insert into ingredient_categories (slug, name)
values
  ('protein', 'Protein'),
  ('meat', 'Meat'),
  ('poultry', 'Poultry'),
  ('beef', 'Beef'),
  ('pork', 'Pork'),
  ('seafood', 'Seafood'),
  ('dairy', 'Dairy'),
  ('vegetable', 'Vegetable'),
  ('root_vegetable', 'Root vegetable'),
  ('leafy_green', 'Leafy green'),
  ('aromatic', 'Aromatic'),
  ('herb', 'Herb'),
  ('fruit', 'Fruit'),
  ('grain', 'Grain'),
  ('pantry', 'Pantry'),
  ('oil_fat', 'Oil and fat'),
  ('sauce_condiment', 'Sauce and condiment'),
  ('sweetener', 'Sweetener'),
  ('flour_starch', 'Flour and starch')
on conflict (slug) do update set
  name = excluded.name,
  updated_at = now();

update ingredient_categories child
set parent_category_id = parent.id,
    updated_at = now()
from ingredient_categories parent
where (child.slug, parent.slug) in (
  values
    ('meat', 'protein'),
    ('poultry', 'meat'),
    ('beef', 'meat'),
    ('pork', 'meat'),
    ('seafood', 'protein'),
    ('root_vegetable', 'vegetable'),
    ('leafy_green', 'vegetable'),
    ('aromatic', 'vegetable'),
    ('herb', 'vegetable'),
    ('oil_fat', 'pantry'),
    ('sauce_condiment', 'pantry'),
    ('sweetener', 'pantry'),
    ('flour_starch', 'pantry')
);

update ingredients
set category_id = categories.id,
    subcategory_id = categories.id
from ingredient_categories categories
where categories.slug = case
  when ingredients.category in ('protein', 'meat') then 'meat'
  when ingredients.category in ('seafood') then 'seafood'
  when ingredients.category in ('dairy') then 'dairy'
  when ingredients.category in ('vegetable') then 'vegetable'
  when ingredients.category in ('aromatic') then 'aromatic'
  when ingredients.category in ('herb') then 'herb'
  when ingredients.category in ('fruit') then 'fruit'
  when ingredients.category in ('grain') then 'grain'
  when ingredients.category in ('pantry', 'seasoning') then 'pantry'
  else 'pantry'
end;

update ingredients
set subcategory_id = categories.id
from ingredient_categories categories
where categories.slug = case
  when ingredient_slug like '%chicken%' or ingredient_slug like '%turkey%' or ingredient_slug like '%duck%' then 'poultry'
  when ingredient_slug like '%beef%' or ingredient_slug like '%steak%' or ingredient_slug like '%brisket%' or ingredient_slug like '%rib%' then 'beef'
  when ingredient_slug like '%pork%' or ingredient_slug like '%bacon%' or ingredient_slug like '%ham%' then 'pork'
  when ingredient_slug like '%shrimp%' or ingredient_slug like '%fish%' or ingredient_slug like '%salmon%' or ingredient_slug like '%cod%' or ingredient_slug like '%crab%' then 'seafood'
  when ingredient_slug in ('carrot', 'potato', 'sweet_potato', 'turnip', 'radish', 'daikon', 'beet') then 'root_vegetable'
  when ingredient_slug in ('spinach', 'lettuce', 'bok_choy', 'shanghai_bok_choy', 'cabbage', 'kale') then 'leafy_green'
  when ingredient_slug in ('garlic', 'onion', 'scallion', 'ginger', 'shallot', 'leek') then 'aromatic'
  when ingredient_slug in ('cilantro', 'parsley', 'basil', 'mint', 'dill', 'thyme', 'rosemary') then 'herb'
  when ingredient_slug in ('oil', 'olive_oil', 'vegetable_oil', 'sesame_oil', 'butter') then 'oil_fat'
  when ingredient_slug in ('soy_sauce', 'vinegar', 'oyster_sauce', 'fish_sauce', 'hoisin_sauce') then 'sauce_condiment'
  when ingredient_slug in ('sugar', 'brown_sugar', 'honey', 'maple_syrup') then 'sweetener'
  when ingredient_slug in ('flour', 'cornstarch', 'potato_starch') then 'flour_starch'
  else null
end
and categories.slug is not null;

insert into ingredient_tags (slug, name, tag_type)
values
  ('dairy', 'Dairy', 'nutrition'),
  ('meat', 'Meat', 'nutrition'),
  ('seafood', 'Seafood', 'nutrition'),
  ('plant_based', 'Plant based', 'nutrition'),
  ('liquid', 'Liquid', 'form'),
  ('solid', 'Solid', 'form'),
  ('powder', 'Powder', 'form'),
  ('leafy', 'Leafy', 'form'),
  ('creamy', 'Creamy', 'texture'),
  ('thick', 'Thick', 'texture'),
  ('crisp', 'Crisp', 'texture'),
  ('tender', 'Tender', 'texture'),
  ('fatty', 'Fatty', 'texture'),
  ('lean', 'Lean', 'texture'),
  ('acidic', 'Acidic', 'flavor'),
  ('sweet', 'Sweet', 'flavor'),
  ('savory', 'Savory', 'flavor'),
  ('umami', 'Umami', 'flavor'),
  ('aromatic', 'Aromatic', 'flavor'),
  ('herbal', 'Herbal', 'flavor'),
  ('salty', 'Salty', 'flavor'),
  ('thickener', 'Thickener', 'function'),
  ('emulsifier', 'Emulsifier', 'function'),
  ('binder', 'Binder', 'function'),
  ('leavening_support', 'Leavening support', 'function'),
  ('stir_fry', 'Stir fry', 'cooking_role'),
  ('soup', 'Soup', 'cooking_role'),
  ('sauce', 'Sauce', 'cooking_role'),
  ('salad', 'Salad', 'cooking_role'),
  ('baking', 'Baking', 'cooking_role'),
  ('marinade', 'Marinade', 'cooking_role')
on conflict (slug) do update set
  name = excluded.name,
  tag_type = excluded.tag_type,
  updated_at = now();

with profile_rows (ingredient_slug, tag_slug, weight, notes) as (
  values
    ('heavy_cream', 'dairy', 1.0, 'Dairy substitute scoring'),
    ('heavy_cream', 'liquid', 0.9, 'Pourable'),
    ('heavy_cream', 'creamy', 1.0, 'Creamy texture'),
    ('heavy_cream', 'fatty', 1.0, 'High fat'),
    ('heavy_cream', 'sauce', 0.8, 'Sauce friendly'),
    ('heavy_cream', 'soup', 0.8, 'Soup friendly'),
    ('milk', 'dairy', 1.0, 'Dairy substitute scoring'),
    ('milk', 'liquid', 1.0, 'Pourable'),
    ('milk', 'creamy', 0.45, 'Mild creaminess'),
    ('milk', 'sauce', 0.6, 'Sauce use'),
    ('milk', 'soup', 0.7, 'Soup use'),
    ('greek_yogurt', 'dairy', 1.0, 'Dairy substitute scoring'),
    ('greek_yogurt', 'creamy', 0.9, 'Creamy'),
    ('greek_yogurt', 'thick', 0.9, 'Thick'),
    ('greek_yogurt', 'acidic', 0.8, 'Tangy'),
    ('butter', 'dairy', 0.7, 'Dairy fat'),
    ('butter', 'fatty', 1.0, 'Fat source'),
    ('butter', 'solid', 0.8, 'Solid fat'),
    ('oil', 'fatty', 0.9, 'Fat source'),
    ('oil', 'liquid', 0.8, 'Liquid fat'),
    ('olive_oil', 'fatty', 0.9, 'Fat source'),
    ('olive_oil', 'liquid', 0.8, 'Liquid fat'),
    ('garlic', 'aromatic', 1.0, 'Aromatic base'),
    ('garlic', 'savory', 0.8, 'Savory'),
    ('onion', 'aromatic', 1.0, 'Aromatic base'),
    ('onion', 'sweet', 0.5, 'Sweet when cooked'),
    ('shallot', 'aromatic', 1.0, 'Aromatic base'),
    ('shallot', 'sweet', 0.6, 'Sweet aromatic'),
    ('scallion', 'aromatic', 0.8, 'Mild allium'),
    ('scallion', 'herbal', 0.5, 'Fresh garnish'),
    ('cilantro', 'herbal', 1.0, 'Fresh herb'),
    ('cilantro', 'salad', 0.7, 'Fresh use'),
    ('parsley', 'herbal', 1.0, 'Fresh herb'),
    ('parsley', 'salad', 0.7, 'Fresh use'),
    ('chicken_breast', 'meat', 1.0, 'Protein'),
    ('chicken_breast', 'lean', 1.0, 'Lean cut'),
    ('chicken_breast', 'tender', 0.5, 'Can be tender'),
    ('chicken_breast', 'stir_fry', 0.8, 'Stir fry use'),
    ('chicken_thigh', 'meat', 1.0, 'Protein'),
    ('chicken_thigh', 'fatty', 0.8, 'Higher fat'),
    ('chicken_thigh', 'tender', 0.8, 'Tender cut'),
    ('chicken_thigh', 'stir_fry', 0.8, 'Stir fry use'),
    ('beef_short_rib', 'meat', 1.0, 'Protein'),
    ('beef_short_rib', 'fatty', 0.9, 'Rich cut'),
    ('beef_short_rib', 'tender', 0.5, 'Tender after slow cook'),
    ('ground_beef', 'meat', 1.0, 'Protein'),
    ('ground_beef', 'fatty', 0.6, 'Variable fat'),
    ('shrimp', 'seafood', 1.0, 'Seafood'),
    ('shrimp', 'tender', 0.7, 'Quick cooking'),
    ('salmon', 'seafood', 1.0, 'Seafood'),
    ('salmon', 'fatty', 0.8, 'Fatty fish'),
    ('flour', 'powder', 1.0, 'Dry powder'),
    ('flour', 'binder', 0.8, 'Baking structure'),
    ('flour', 'baking', 1.0, 'Baking use'),
    ('cornstarch', 'powder', 1.0, 'Dry powder'),
    ('cornstarch', 'thickener', 1.0, 'Thickens sauces'),
    ('sugar', 'sweet', 1.0, 'Sweetener'),
    ('honey', 'sweet', 1.0, 'Sweetener'),
    ('soy_sauce', 'salty', 0.8, 'Salty condiment'),
    ('soy_sauce', 'umami', 1.0, 'Umami condiment'),
    ('salt', 'salty', 1.0, 'Salt')
)
insert into ingredient_functional_profiles (ingredient_id, tag_id, weight, source, notes, updated_at)
select ingredients.ingredient_id, tags.id, profile_rows.weight, 'mvp_seed', profile_rows.notes, now()
from profile_rows
join ingredients on ingredients.ingredient_slug = profile_rows.ingredient_slug
join ingredient_tags tags on tags.slug = profile_rows.tag_slug
on conflict (ingredient_id, tag_id) do update set
  weight = excluded.weight,
  source = excluded.source,
  notes = excluded.notes,
  updated_at = now();

with rule_rows (source_slug, target_slug, context, base_score, notes) as (
  values
    ('dairy', 'dairy', 'general', 0.78, 'Dairy-to-dairy dynamic substitute candidates'),
    ('dairy', 'dairy', 'soup', 0.82, 'Dairy in soup is often flexible'),
    ('dairy', 'dairy', 'sauce', 0.80, 'Dairy in sauce is often flexible'),
    ('dairy', 'dairy', 'baking', 0.65, 'Baking dairy substitutions need caution'),
    ('aromatic', 'aromatic', 'general', 0.80, 'Allium/aromatic substitutions are usually acceptable'),
    ('herb', 'herb', 'general', 0.72, 'Fresh herb substitutions are context-sensitive'),
    ('herb', 'herb', 'salad', 0.78, 'Fresh herb salad substitutions'),
    ('poultry', 'poultry', 'general', 0.78, 'Poultry cuts may substitute with cooking adjustment'),
    ('beef', 'beef', 'general', 0.74, 'Beef cuts require cooking-time awareness'),
    ('seafood', 'seafood', 'general', 0.70, 'Seafood substitutions require texture and cooking-time awareness'),
    ('oil_fat', 'oil_fat', 'general', 0.82, 'Fats and oils often substitute by function'),
    ('sweetener', 'sweetener', 'general', 0.76, 'Sweeteners substitute with sweetness/moisture caveats'),
    ('flour_starch', 'flour_starch', 'sauce', 0.78, 'Starches/flours for thickening'),
    ('root_vegetable', 'root_vegetable', 'soup', 0.66, 'Root vegetables may work in soup but should not auto-match strongly')
)
insert into substitution_rules (source_category_id, target_category_id, context, base_score, notes, updated_at)
select source.id, target.id, rule_rows.context, rule_rows.base_score, rule_rows.notes, now()
from rule_rows
join ingredient_categories source on source.slug = rule_rows.source_slug
join ingredient_categories target on target.slug = rule_rows.target_slug
on conflict (source_category_id, target_category_id, context) do update set
  base_score = excluded.base_score,
  notes = excluded.notes,
  updated_at = now();

delete from verified_substitutions
where source_name = 'TableUp verified';

with verified_rows (ingredient_slug, substitute_slug, context, confidence_score, replacement_ratio, notes, source_name, source_url) as (
  values
    ('scallion', 'green_onion', 'general', 1.00, '1:1', 'Exact naming equivalent if both ingredients exist separately; prefer alias when possible.', 'TableUp verified', ''),
    ('chicken_thigh', 'chicken_breast', 'general', 0.80, '1:1 by weight', 'Leaner and easier to overcook; reduce cooking time.', 'TableUp verified', ''),
    ('chicken_breast', 'chicken_thigh', 'general', 0.82, '1:1 by weight', 'Richer and may need slightly longer cooking.', 'TableUp verified', ''),
    ('cilantro', 'parsley', 'salad', 0.72, '1:1', 'Different flavor but acceptable fresh herb emergency substitute.', 'TableUp verified', ''),
    ('heavy_cream', 'milk', 'soup', 0.68, '1:1', 'Lighter body and lower fat; not suitable for whipping.', 'TableUp verified', ''),
    ('heavy_cream', 'greek_yogurt', 'sauce', 0.70, '1:1', 'Tangier and thicker; add off heat to avoid splitting.', 'TableUp verified', ''),
    ('butter', 'oil', 'general', 0.74, '3:2 oil to butter by volume', 'Works for sauteing; not a perfect baking replacement.', 'TableUp verified', ''),
    ('cornstarch', 'flour', 'sauce', 0.72, '2 tbsp flour for 1 tbsp cornstarch', 'Flour thickens less efficiently and can taste raw if undercooked.', 'TableUp verified', '')
)
insert into verified_substitutions (
  ingredient_id, substitute_ingredient_id, context, confidence_score,
  replacement_ratio, notes, source_name, source_url, updated_at
)
select ingredient.ingredient_id, substitute.ingredient_id, verified_rows.context, verified_rows.confidence_score,
  verified_rows.replacement_ratio, verified_rows.notes, verified_rows.source_name, verified_rows.source_url, now()
from verified_rows
join ingredients ingredient on ingredient.ingredient_slug = verified_rows.ingredient_slug
join ingredients substitute on substitute.ingredient_slug = verified_rows.substitute_slug
on conflict do nothing;

insert into verified_substitutions (
  ingredient_id, substitute_combo_slug, context, confidence_score,
  replacement_ratio, notes, source_name, source_url, updated_at
)
select ingredients.ingredient_id, combo.combo_slug, combo.context, combo.confidence_score,
  combo.replacement_ratio, combo.notes, combo.source_name, combo.source_url, now()
from (
  values
    ('buttermilk', 'combo_buttermilk_milk_lemon_juice', 'baking', 0.90, '1 cup buttermilk = 1 cup milk + 1 tbsp lemon juice, rested 5 minutes', 'Verified common baking substitute.', 'TableUp verified', ''),
    ('heavy_cream', 'combo_heavy_cream_milk_butter', 'sauce', 0.78, '1 cup heavy cream = 3/4 cup milk + 1/4 cup melted butter', 'Works for sauces and cooking; not for whipped cream.', 'TableUp verified', '')
) as combo(ingredient_slug, combo_slug, context, confidence_score, replacement_ratio, notes, source_name, source_url)
join ingredients on ingredients.ingredient_slug = combo.ingredient_slug
on conflict do nothing;
