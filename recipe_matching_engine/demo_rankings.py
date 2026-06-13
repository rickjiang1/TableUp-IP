from __future__ import annotations

from .matcher import RecipeMatcher
from .sample_data import (
    mixed_demo_inventory,
    sample_aliases,
    sample_ingredients,
    sample_recipes,
    sample_substitutions,
)


def main() -> None:
    matcher = RecipeMatcher(
        ingredients=sample_ingredients(),
        aliases=sample_aliases(),
        substitutions=sample_substitutions(),
    )
    results = matcher.rank_recipes(sample_recipes(), mixed_demo_inventory())

    for index, result in enumerate(results, start=1):
        print(f"{index:02d}. {result.recipe_name} ({result.recipe_id}) - {result.match_score_percent:.2f}%")
        if result.missing_required_ingredients:
            missing = ", ".join(item.ingredient_id for item in result.missing_required_ingredients)
            print(f"    missing required: {missing}")
        if result.missing_optional_ingredients:
            missing = ", ".join(item.ingredient_id for item in result.missing_optional_ingredients)
            print(f"    missing optional: {missing}")
        if result.substituted_ingredients:
            substitutions = ", ".join(
                f"{item.recipe_ingredient.ingredient_id}->{item.user_inventory_ingredient.ingredient_id}"
                for item in result.substituted_ingredients
            )
            print(f"    substitutions: {substitutions}")
        if result.pantry_missing:
            missing = ", ".join(item.ingredient_id for item in result.pantry_missing)
            print(f"    pantry missing: {missing}")


if __name__ == "__main__":
    main()
