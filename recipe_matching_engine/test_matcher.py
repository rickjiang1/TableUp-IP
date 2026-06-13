from __future__ import annotations

import unittest

from .matcher import RecipeMatcher
from .models import MatchType, Recipe, RecipeIngredient, UserInventoryItem
from .sample_data import (
    chicken_curry_inventory,
    chicken_curry_recipe,
    sample_aliases,
    sample_ingredients,
    sample_recipes,
    sample_substitutions,
    tomato_egg_inventory,
    tomato_egg_recipe,
)


class RecipeMatcherTest(unittest.TestCase):
    def setUp(self) -> None:
        self.matcher = RecipeMatcher(
            ingredients=sample_ingredients(),
            aliases=sample_aliases(),
            substitutions=sample_substitutions(),
        )

    def test_exact_match(self) -> None:
        result = self.matcher.match_recipe(
            tomato_egg_recipe(),
            [UserInventoryItem("user_1", "egg"), UserInventoryItem("user_1", "tomato")],
        )

        egg_match = self._match_for(result.matched_ingredients, "egg")
        self.assertEqual(egg_match.match_type, MatchType.EXACT)
        self.assertEqual(egg_match.match_score, 1.0)

    def test_alias_match(self) -> None:
        result = self.matcher.match_recipe(tomato_egg_recipe(), tomato_egg_inventory())

        scallion_match = self._match_for(result.matched_ingredients, "scallion")
        self.assertEqual(scallion_match.match_type, MatchType.ALIAS)
        self.assertEqual(scallion_match.match_score, 1.0)
        self.assertEqual(scallion_match.user_inventory_ingredient.ingredient_id, "green onion")

    def test_substitute_match(self) -> None:
        result = self.matcher.match_recipe(chicken_curry_recipe(), chicken_curry_inventory())

        chicken_match = self._match_for(result.matched_ingredients, "chicken_thigh")
        curry_match = self._match_for(result.matched_ingredients, "curry_block")
        self.assertEqual(chicken_match.match_type, MatchType.SUBSTITUTE)
        self.assertEqual(chicken_match.match_score, 0.8)
        self.assertEqual(curry_match.match_type, MatchType.SUBSTITUTE)
        self.assertEqual(curry_match.match_score, 0.7)
        self.assertEqual(len(result.substituted_ingredients), 2)

    def test_missing_required_ingredient(self) -> None:
        result = self.matcher.match_recipe(
            tomato_egg_recipe(),
            [UserInventoryItem("user_1", "egg")],
        )

        self.assertEqual([item.ingredient_id for item in result.missing_required_ingredients], ["tomato"])
        self.assertLess(result.match_score_percent, 60)

    def test_optional_ingredient_penalty_is_small(self) -> None:
        recipe = Recipe(
            recipe_id="optional_only",
            recipe_name="Optional Only",
            total_time_minutes=10,
            active_time_minutes=5,
            difficulty="easy",
            leftover_score=0.5,
            cleanup_score=0.5,
            ingredients=[
                RecipeIngredient("optional_only", "egg", required_flag=True),
                RecipeIngredient("optional_only", "tomato", required_flag=True),
                RecipeIngredient("optional_only", "scallion", required_flag=False, optional_flag=True),
            ],
        )
        with_optional = self.matcher.match_recipe(recipe, tomato_egg_inventory())
        without_optional = self.matcher.match_recipe(
            recipe,
            [UserInventoryItem("user_1", "egg"), UserInventoryItem("user_1", "tomato")],
        )

        self.assertGreater(with_optional.match_score_percent, without_optional.match_score_percent)
        self.assertGreater(without_optional.match_score_percent, 85)
        self.assertEqual([item.ingredient_id for item in without_optional.missing_optional_ingredients], ["scallion"])

    def test_pantry_item_penalty_is_tiny(self) -> None:
        result = self.matcher.match_recipe(tomato_egg_recipe(), tomato_egg_inventory())

        self.assertEqual([item.ingredient_id for item in result.pantry_missing], ["salt", "oil"])
        self.assertGreaterEqual(result.match_score_percent, 92)

    def test_ranked_recipe_output(self) -> None:
        results = self.matcher.rank_recipes(sample_recipes(), tomato_egg_inventory())

        self.assertEqual(results[0].recipe_id, "tomato_egg")
        self.assertGreater(results[0].match_score_percent, results[1].match_score_percent)

    def test_recipe_with_only_pantry_missing_stays_high(self) -> None:
        result = self.matcher.match_recipe(
            chicken_curry_recipe(),
            chicken_curry_inventory(),
        )

        self.assertEqual([item.ingredient_id for item in result.missing_optional_ingredients], ["carrot"])
        self.assertEqual([item.ingredient_id for item in result.pantry_missing], ["salt", "oil"])
        self.assertEqual(result.match_score_percent, 71.43)

    @staticmethod
    def _match_for(matches, ingredient_id):
        for match in matches:
            if match.recipe_ingredient.ingredient_id == ingredient_id:
                return match
        raise AssertionError(f"No match found for {ingredient_id}")


if __name__ == "__main__":
    unittest.main()
