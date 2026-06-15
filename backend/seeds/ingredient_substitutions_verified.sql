insert into ingredients (ingredient_id, canonical_name, category, canonical_unit)
values
  ('cake_flour', 'Cake flour', 'grain', 'gram'),
  ('brown_sugar', 'Brown sugar', 'pantry', 'gram'),
  ('molasses', 'Molasses', 'pantry', 'ml'),
  ('flaxseed', 'Flaxseed', 'pantry', 'gram'),
  ('water', 'Water', 'pantry', 'ml'),
  ('shortening', 'Shortening', 'pantry', 'gram'),
  ('vanilla_bean', 'Vanilla bean', 'pantry', 'piece'),
  ('semisweet_chocolate', 'Semisweet chocolate', 'pantry', 'gram'),
  ('semisweet_chocolate_chips', 'Semisweet chocolate chips', 'pantry', 'gram'),
  ('unsweetened_chocolate', 'Unsweetened chocolate', 'pantry', 'gram'),
  ('bread_flour', 'Bread flour', 'grain', 'gram'),
  ('lime_juice', 'Lime juice', 'pantry', 'ml'),
  ('cracker_crumbs', 'Cracker crumbs', 'grain', 'gram'),
  ('cornflake_crumbs', 'Cornflake crumbs', 'grain', 'gram'),
  ('mace', 'Mace', 'pantry', 'gram'),
  ('garlic_salt', 'Garlic salt', 'pantry', 'gram'),
  ('onion_powder', 'Onion powder', 'pantry', 'gram'),
  ('dried_oregano', 'Dried oregano', 'pantry', 'gram'),
  ('beef_broth', 'Beef broth', 'pantry', 'ml'),
  ('sweet_onion', 'Sweet onion', 'vegetable', 'gram'),
  ('chervil', 'Chervil', 'vegetable', 'gram'),
  ('dried_basil', 'Dried basil', 'pantry', 'gram'),
  ('italian_seasoning', 'Italian seasoning', 'pantry', 'gram'),
  ('powdered_buttermilk', 'Powdered buttermilk', 'dairy', 'gram'),
  ('teriyaki_sauce', 'Teriyaki sauce', 'sauce', 'ml'),
  ('alfalfa_sprouts', 'Alfalfa sprouts', 'vegetable', 'gram'),
  ('broccoli_sprouts', 'Broccoli sprouts', 'vegetable', 'gram'),
  ('fenugreek_sprouts', 'Fenugreek sprouts', 'vegetable', 'gram'),
  ('buckwheat_sprouts', 'Buckwheat sprouts', 'vegetable', 'gram'),
  ('sunflower_sprouts', 'Sunflower sprouts', 'vegetable', 'gram'),
  ('alligator_tail_meat', 'Alligator tail meat', 'protein', 'gram'),
  ('crocodile_meat', 'Crocodile meat', 'protein', 'gram'),
  ('turtle_meat', 'Turtle meat', 'protein', 'gram'),
  ('swordfish', 'Swordfish', 'seafood', 'gram'),
  ('ammonium_bicarbonate', 'Ammonium bicarbonate', 'pantry', 'gram')
on conflict (ingredient_id) do nothing;

delete from ingredient_substitutions
where source_name = '';

with rows (
  ingredient_id,
  substitute_ingredient_id,
  score_percent,
  substitution_type,
  replacement_ratio,
  recipe_category,
  notes,
  source_name,
  source_url,
  source_confidence
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
    ('honey', 'sugar', 55, 'emergency', '1 cup honey = about 1 1/4 cups sugar plus 1/4 cup water when reversing BHG sugar-to-honey guidance', 'baking', 'Emergency sweetness replacement; flavor, browning, and moisture change.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),

    ('basil', 'oregano', 68, 'flavor_similar', 'Start with 1/2 the amount, then adjust to taste', 'cooking', 'Herb substitutions are acceptable but flavor changes; BHG recommends starting with half and adjusting.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('basil', 'thyme', 62, 'flavor_similar', 'Start with 1/2 the amount, then adjust to taste', 'cooking', 'Useful when basil is not central; thyme is earthier and less sweet.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('chives', 'green_onion', 78, 'same_family', '1:1 by volume; adjust to taste', 'cooking', 'Green onion is a close allium substitute for chives, though stronger.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('chives', 'scallion', 78, 'same_family', '1:1 by volume; adjust to taste', 'cooking', 'Scallion works like green onion as a chive substitute in savory dishes.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('chives', 'onion', 58, 'emergency', 'Use less than the chives called for; adjust to taste', 'cooking', 'Onion is much stronger than chives; works only when mild allium freshness is not critical.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('chives', 'leek', 64, 'same_family', 'Use finely minced leek; start with less', 'cooking', 'Leek is an allium substitute but heavier and less delicate than chives.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('cilantro', 'parsley', 70, 'flavor_similar', '1:1 by volume; adjust to taste', 'cooking', 'Parsley can replace cilantro for fresh green herb character but lacks cilantro citrusy aroma.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('cinnamon', 'nutmeg', 52, 'emergency', 'Use 1/4 of the cinnamon amount', 'baking', 'Nutmeg can stand in for cinnamon only in small amounts; flavor is stronger and different.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('cinnamon', 'allspice', 58, 'flavor_similar', 'Use 1/4 of the cinnamon amount', 'baking', 'Allspice gives warm spice notes but is stronger and more clove-like than cinnamon.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('cloves', 'allspice', 62, 'flavor_similar', 'Start with 1/2 the amount, then adjust to taste', 'baking', 'Allspice can approximate clove warmth but is less pungent.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('cloves', 'cinnamon', 54, 'emergency', 'Start with 1/2 the amount, then adjust to taste', 'baking', 'Cinnamon is warmer and sweeter, less sharp than cloves.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('cloves', 'nutmeg', 50, 'emergency', 'Start with 1/2 the amount, then adjust to taste', 'baking', 'Nutmeg can provide warm spice notes but changes the flavor profile.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('cardamom', 'ground_ginger', 52, 'emergency', 'Start with 1/2 the amount, then adjust to taste', 'baking', 'Ground ginger is an emergency warm-spice replacement and is not a true flavor match.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('cumin', 'chili_powder', 60, 'flavor_similar', '1:1, adjust to taste', 'cooking', 'Chili powder can provide cumin-like earthiness but adds other chile/spice flavors.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('garlic', 'garlic_paste', 82, 'functional', '1 clove garlic = 1/2 tsp bottled minced garlic or garlic paste', 'cooking', 'Convenience garlic works functionally but lacks fresh garlic texture and brightness.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('garlic', 'garlic_powder', 48, 'emergency', '1 clove garlic = 1/8 tsp garlic powder', 'cooking', 'Emergency flavor substitute; lacks fresh garlic texture and pungency.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('cream_of_tartar', 'lemon_juice', 58, 'emergency', '1/2 tsp cream of tartar = 1 tsp lemon juice', 'baking', 'Acid replacement works in some applications but adds liquid and lemon flavor.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('cream_of_tartar', 'white_vinegar', 58, 'emergency', '1/2 tsp cream of tartar = 1 tsp white vinegar', 'baking', 'Acid replacement works in some applications but adds liquid and vinegar sharpness.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('vanilla_bean', 'vanilla_extract', 88, 'functional', '1 vanilla bean = 1 tbsp vanilla extract', 'baking', 'Good flavor substitute, though extract lacks seeds and visual specks.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('bread_crumb', 'cracker_crumbs', 72, 'texture_similar', '1/4 cup dry bread crumbs = 1/4 cup cracker crumbs', 'cooking', 'Works for coating or binder texture; salt and flavor vary by cracker.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('bread_crumb', 'cornflake_crumbs', 70, 'texture_similar', '1/4 cup dry bread crumbs = 1/4 cup cornflake crumbs', 'cooking', 'Works for crispy coatings; flavor and sweetness vary.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('bread_crumb', 'rolled_oats', 62, 'texture_similar', '1/4 cup dry bread crumbs = 2/3 cup rolled oats', 'cooking', 'Can work as a binder but changes texture noticeably.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('semisweet_chocolate', 'semisweet_chocolate_chips', 92, 'exact_equivalent', '1 oz semisweet chocolate = 3 tbsp semisweet chocolate pieces', 'baking', 'Near-equivalent for chopped chocolate in many baked goods; chips may include stabilizers.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('bread_flour', 'all_purpose_flour', 78, 'functional', '1:1 in many bread recipes, expect slightly less chew/rise', 'baking', 'King Arthur bakers found AP flour can replace bread flour in a pinch with a slightly more tender loaf.', 'King Arthur Baking via Better Homes & Gardens', 'https://www.bhg.com/recipes/how-to/cooking-basics/bread-flour-vs-all-purpose-flour/', 'medium'),
    ('all_purpose_flour', 'bread_flour', 76, 'functional', '1:1 in many bread recipes, expect chewier texture', 'baking', 'Bread flour can replace AP flour in bread-oriented baking but may make results chewier.', 'King Arthur Baking via Better Homes & Gardens', 'https://www.bhg.com/recipes/how-to/cooking-basics/bread-flour-vs-all-purpose-flour/', 'medium'),

    ('chervil', 'tarragon', 64, 'flavor_similar', 'Start with 1/2 the amount, then adjust to taste', 'cooking', 'Tarragon is a stronger, more anise-like herb substitute for chervil.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('chervil', 'parsley', 60, 'flavor_similar', '1:1 by volume; adjust to taste', 'cooking', 'Parsley can replace chervil for green herb freshness but lacks its anise note.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('ginger', 'allspice', 50, 'emergency', 'Start with 1/2 the amount, then adjust to taste', 'baking', 'Emergency warm spice substitute for ground ginger; not suitable for fresh ginger texture.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('ginger', 'cinnamon', 48, 'emergency', 'Start with 1/2 the amount, then adjust to taste', 'baking', 'Emergency warm spice substitute with a sweeter profile.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('ginger', 'mace', 48, 'emergency', 'Start with 1/2 the amount, then adjust to taste', 'baking', 'Emergency warm spice substitute; changes aroma considerably.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('ginger', 'nutmeg', 48, 'emergency', 'Start with 1/2 the amount, then adjust to taste', 'baking', 'Emergency warm spice substitute; best only in baked goods.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('oregano', 'thyme', 64, 'flavor_similar', 'Start with 1/2 the amount, then adjust to taste', 'cooking', 'Thyme can replace oregano in savory cooking, though it is more woodsy and less peppery.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('thyme', 'oregano', 62, 'flavor_similar', 'Start with 1/2 the amount, then adjust to taste', 'cooking', 'Oregano can replace thyme when Mediterranean herb flavor is acceptable.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('garlic_salt', 'garlic_powder', 70, 'functional', 'Use 1 part garlic powder plus 3 parts salt', 'cooking', 'BHG gives the garlic salt build ratio; use when salt can be adjusted.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'high'),
    ('chili_powder', 'hot_sauce', 42, 'emergency', 'Use a small dash hot sauce plus oregano and cumin to taste', 'cooking', 'Emergency only; liquid heat changes texture and lacks the same spice blend.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('paprika', 'cayenne_pepper', 42, 'emergency', 'Use much less cayenne; adjust to heat tolerance', 'cooking', 'Cayenne adds heat rather than paprika sweetness/color, so this is emergency only.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('black_pepper', 'white_pepper', 66, 'flavor_similar', '1:1, adjust to taste', 'cooking', 'White pepper can replace black pepper where pepper heat is needed, but aroma is different.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),

    ('kale', 'swiss_chard', 76, 'same_family', '1:1 by prepared volume; adjust cook time', 'vegetable', 'EatingWell recommends chard or spinach when kale is unavailable; chard cooks faster and is more tender.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'high'),
    ('kale', 'spinach', 70, 'same_family', '1:1 by prepared volume; reduce cook time', 'vegetable', 'Spinach is a tender green substitute for kale but wilts much faster.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'high'),
    ('spinach', 'swiss_chard', 70, 'same_family', '1:1 by prepared volume; increase cook time slightly', 'vegetable', 'Chard can replace spinach in cooked dishes but has sturdier stems and texture.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'medium'),
    ('swiss_chard', 'spinach', 70, 'same_family', '1:1 by prepared volume; reduce cook time', 'vegetable', 'Spinach can replace chard leaves in cooked dishes but lacks chard stems and texture.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'medium'),
    ('collard_greens', 'kale', 66, 'same_family', '1:1 by prepared volume; adjust cook time', 'vegetable', 'Kale can replace collards in many cooked greens dishes but is generally less sturdy.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'medium'),
    ('onion', 'sweet_onion', 92, 'exact_equivalent', '1:1', 'cooking', 'EatingWell notes one onion type can generally replace another; sweetness and sharpness vary.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'high'),
    ('red_onion', 'sweet_onion', 82, 'same_family', '1:1, adjust for raw sharpness and sweetness', 'cooking', 'Different onion types can replace each other, but color and bite change.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'medium'),
    ('onion', 'leek', 66, 'same_family', '1:1 by volume for cooked applications', 'cooking', 'Leek is an onion-family substitute; best cooked and less sharp than bulb onion.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'medium'),
    ('onion', 'scallion', 62, 'same_family', 'Use more scallion for cooked onion bulk; adjust to taste', 'cooking', 'Scallions can replace onion flavor but do not provide the same bulk after long cooking.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'medium'),
    ('quinoa', 'bulgur', 72, 'functional', '1:1 cooked volume in grain bowls or pilafs', 'cooking', 'Whole grains can often substitute in grain bowls, pilafs, and sides; texture and cook time vary.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'medium'),
    ('quinoa', 'brown_rice', 72, 'functional', '1:1 cooked volume in grain bowls or sides', 'cooking', 'Whole grain swap; changes texture, cook time, and flavor.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'medium'),
    ('brown_rice', 'barley', 70, 'functional', '1:1 cooked volume in grain bowls or sides', 'cooking', 'Whole grain swap; barley is chewier and contains gluten.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'medium'),
    ('barley', 'millet', 66, 'functional', '1:1 cooked volume in grain bowls or sides', 'cooking', 'Whole grain swap; millet is smaller and softer than barley.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'medium'),
    ('chicken_broth', 'vegetable_stock', 66, 'functional', '1:1', 'soup', 'Vegetable stock can replace chicken broth when poultry flavor is not central.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'high'),
    ('beef_broth', 'vegetable_stock', 58, 'emergency', '1:1', 'soup', 'Vegetable stock can replace beef broth in a pinch but loses beef flavor and body.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'medium'),
    ('chicken_broth', 'water', 42, 'emergency', '1:1 plus seasoning to taste', 'soup', 'Emergency-only broth replacement; add salt and aromatics if possible.', 'EatingWell Test Kitchen', 'https://www.eatingwell.com/article/7740254/how-to-substitute-almost-any-ingredient/', 'medium'),

    ('alfalfa_sprouts', 'broccoli_sprouts', 76, 'same_family', '1:1 by volume', 'vegetable', 'Book lists broccoli sprouts as a direct alfalfa sprouts substitute; flavor is more peppery.', 'The Food Substitutions Bible', '', 'medium'),
    ('alfalfa_sprouts', 'fenugreek_sprouts', 62, 'same_family', '1:1 by volume', 'vegetable', 'Book lists fenugreek sprouts as a substitute; flavor is slightly bitter.', 'The Food Substitutions Bible', '', 'medium'),
    ('alfalfa_sprouts', 'buckwheat_sprouts', 62, 'same_family', '1:1 by volume', 'vegetable', 'Book lists buckwheat sprouts as a substitute; flavor is nuttier.', 'The Food Substitutions Bible', '', 'medium'),
    ('alfalfa_sprouts', 'sunflower_sprouts', 62, 'same_family', '1:1 by volume', 'vegetable', 'Book lists sunflower sprouts as a substitute; flavor is nuttier.', 'The Food Substitutions Bible', '', 'medium'),
    ('alfalfa_sprouts', 'mung_bean_sprouts', 70, 'same_family', '1:1 by volume', 'vegetable', 'Book lists mung bean sprouts as a substitute; texture is thicker and crisper.', 'The Food Substitutions Bible', '', 'medium'),
    ('alligator_tail_meat', 'crocodile_meat', 92, 'same_family', '1:1 by weight', 'protein', 'Book lists crocodile tail meat as the closest alligator tail meat substitute.', 'The Food Substitutions Bible', '', 'medium'),
    ('alligator_tail_meat', 'turtle_meat', 72, 'same_family', '1:1 by weight', 'protein', 'Book lists turtle meat as an alligator tail meat substitute.', 'The Food Substitutions Bible', '', 'medium'),
    ('alligator_tail_meat', 'chicken_breast', 66, 'texture_similar', '1:1 by weight', 'protein', 'Book compares alligator to chicken or mild white fish and lists chicken breast as a substitute.', 'The Food Substitutions Bible', '', 'medium'),
    ('alligator_tail_meat', 'swordfish', 66, 'texture_similar', '1:1 by weight', 'protein', 'Book lists swordfish as a substitute for alligator tail meat.', 'The Food Substitutions Bible', '', 'medium'),
    ('baking_powder', 'ammonium_bicarbonate', 55, 'functional', '1 tsp double-acting baking powder = 1 tsp ammonium bicarbonate for small baked goods', 'baking', 'Book notes ammonium bicarbonate works best for light, airy small baked goods so ammonia odor can evaporate.', 'The Food Substitutions Bible', '', 'medium'),
    ('basil', 'dried_basil', 88, 'functional', '1 tbsp chopped fresh basil = 1 tsp dried basil', 'cooking', 'Book gives a direct fresh-to-dried basil substitution ratio.', 'The Food Substitutions Bible', '', 'high'),
    ('basil', 'italian_seasoning', 72, 'flavor_similar', '1 tbsp chopped fresh basil = 1 tsp dried Italian seasoning', 'cooking', 'Book lists dried Italian seasoning as a fresh basil substitute.', 'The Food Substitutions Bible', '', 'medium'),
    ('basil', 'mint', 55, 'flavor_similar', '1:1 by volume', 'cooking', 'Book lists fresh mint as a basil flavor variation, especially in Thai dishes.', 'The Food Substitutions Bible', '', 'medium'),
    ('buttermilk', 'kefir', 88, 'functional', '1:1 by volume', 'baking', 'Book lists kefir as a direct buttermilk substitute.', 'The Food Substitutions Bible', '', 'high'),
    ('soy_sauce', 'maggi_seasoning', 74, 'flavor_similar', '1:1 by volume', 'sauce', 'Book lists Maggi seasoning as a soy sauce substitute; flavor is darker and more complex.', 'The Food Substitutions Bible', '', 'medium'),
    ('soy_sauce', 'teriyaki_sauce', 58, 'flavor_similar', '1:1 by volume', 'sauce', 'Book lists teriyaki sauce as a soy sauce substitute; it is sweeter and thicker.', 'The Food Substitutions Bible', '', 'medium')
)
insert into ingredient_substitutions (
  ingredient_id,
  substitute_ingredient_id,
  confidence_score,
  substitution_type,
  replacement_ratio,
  recipe_category,
  notes,
  source_name,
  source_url,
  updated_at
)
select
  rows.ingredient_id,
  rows.substitute_ingredient_id,
  rows.score_percent / 100.0,
  rows.substitution_type,
  rows.replacement_ratio,
  rows.recipe_category,
  rows.notes,
  rows.source_name,
  rows.source_url,
  now()
from rows
where exists (select 1 from ingredients where ingredients.ingredient_id = rows.ingredient_id)
  and exists (select 1 from ingredients where ingredients.ingredient_id = rows.substitute_ingredient_id)
on conflict (ingredient_id, substitute_ingredient_id, recipe_category) do update set
  confidence_score = excluded.confidence_score,
  substitution_type = excluded.substitution_type,
  replacement_ratio = excluded.replacement_ratio,
  notes = excluded.notes,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
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
    ('egg__flaxseed_water__baking', 'egg', 'Ground flaxseed plus water', 58, 'emergency', '1 egg = 1 tbsp ground flaxseed plus 3 tbsp water', 'baking', 'Vegan/emergency binder; not equivalent for egg-forward recipes or aeration.', 'Better Homes & Gardens Test Kitchen', 'https://www.bhg.com/recipes/how-to/bake/ingredient-substitutions/', 'medium'),
    ('buttermilk__water_powdered_buttermilk__baking', 'buttermilk', 'Water plus powdered buttermilk', 86, 'functional', '1 cup buttermilk = 1 cup water plus 1/4 cup powdered buttermilk', 'baking', 'Book lists powdered buttermilk plus water as a buttermilk substitute.', 'The Food Substitutions Bible', '', 'high'),
    ('soy_sauce__kosher_salt_sugar_water__sauce', 'soy_sauce', 'Kosher salt plus sugar in hot water', 46, 'emergency', '1 tbsp soy sauce = scant 3/4 tsp kosher salt plus 1/2 tsp sugar dissolved in 1 tbsp hot water', 'sauce', 'Book lists this as a lighter-color, less complex emergency soy sauce substitute.', 'The Food Substitutions Bible', '', 'medium'),
    ('baking_powder__baking_soda_cornstarch_cream_of_tartar__baking', 'baking_powder', 'Baking soda plus cornstarch plus cream of tartar', 86, 'functional', '1 tsp double-acting baking powder = 1/4 tsp baking soda plus 1/4 tsp cornstarch plus 1/2 tsp cream of tartar', 'baking', 'Book gives a more complete homemade double-acting baking powder replacement formula.', 'The Food Substitutions Bible', '', 'high')
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
    ('egg__flaxseed_water__baking', 2, 'water', 3, 'tbsp', 'Rest until gelled.'),
    ('buttermilk__water_powdered_buttermilk__baking', 1, 'water', 1, 'cup', ''),
    ('buttermilk__water_powdered_buttermilk__baking', 2, 'powdered_buttermilk', 0.25, 'cup', ''),
    ('soy_sauce__kosher_salt_sugar_water__sauce', 1, 'kosher_salt', 0.75, 'tsp', 'Use scant measure.'),
    ('soy_sauce__kosher_salt_sugar_water__sauce', 2, 'sugar', 0.5, 'tsp', ''),
    ('soy_sauce__kosher_salt_sugar_water__sauce', 3, 'water', 1, 'tbsp', 'Use hot water to dissolve.'),
    ('baking_powder__baking_soda_cornstarch_cream_of_tartar__baking', 1, 'baking_soda', 0.25, 'tsp', ''),
    ('baking_powder__baking_soda_cornstarch_cream_of_tartar__baking', 2, 'cornstarch', 0.25, 'tsp', ''),
    ('baking_powder__baking_soda_cornstarch_cream_of_tartar__baking', 3, 'cream_of_tartar', 0.5, 'tsp', '')
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
