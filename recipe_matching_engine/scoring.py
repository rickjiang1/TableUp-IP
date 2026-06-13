from __future__ import annotations

from .models import RecipeIngredient

REQUIRED_WEIGHT = 1.0
OPTIONAL_WEIGHT = 0.3
PANTRY_WEIGHT = 0.1


def ingredient_weight(ingredient: RecipeIngredient) -> float:
    if ingredient.pantry_flag:
        return PANTRY_WEIGHT
    if ingredient.optional_flag:
        return OPTIONAL_WEIGHT
    return REQUIRED_WEIGHT


def score_recipe(match_scores: list[tuple[float, RecipeIngredient]]) -> float:
    total_weight = sum(ingredient_weight(ingredient) for _, ingredient in match_scores)
    if total_weight == 0:
        return 0

    weighted_score_sum = sum(
        match_score * ingredient_weight(ingredient)
        for match_score, ingredient in match_scores
    )
    return weighted_score_sum / total_weight
