import { query, sqlBoolean, sqlNumber, sqlString } from "./postgres.js";

const ingredients = [
  ["egg", "egg", "protein"],
  ["tomato", "tomato", "vegetable"],
  ["scallion", "scallion", "vegetable"],
  ["salt", "salt", "pantry"],
  ["oil", "oil", "pantry"],
  ["chicken_thigh", "chicken thigh", "protein"],
  ["chicken_breast", "chicken breast", "protein"],
  ["potato", "potato", "vegetable"],
  ["curry_block", "curry block", "seasoning"],
  ["curry_powder", "curry powder", "seasoning"],
  ["carrot", "carrot", "vegetable"],
  ["cilantro", "cilantro", "herb"],
  ["parsley", "parsley", "herb"],
  ["heavy_cream", "heavy cream", "dairy"],
  ["milk", "milk", "dairy"],
  ["rice", "rice", "grain"],
  ["ground_pork", "ground pork", "protein"],
  ["ground_beef", "ground beef", "protein"],
  ["tofu", "tofu", "protein"],
  ["soft_tofu", "soft tofu", "protein"],
  ["shrimp", "shrimp", "protein"],
  ["pasta", "pasta", "grain"],
  ["spaghetti", "spaghetti", "grain"],
  ["garlic", "garlic", "aromatic"],
  ["ginger", "ginger", "aromatic"],
  ["onion", "onion", "vegetable"],
  ["bell_pepper", "bell pepper", "vegetable"],
  ["broccoli", "broccoli", "vegetable"],
  ["mushroom", "mushroom", "vegetable"],
  ["spinach", "spinach", "vegetable"],
  ["lettuce", "lettuce", "vegetable"],
  ["cucumber", "cucumber", "vegetable"],
  ["lemon", "lemon", "fruit"],
  ["lime", "lime", "fruit"],
  ["cheese", "cheese", "dairy"],
  ["butter", "butter", "dairy"],
  ["cream", "cream", "dairy"],
  ["soy_sauce", "soy sauce", "pantry"],
  ["sugar", "sugar", "pantry"],
  ["vinegar", "vinegar", "pantry"],
  ["black_pepper", "black pepper", "pantry"],
  ["sesame_oil", "sesame oil", "pantry"],
  ["chili_oil", "chili oil", "pantry"],
  ["doubanjiang", "doubanjiang", "pantry"]
];

const aliases = [
  ["green onion", "scallion"],
  ["spring onion", "scallion"],
  ["shallot", "onion"],
  ["capsicum", "bell_pepper"],
  ["sweet pepper", "bell_pepper"],
  ["button mushroom", "mushroom"],
  ["baby spinach", "spinach"],
  ["romaine", "lettuce"],
  ["spaghettini", "spaghetti"],
  ["prawn", "shrimp"],
  ["light soy sauce", "soy_sauce"]
];

const substitutions = [
  ["chicken_thigh", "chicken_breast", 0.8],
  ["curry_block", "curry_powder", 0.7],
  ["cilantro", "parsley", 0.7],
  ["heavy_cream", "milk", 0.6],
  ["ground_pork", "ground_beef", 0.75],
  ["soft_tofu", "tofu", 0.85],
  ["spaghetti", "pasta", 0.9],
  ["lime", "lemon", 0.8],
  ["cream", "milk", 0.55],
  ["butter", "oil", 0.6],
  ["broccoli", "spinach", 0.5],
  ["shrimp", "chicken_breast", 0.45]
];

const recipes = [
  recipe("tomato_egg", "番茄炒蛋", 15, 10, "easy", 0.6, 0.8, [
    main("egg", 2, "piece"),
    main("tomato", 2, "piece"),
    optional("scallion", 1, "stalk"),
    pantry("salt", 1, "tsp"),
    pantry("oil", 1, "tbsp")
  ]),
  recipe("chicken_curry", "Chicken Curry", 45, 20, "medium", 0.9, 0.5, [
    main("chicken_thigh", 1, "lb"),
    main("potato", 2, "piece"),
    main("curry_block", 1, "pack"),
    optional("carrot", 1, "piece"),
    pantry("salt", 1, "tsp"),
    pantry("oil", 1, "tbsp")
  ]),
  recipe("mapo_tofu", "麻婆豆腐", 25, 18, "medium", 0.8, 0.5, [
    main("soft_tofu", 1, "box"),
    main("ground_pork", 0.5, "lb"),
    optional("scallion", 1, "stalk"),
    pantry("doubanjiang", 2, "tbsp"),
    pantry("soy_sauce", 1, "tbsp"),
    pantry("oil", 1, "tbsp")
  ]),
  recipe("garlic_shrimp_pasta", "Garlic Shrimp Pasta", 30, 20, "medium", 0.4, 0.5, [
    main("shrimp", 0.75, "lb"),
    main("spaghetti", 8, "oz"),
    main("garlic", 3, "clove"),
    optional("lemon", 0.5, "piece"),
    pantry("butter", 2, "tbsp"),
    pantry("black_pepper", 1, "tsp")
  ]),
  recipe("chicken_broccoli_stir_fry", "Chicken Broccoli Stir Fry", 25, 20, "easy", 0.7, 0.6, [
    main("chicken_breast", 1, "lb"),
    main("broccoli", 2, "cup"),
    optional("garlic", 2, "clove"),
    pantry("soy_sauce", 2, "tbsp"),
    pantry("oil", 1, "tbsp"),
    pantry("sugar", 1, "tsp")
  ]),
  recipe("fried_rice", "Egg Fried Rice", 20, 15, "easy", 0.9, 0.7, [
    main("rice", 2, "cup"),
    main("egg", 2, "piece"),
    optional("scallion", 1, "stalk"),
    optional("carrot", 0.5, "cup"),
    pantry("soy_sauce", 1, "tbsp"),
    pantry("oil", 1, "tbsp")
  ]),
  recipe("creamy_mushroom_pasta", "Creamy Mushroom Pasta", 35, 25, "medium", 0.5, 0.4, [
    main("pasta", 8, "oz"),
    main("mushroom", 2, "cup"),
    main("cream", 0.5, "cup"),
    optional("garlic", 2, "clove"),
    pantry("butter", 1, "tbsp"),
    pantry("black_pepper", 1, "tsp")
  ]),
  recipe("tofu_vegetable_bowl", "Tofu Vegetable Bowl", 30, 20, "easy", 0.8, 0.6, [
    main("tofu", 1, "box"),
    main("rice", 1, "cup"),
    optional("spinach", 1, "cup"),
    optional("mushroom", 1, "cup"),
    pantry("soy_sauce", 1, "tbsp"),
    pantry("sesame_oil", 1, "tsp")
  ]),
  recipe("cucumber_salad", "拍黄瓜", 10, 10, "easy", 0.3, 0.9, [
    main("cucumber", 1, "piece"),
    optional("garlic", 1, "clove"),
    pantry("vinegar", 1, "tbsp"),
    pantry("soy_sauce", 1, "tbsp"),
    pantry("sugar", 1, "tsp"),
    pantry("chili_oil", 1, "tsp")
  ]),
  recipe("beef_taco_bowl", "Beef Taco Bowl", 30, 22, "easy", 0.8, 0.5, [
    main("ground_beef", 1, "lb"),
    main("rice", 1, "cup"),
    optional("tomato", 1, "piece"),
    optional("lettuce", 1, "cup"),
    optional("cheese", 0.5, "cup"),
    pantry("oil", 1, "tbsp")
  ]),
  recipe("tomato_tofu_soup", "番茄豆腐汤", 25, 15, "easy", 0.6, 0.8, [
    main("tomato", 2, "piece"),
    main("tofu", 1, "box"),
    optional("egg", 1, "piece"),
    optional("scallion", 1, "stalk"),
    pantry("salt", 1, "tsp"),
    pantry("oil", 1, "tsp")
  ]),
  recipe("lemon_parsley_chicken", "Lemon Parsley Chicken", 35, 15, "easy", 0.7, 0.7, [
    main("chicken_breast", 1, "lb"),
    main("lemon", 1, "piece"),
    optional("parsley", 0.25, "cup"),
    optional("garlic", 2, "clove"),
    pantry("oil", 1, "tbsp"),
    pantry("black_pepper", 1, "tsp")
  ])
];

await bootstrapSchema();
await seedRuleData();
await seedRecipes();

console.log(`Seeded ${ingredients.length} ingredients, ${aliases.length} aliases, ${substitutions.length} substitutions, and ${recipes.length} recipes.`);

async function bootstrapSchema() {
  await query(`
    create table if not exists ingredients (
      ingredient_id text primary key,
      canonical_name text not null,
      category text not null
    );

    create table if not exists ingredient_aliases (
      alias_name text primary key,
      ingredient_id text not null references ingredients(ingredient_id) on delete cascade
    );

    create table if not exists ingredient_substitutions (
      ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
      substitute_ingredient_id text not null references ingredients(ingredient_id) on delete cascade,
      confidence_score double precision not null default 0,
      primary key (ingredient_id, substitute_ingredient_id)
    );

    alter table pantry_recipes add column if not exists total_time_minutes integer not null default 0;
    alter table pantry_recipes add column if not exists active_time_minutes integer not null default 0;
    alter table pantry_recipes add column if not exists difficulty text not null default '';
    alter table pantry_recipes add column if not exists leftover_score double precision not null default 0;
    alter table pantry_recipes add column if not exists cleanup_score double precision not null default 0;

    alter table pantry_recipe_ingredients add column if not exists canonical_ingredient_id text not null default '';
    alter table pantry_recipe_ingredients add column if not exists required_flag boolean not null default true;
    alter table pantry_recipe_ingredients add column if not exists optional_flag boolean not null default false;
    alter table pantry_recipe_ingredients add column if not exists pantry_flag boolean not null default false;

    update pantry_recipe_ingredients
    set
      required_flag = coalesce(role, 'main') = 'main',
      optional_flag = coalesce(role, 'main') = 'secondary',
      pantry_flag = coalesce(role, 'main') = 'seasoning';

    grant select, insert, update, delete on ingredients to anon;
    grant select, insert, update, delete on ingredient_aliases to anon;
    grant select, insert, update, delete on ingredient_substitutions to anon;
    grant select, insert, update, delete on pantry_recipes to anon;
    grant select, insert, update, delete on pantry_recipe_ingredients to anon;
    grant select, insert, update, delete on pantry_recipe_steps to anon;
    grant select, insert, update, delete on pantry_media to anon;
  `);
}

async function seedRuleData() {
  await query(`
    insert into ingredients (ingredient_id, canonical_name, category)
    values ${ingredients.map((item) => `(${sqlString(item[0])}, ${sqlString(item[1])}, ${sqlString(item[2])})`).join(",\n")}
    on conflict (ingredient_id) do update set
      canonical_name = excluded.canonical_name,
      category = excluded.category;

    insert into ingredient_aliases (alias_name, ingredient_id)
    values ${aliases.map((item) => `(${sqlString(item[0])}, ${sqlString(item[1])})`).join(",\n")}
    on conflict (alias_name) do update set
      ingredient_id = excluded.ingredient_id;

    insert into ingredient_substitutions (ingredient_id, substitute_ingredient_id, confidence_score)
    values ${substitutions.map((item) => `(${sqlString(item[0])}, ${sqlString(item[1])}, ${sqlNumber(item[2], 0)})`).join(",\n")}
    on conflict (ingredient_id, substitute_ingredient_id) do update set
      confidence_score = excluded.confidence_score;
  `);
}

async function seedRecipes() {
  await query(`
    insert into pantry_recipes (
      recipe_id, name, image_url, video_url, updated_at, active,
      total_time_minutes, active_time_minutes, difficulty, leftover_score, cleanup_score
    )
    values ${recipes.map((item) => `(
      ${sqlString(item.id)}, ${sqlString(item.name)}, '', '', now(), true,
      ${sqlNumber(item.totalTimeMinutes, 0)}, ${sqlNumber(item.activeTimeMinutes, 0)}, ${sqlString(item.difficulty)},
      ${sqlNumber(item.leftoverScore, 0)}, ${sqlNumber(item.cleanupScore, 0)}
    )`).join(",\n")}
    on conflict (recipe_id) do update set
      name = excluded.name,
      total_time_minutes = excluded.total_time_minutes,
      active_time_minutes = excluded.active_time_minutes,
      difficulty = excluded.difficulty,
      leftover_score = excluded.leftover_score,
      cleanup_score = excluded.cleanup_score,
      active = true,
      updated_at = now();

    delete from pantry_recipe_ingredients
    where recipe_id in (${recipes.map((item) => sqlString(item.id)).join(", ")});

    insert into pantry_recipe_ingredients (
      ingredient_id, recipe_id, canonical_ingredient_id, role, name, quantity, unit, sort_order,
      required_flag, optional_flag, pantry_flag
    )
    values ${recipes.flatMap((item) => item.ingredients.map((ingredient, index) => `(
      ${sqlString(`${item.id}_${ingredient.ingredientId}_${index + 1}`)},
      ${sqlString(item.id)},
      ${sqlString(ingredient.ingredientId)},
      ${sqlString(ingredient.role)},
      ${sqlString(ingredientName(ingredient.ingredientId))},
      ${sqlNumber(ingredient.quantity, 1)},
      ${sqlString(ingredient.unit)},
      ${sqlNumber(index + 1, 1)},
      ${sqlBoolean(ingredient.requiredFlag)},
      ${sqlBoolean(ingredient.optionalFlag)},
      ${sqlBoolean(ingredient.pantryFlag)}
    )`)).join(",\n")};

    delete from pantry_recipe_steps
    where recipe_id in (${recipes.map((item) => sqlString(item.id)).join(", ")});

    insert into pantry_recipe_steps (step_id, recipe_id, step_order, instruction)
    values ${recipes.map((item) => `(
      ${sqlString(`${item.id}_step_1`)},
      ${sqlString(item.id)},
      1,
      ${sqlString(`Prepare ${item.name} using the matched ingredients.`)}
    )`).join(",\n")};
  `);
}

function recipe(id, name, totalTimeMinutes, activeTimeMinutes, difficulty, leftoverScore, cleanupScore, recipeIngredients) {
  return { id, name, totalTimeMinutes, activeTimeMinutes, difficulty, leftoverScore, cleanupScore, ingredients: recipeIngredients };
}

function main(ingredientId, quantity, unit) {
  return { ingredientId, role: "main", requiredFlag: true, optionalFlag: false, pantryFlag: false, quantity, unit };
}

function optional(ingredientId, quantity, unit) {
  return { ingredientId, role: "secondary", requiredFlag: false, optionalFlag: true, pantryFlag: false, quantity, unit };
}

function pantry(ingredientId, quantity, unit) {
  return { ingredientId, role: "seasoning", requiredFlag: false, optionalFlag: false, pantryFlag: true, quantity, unit };
}

function ingredientName(ingredientId) {
  return ingredients.find((item) => item[0] === ingredientId)?.[1] || ingredientId.replaceAll("_", " ");
}
