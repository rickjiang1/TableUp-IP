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
    ]


def sample_aliases() -> list[IngredientAlias]:
    return [
        IngredientAlias("green onion", "scallion"),
        IngredientAlias("spring onion", "scallion"),
    ]


def sample_substitutions() -> list[IngredientSubstitution]:
    return [
        IngredientSubstitution("chicken_thigh", "chicken_breast", 0.8),
        IngredientSubstitution("curry_block", "curry_powder", 0.7),
        IngredientSubstitution("cilantro", "parsley", 0.7),
        IngredientSubstitution("heavy_cream", "milk", 0.6),
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


def sample_recipes() -> list[Recipe]:
    return [tomato_egg_recipe(), chicken_curry_recipe()]


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
