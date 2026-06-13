from __future__ import annotations

from .models import (
    Ingredient,
    IngredientAlias,
    IngredientSubstitution,
    Recipe,
    RecipeIngredient,
    UserInventoryItem,
)


def sample_ingredients() -> list[Ingredient]:
    return [
        Ingredient("egg", "egg", "protein"),
        Ingredient("tomato", "tomato", "vegetable"),
        Ingredient("scallion", "scallion", "vegetable"),
        Ingredient("salt", "salt", "pantry"),
        Ingredient("oil", "oil", "pantry"),
        Ingredient("chicken_thigh", "chicken thigh", "protein"),
        Ingredient("chicken_breast", "chicken breast", "protein"),
        Ingredient("potato", "potato", "vegetable"),
        Ingredient("curry_block", "curry block", "seasoning"),
        Ingredient("curry_powder", "curry powder", "seasoning"),
        Ingredient("carrot", "carrot", "vegetable"),
        Ingredient("cilantro", "cilantro", "herb"),
        Ingredient("parsley", "parsley", "herb"),
        Ingredient("heavy_cream", "heavy cream", "dairy"),
        Ingredient("milk", "milk", "dairy"),
        Ingredient("rice", "rice", "grain"),
        Ingredient("ground_pork", "ground pork", "protein"),
        Ingredient("ground_beef", "ground beef", "protein"),
        Ingredient("tofu", "tofu", "protein"),
        Ingredient("soft_tofu", "soft tofu", "protein"),
        Ingredient("shrimp", "shrimp", "protein"),
        Ingredient("pasta", "pasta", "grain"),
        Ingredient("spaghetti", "spaghetti", "grain"),
        Ingredient("garlic", "garlic", "aromatic"),
        Ingredient("ginger", "ginger", "aromatic"),
        Ingredient("onion", "onion", "vegetable"),
        Ingredient("bell_pepper", "bell pepper", "vegetable"),
        Ingredient("broccoli", "broccoli", "vegetable"),
        Ingredient("mushroom", "mushroom", "vegetable"),
        Ingredient("spinach", "spinach", "vegetable"),
        Ingredient("lettuce", "lettuce", "vegetable"),
        Ingredient("cucumber", "cucumber", "vegetable"),
        Ingredient("lemon", "lemon", "fruit"),
        Ingredient("lime", "lime", "fruit"),
        Ingredient("cheese", "cheese", "dairy"),
        Ingredient("butter", "butter", "dairy"),
        Ingredient("cream", "cream", "dairy"),
        Ingredient("soy_sauce", "soy sauce", "pantry"),
        Ingredient("sugar", "sugar", "pantry"),
        Ingredient("vinegar", "vinegar", "pantry"),
        Ingredient("black_pepper", "black pepper", "pantry"),
        Ingredient("sesame_oil", "sesame oil", "pantry"),
        Ingredient("chili_oil", "chili oil", "pantry"),
        Ingredient("doubanjiang", "doubanjiang", "pantry"),
    ]


def sample_aliases() -> list[IngredientAlias]:
    return [
        IngredientAlias("green onion", "scallion"),
        IngredientAlias("spring onion", "scallion"),
        IngredientAlias("shallot", "onion"),
        IngredientAlias("capsicum", "bell_pepper"),
        IngredientAlias("sweet pepper", "bell_pepper"),
        IngredientAlias("button mushroom", "mushroom"),
        IngredientAlias("baby spinach", "spinach"),
        IngredientAlias("romaine", "lettuce"),
        IngredientAlias("spaghettini", "spaghetti"),
        IngredientAlias("prawn", "shrimp"),
        IngredientAlias("light soy sauce", "soy_sauce"),
    ]


def sample_substitutions() -> list[IngredientSubstitution]:
    return [
        IngredientSubstitution("chicken_thigh", "chicken_breast", 0.8),
        IngredientSubstitution("curry_block", "curry_powder", 0.7),
        IngredientSubstitution("cilantro", "parsley", 0.7),
        IngredientSubstitution("heavy_cream", "milk", 0.6),
        IngredientSubstitution("ground_pork", "ground_beef", 0.75),
        IngredientSubstitution("soft_tofu", "tofu", 0.85),
        IngredientSubstitution("spaghetti", "pasta", 0.9),
        IngredientSubstitution("lime", "lemon", 0.8),
        IngredientSubstitution("cream", "milk", 0.55),
        IngredientSubstitution("butter", "oil", 0.6),
        IngredientSubstitution("broccoli", "spinach", 0.5),
        IngredientSubstitution("shrimp", "chicken_breast", 0.45),
    ]


def tomato_egg_recipe() -> Recipe:
    recipe_id = "tomato_egg"
    return Recipe(
        recipe_id=recipe_id,
        recipe_name="番茄炒蛋",
        total_time_minutes=15,
        active_time_minutes=10,
        difficulty="easy",
        leftover_score=0.6,
        cleanup_score=0.8,
        ingredients=[
            RecipeIngredient(recipe_id, "egg", required_flag=True, quantity=2, unit="piece"),
            RecipeIngredient(recipe_id, "tomato", required_flag=True, quantity=2, unit="piece"),
            RecipeIngredient(recipe_id, "scallion", required_flag=False, optional_flag=True, quantity=1, unit="stalk"),
            RecipeIngredient(recipe_id, "salt", required_flag=False, pantry_flag=True, quantity=1, unit="tsp"),
            RecipeIngredient(recipe_id, "oil", required_flag=False, pantry_flag=True, quantity=1, unit="tbsp"),
        ],
    )


def chicken_curry_recipe() -> Recipe:
    recipe_id = "chicken_curry"
    return Recipe(
        recipe_id=recipe_id,
        recipe_name="Chicken Curry",
        total_time_minutes=45,
        active_time_minutes=20,
        difficulty="medium",
        leftover_score=0.9,
        cleanup_score=0.5,
        ingredients=[
            RecipeIngredient(recipe_id, "chicken_thigh", required_flag=True, quantity=1, unit="lb"),
            RecipeIngredient(recipe_id, "potato", required_flag=True, quantity=2, unit="piece"),
            RecipeIngredient(recipe_id, "curry_block", required_flag=True, quantity=1, unit="pack"),
            RecipeIngredient(recipe_id, "carrot", required_flag=False, optional_flag=True, quantity=1, unit="piece"),
            RecipeIngredient(recipe_id, "salt", required_flag=False, pantry_flag=True, quantity=1, unit="tsp"),
            RecipeIngredient(recipe_id, "oil", required_flag=False, pantry_flag=True, quantity=1, unit="tbsp"),
        ],
    )


def mapo_tofu_recipe() -> Recipe:
    recipe_id = "mapo_tofu"
    return Recipe(
        recipe_id=recipe_id,
        recipe_name="麻婆豆腐",
        total_time_minutes=25,
        active_time_minutes=18,
        difficulty="medium",
        leftover_score=0.8,
        cleanup_score=0.5,
        ingredients=[
            RecipeIngredient(recipe_id, "soft_tofu", required_flag=True, quantity=1, unit="box"),
            RecipeIngredient(recipe_id, "ground_pork", required_flag=True, quantity=0.5, unit="lb"),
            RecipeIngredient(recipe_id, "scallion", required_flag=False, optional_flag=True, quantity=1, unit="stalk"),
            RecipeIngredient(recipe_id, "doubanjiang", required_flag=False, pantry_flag=True, quantity=2, unit="tbsp"),
            RecipeIngredient(recipe_id, "soy_sauce", required_flag=False, pantry_flag=True, quantity=1, unit="tbsp"),
            RecipeIngredient(recipe_id, "oil", required_flag=False, pantry_flag=True, quantity=1, unit="tbsp"),
        ],
    )


def garlic_shrimp_pasta_recipe() -> Recipe:
    recipe_id = "garlic_shrimp_pasta"
    return Recipe(
        recipe_id=recipe_id,
        recipe_name="Garlic Shrimp Pasta",
        total_time_minutes=30,
        active_time_minutes=20,
        difficulty="medium",
        leftover_score=0.4,
        cleanup_score=0.5,
        ingredients=[
            RecipeIngredient(recipe_id, "shrimp", required_flag=True, quantity=0.75, unit="lb"),
            RecipeIngredient(recipe_id, "spaghetti", required_flag=True, quantity=8, unit="oz"),
            RecipeIngredient(recipe_id, "garlic", required_flag=True, quantity=3, unit="clove"),
            RecipeIngredient(recipe_id, "lemon", required_flag=False, optional_flag=True, quantity=0.5, unit="piece"),
            RecipeIngredient(recipe_id, "butter", required_flag=False, pantry_flag=True, quantity=2, unit="tbsp"),
            RecipeIngredient(recipe_id, "black_pepper", required_flag=False, pantry_flag=True, quantity=1, unit="tsp"),
        ],
    )


def chicken_broccoli_stir_fry_recipe() -> Recipe:
    recipe_id = "chicken_broccoli_stir_fry"
    return Recipe(
        recipe_id=recipe_id,
        recipe_name="Chicken Broccoli Stir Fry",
        total_time_minutes=25,
        active_time_minutes=20,
        difficulty="easy",
        leftover_score=0.7,
        cleanup_score=0.6,
        ingredients=[
            RecipeIngredient(recipe_id, "chicken_breast", required_flag=True, quantity=1, unit="lb"),
            RecipeIngredient(recipe_id, "broccoli", required_flag=True, quantity=2, unit="cup"),
            RecipeIngredient(recipe_id, "garlic", required_flag=False, optional_flag=True, quantity=2, unit="clove"),
            RecipeIngredient(recipe_id, "soy_sauce", required_flag=False, pantry_flag=True, quantity=2, unit="tbsp"),
            RecipeIngredient(recipe_id, "oil", required_flag=False, pantry_flag=True, quantity=1, unit="tbsp"),
            RecipeIngredient(recipe_id, "sugar", required_flag=False, pantry_flag=True, quantity=1, unit="tsp"),
        ],
    )


def fried_rice_recipe() -> Recipe:
    recipe_id = "fried_rice"
    return Recipe(
        recipe_id=recipe_id,
        recipe_name="Egg Fried Rice",
        total_time_minutes=20,
        active_time_minutes=15,
        difficulty="easy",
        leftover_score=0.9,
        cleanup_score=0.7,
        ingredients=[
            RecipeIngredient(recipe_id, "rice", required_flag=True, quantity=2, unit="cup"),
            RecipeIngredient(recipe_id, "egg", required_flag=True, quantity=2, unit="piece"),
            RecipeIngredient(recipe_id, "scallion", required_flag=False, optional_flag=True, quantity=1, unit="stalk"),
            RecipeIngredient(recipe_id, "carrot", required_flag=False, optional_flag=True, quantity=0.5, unit="cup"),
            RecipeIngredient(recipe_id, "soy_sauce", required_flag=False, pantry_flag=True, quantity=1, unit="tbsp"),
            RecipeIngredient(recipe_id, "oil", required_flag=False, pantry_flag=True, quantity=1, unit="tbsp"),
        ],
    )


def creamy_mushroom_pasta_recipe() -> Recipe:
    recipe_id = "creamy_mushroom_pasta"
    return Recipe(
        recipe_id=recipe_id,
        recipe_name="Creamy Mushroom Pasta",
        total_time_minutes=35,
        active_time_minutes=25,
        difficulty="medium",
        leftover_score=0.5,
        cleanup_score=0.4,
        ingredients=[
            RecipeIngredient(recipe_id, "pasta", required_flag=True, quantity=8, unit="oz"),
            RecipeIngredient(recipe_id, "mushroom", required_flag=True, quantity=2, unit="cup"),
            RecipeIngredient(recipe_id, "cream", required_flag=True, quantity=0.5, unit="cup"),
            RecipeIngredient(recipe_id, "garlic", required_flag=False, optional_flag=True, quantity=2, unit="clove"),
            RecipeIngredient(recipe_id, "butter", required_flag=False, pantry_flag=True, quantity=1, unit="tbsp"),
            RecipeIngredient(recipe_id, "black_pepper", required_flag=False, pantry_flag=True, quantity=1, unit="tsp"),
        ],
    )


def tofu_vegetable_bowl_recipe() -> Recipe:
    recipe_id = "tofu_vegetable_bowl"
    return Recipe(
        recipe_id=recipe_id,
        recipe_name="Tofu Vegetable Bowl",
        total_time_minutes=30,
        active_time_minutes=20,
        difficulty="easy",
        leftover_score=0.8,
        cleanup_score=0.6,
        ingredients=[
            RecipeIngredient(recipe_id, "tofu", required_flag=True, quantity=1, unit="box"),
            RecipeIngredient(recipe_id, "rice", required_flag=True, quantity=1, unit="cup"),
            RecipeIngredient(recipe_id, "spinach", required_flag=False, optional_flag=True, quantity=1, unit="cup"),
            RecipeIngredient(recipe_id, "mushroom", required_flag=False, optional_flag=True, quantity=1, unit="cup"),
            RecipeIngredient(recipe_id, "soy_sauce", required_flag=False, pantry_flag=True, quantity=1, unit="tbsp"),
            RecipeIngredient(recipe_id, "sesame_oil", required_flag=False, pantry_flag=True, quantity=1, unit="tsp"),
        ],
    )


def cucumber_salad_recipe() -> Recipe:
    recipe_id = "cucumber_salad"
    return Recipe(
        recipe_id=recipe_id,
        recipe_name="拍黄瓜",
        total_time_minutes=10,
        active_time_minutes=10,
        difficulty="easy",
        leftover_score=0.3,
        cleanup_score=0.9,
        ingredients=[
            RecipeIngredient(recipe_id, "cucumber", required_flag=True, quantity=1, unit="piece"),
            RecipeIngredient(recipe_id, "garlic", required_flag=False, optional_flag=True, quantity=1, unit="clove"),
            RecipeIngredient(recipe_id, "vinegar", required_flag=False, pantry_flag=True, quantity=1, unit="tbsp"),
            RecipeIngredient(recipe_id, "soy_sauce", required_flag=False, pantry_flag=True, quantity=1, unit="tbsp"),
            RecipeIngredient(recipe_id, "sugar", required_flag=False, pantry_flag=True, quantity=1, unit="tsp"),
            RecipeIngredient(recipe_id, "chili_oil", required_flag=False, pantry_flag=True, quantity=1, unit="tsp"),
        ],
    )


def beef_taco_bowl_recipe() -> Recipe:
    recipe_id = "beef_taco_bowl"
    return Recipe(
        recipe_id=recipe_id,
        recipe_name="Beef Taco Bowl",
        total_time_minutes=30,
        active_time_minutes=22,
        difficulty="easy",
        leftover_score=0.8,
        cleanup_score=0.5,
        ingredients=[
            RecipeIngredient(recipe_id, "ground_beef", required_flag=True, quantity=1, unit="lb"),
            RecipeIngredient(recipe_id, "rice", required_flag=True, quantity=1, unit="cup"),
            RecipeIngredient(recipe_id, "tomato", required_flag=False, optional_flag=True, quantity=1, unit="piece"),
            RecipeIngredient(recipe_id, "lettuce", required_flag=False, optional_flag=True, quantity=1, unit="cup"),
            RecipeIngredient(recipe_id, "cheese", required_flag=False, optional_flag=True, quantity=0.5, unit="cup"),
            RecipeIngredient(recipe_id, "oil", required_flag=False, pantry_flag=True, quantity=1, unit="tbsp"),
        ],
    )


def tomato_tofu_soup_recipe() -> Recipe:
    recipe_id = "tomato_tofu_soup"
    return Recipe(
        recipe_id=recipe_id,
        recipe_name="番茄豆腐汤",
        total_time_minutes=25,
        active_time_minutes=15,
        difficulty="easy",
        leftover_score=0.6,
        cleanup_score=0.8,
        ingredients=[
            RecipeIngredient(recipe_id, "tomato", required_flag=True, quantity=2, unit="piece"),
            RecipeIngredient(recipe_id, "tofu", required_flag=True, quantity=1, unit="box"),
            RecipeIngredient(recipe_id, "egg", required_flag=False, optional_flag=True, quantity=1, unit="piece"),
            RecipeIngredient(recipe_id, "scallion", required_flag=False, optional_flag=True, quantity=1, unit="stalk"),
            RecipeIngredient(recipe_id, "salt", required_flag=False, pantry_flag=True, quantity=1, unit="tsp"),
            RecipeIngredient(recipe_id, "oil", required_flag=False, pantry_flag=True, quantity=1, unit="tsp"),
        ],
    )


def lemon_parsley_chicken_recipe() -> Recipe:
    recipe_id = "lemon_parsley_chicken"
    return Recipe(
        recipe_id=recipe_id,
        recipe_name="Lemon Parsley Chicken",
        total_time_minutes=35,
        active_time_minutes=15,
        difficulty="easy",
        leftover_score=0.7,
        cleanup_score=0.7,
        ingredients=[
            RecipeIngredient(recipe_id, "chicken_breast", required_flag=True, quantity=1, unit="lb"),
            RecipeIngredient(recipe_id, "lemon", required_flag=True, quantity=1, unit="piece"),
            RecipeIngredient(recipe_id, "parsley", required_flag=False, optional_flag=True, quantity=0.25, unit="cup"),
            RecipeIngredient(recipe_id, "garlic", required_flag=False, optional_flag=True, quantity=2, unit="clove"),
            RecipeIngredient(recipe_id, "oil", required_flag=False, pantry_flag=True, quantity=1, unit="tbsp"),
            RecipeIngredient(recipe_id, "black_pepper", required_flag=False, pantry_flag=True, quantity=1, unit="tsp"),
        ],
    )


def sample_recipes() -> list[Recipe]:
    return [
        tomato_egg_recipe(),
        chicken_curry_recipe(),
        mapo_tofu_recipe(),
        garlic_shrimp_pasta_recipe(),
        chicken_broccoli_stir_fry_recipe(),
        fried_rice_recipe(),
        creamy_mushroom_pasta_recipe(),
        tofu_vegetable_bowl_recipe(),
        cucumber_salad_recipe(),
        beef_taco_bowl_recipe(),
        tomato_tofu_soup_recipe(),
        lemon_parsley_chicken_recipe(),
    ]


def tomato_egg_inventory() -> list[UserInventoryItem]:
    return [
        UserInventoryItem("user_1", "egg", quantity=6, unit="piece"),
        UserInventoryItem("user_1", "tomato", quantity=3, unit="piece"),
        UserInventoryItem("user_1", "green onion", quantity=2, unit="stalk"),
    ]


def chicken_curry_inventory() -> list[UserInventoryItem]:
    return [
        UserInventoryItem("user_1", "chicken_breast", quantity=1, unit="lb"),
        UserInventoryItem("user_1", "potato", quantity=3, unit="piece"),
        UserInventoryItem("user_1", "curry_powder", quantity=1, unit="jar"),
    ]


def mixed_demo_inventory() -> list[UserInventoryItem]:
    return [
        UserInventoryItem("user_1", "egg", quantity=8, unit="piece"),
        UserInventoryItem("user_1", "tomato", quantity=4, unit="piece"),
        UserInventoryItem("user_1", "green onion", quantity=2, unit="stalk"),
        UserInventoryItem("user_1", "rice", quantity=3, unit="cup"),
        UserInventoryItem("user_1", "tofu", quantity=1, unit="box"),
        UserInventoryItem("user_1", "ground_beef", quantity=1, unit="lb"),
        UserInventoryItem("user_1", "pasta", quantity=1, unit="box"),
        UserInventoryItem("user_1", "button mushroom", quantity=2, unit="cup"),
        UserInventoryItem("user_1", "milk", quantity=1, unit="cup"),
        UserInventoryItem("user_1", "chicken_breast", quantity=1, unit="lb"),
        UserInventoryItem("user_1", "potato", quantity=3, unit="piece"),
        UserInventoryItem("user_1", "curry_powder", quantity=1, unit="jar"),
        UserInventoryItem("user_1", "baby spinach", quantity=1, unit="bag"),
        UserInventoryItem("user_1", "lemon", quantity=1, unit="piece"),
        UserInventoryItem("user_1", "garlic", quantity=1, unit="head"),
    ]
