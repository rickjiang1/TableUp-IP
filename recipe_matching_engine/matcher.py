from __future__ import annotations

from dataclasses import dataclass

from .models import (
    Ingredient,
    IngredientAlias,
    IngredientMatchDetail,
    IngredientSubstitution,
    MatchType,
    Recipe,
    RecipeIngredient,
    RecipeMatchResult,
    SubstitutedIngredientDetail,
    UserInventoryItem,
)
from .scoring import score_recipe


@dataclass(frozen=True)
class NormalizedInventoryItem:
    original: UserInventoryItem
    canonical_ingredient_id: str
    resolved_by_alias: bool


class RecipeMatcher:
    def __init__(
        self,
        ingredients: list[Ingredient],
        aliases: list[IngredientAlias],
        substitutions: list[IngredientSubstitution],
    ) -> None:
        self.ingredients_by_id = {ingredient.ingredient_id: ingredient for ingredient in ingredients}
        self.ingredient_id_by_name = {
            self._key(ingredient.canonical_name): ingredient.ingredient_id
            for ingredient in ingredients
        }
        self.alias_to_ingredient_id = {
            self._key(alias.alias_name): alias.ingredient_id
            for alias in aliases
        }
        self.substitutes_by_ingredient_id: dict[str, list[IngredientSubstitution]] = {}
        for substitution in substitutions:
            self.substitutes_by_ingredient_id.setdefault(
                substitution.ingredient_id,
                [],
            ).append(substitution)

        for substitutes in self.substitutes_by_ingredient_id.values():
            substitutes.sort(key=lambda item: item.confidence_score, reverse=True)

    def rank_recipes(
        self,
        recipes: list[Recipe],
        inventory: list[UserInventoryItem],
    ) -> list[RecipeMatchResult]:
        results = [self.match_recipe(recipe, inventory) for recipe in recipes]
        return sorted(results, key=lambda result: result.match_score_percent, reverse=True)

    def match_recipe(
        self,
        recipe: Recipe,
        inventory: list[UserInventoryItem],
    ) -> RecipeMatchResult:
        normalized_inventory = self._normalize_inventory(inventory)
        inventory_by_canonical_id = {
            item.canonical_ingredient_id: item
            for item in normalized_inventory
        }

        match_details: list[IngredientMatchDetail] = []
        missing_required: list[RecipeIngredient] = []
        missing_optional: list[RecipeIngredient] = []
        pantry_missing: list[RecipeIngredient] = []
        substituted: list[SubstitutedIngredientDetail] = []
        score_inputs: list[tuple[float, RecipeIngredient]] = []

        for recipe_ingredient in recipe.ingredients:
            canonical_recipe_id = self.resolve_ingredient_id(recipe_ingredient.ingredient_id)
            inventory_match = inventory_by_canonical_id.get(canonical_recipe_id)

            if inventory_match is not None:
                match_type = MatchType.ALIAS if inventory_match.resolved_by_alias else MatchType.EXACT
                detail = IngredientMatchDetail(
                    recipe_ingredient=recipe_ingredient,
                    user_inventory_ingredient=inventory_match.original,
                    match_type=match_type,
                    match_score=1.0,
                )
            else:
                detail = self._find_substitute_match(
                    recipe_ingredient=recipe_ingredient,
                    canonical_recipe_id=canonical_recipe_id,
                    inventory_by_canonical_id=inventory_by_canonical_id,
                )

            match_details.append(detail)
            score_inputs.append((detail.match_score, recipe_ingredient))

            if detail.match_type == MatchType.SUBSTITUTE and detail.user_inventory_ingredient is not None:
                substituted.append(
                    SubstitutedIngredientDetail(
                        recipe_ingredient=recipe_ingredient,
                        user_inventory_ingredient=detail.user_inventory_ingredient,
                        match_score=detail.match_score,
                    )
                )
            elif detail.match_type == MatchType.MISSING:
                if recipe_ingredient.pantry_flag:
                    pantry_missing.append(recipe_ingredient)
                elif recipe_ingredient.optional_flag:
                    missing_optional.append(recipe_ingredient)
                else:
                    missing_required.append(recipe_ingredient)

        return RecipeMatchResult(
            recipe_id=recipe.recipe_id,
            recipe_name=recipe.recipe_name,
            match_score_percent=round(score_recipe(score_inputs) * 100, 2),
            matched_ingredients=[
                detail
                for detail in match_details
                if detail.match_type != MatchType.MISSING
            ],
            missing_required_ingredients=missing_required,
            missing_optional_ingredients=missing_optional,
            substituted_ingredients=substituted,
            pantry_missing=pantry_missing,
        )

    def resolve_ingredient_id(self, ingredient_id_or_name: str) -> str:
        key = self._key(ingredient_id_or_name)
        if ingredient_id_or_name in self.ingredients_by_id:
            return ingredient_id_or_name
        if key in self.ingredient_id_by_name:
            return self.ingredient_id_by_name[key]
        if key in self.alias_to_ingredient_id:
            return self.alias_to_ingredient_id[key]
        return ingredient_id_or_name

    def _normalize_inventory(self, inventory: list[UserInventoryItem]) -> list[NormalizedInventoryItem]:
        normalized: list[NormalizedInventoryItem] = []
        for item in inventory:
            key = self._key(item.ingredient_id)
            resolved = self.resolve_ingredient_id(item.ingredient_id)
            normalized.append(
                NormalizedInventoryItem(
                    original=item,
                    canonical_ingredient_id=resolved,
                    resolved_by_alias=key in self.alias_to_ingredient_id,
                )
            )
        return normalized

    def _find_substitute_match(
        self,
        recipe_ingredient: RecipeIngredient,
        canonical_recipe_id: str,
        inventory_by_canonical_id: dict[str, NormalizedInventoryItem],
    ) -> IngredientMatchDetail:
        for substitution in self.substitutes_by_ingredient_id.get(canonical_recipe_id, []):
            inventory_match = inventory_by_canonical_id.get(substitution.substitute_ingredient_id)
            if inventory_match is not None:
                return IngredientMatchDetail(
                    recipe_ingredient=recipe_ingredient,
                    user_inventory_ingredient=inventory_match.original,
                    match_type=MatchType.SUBSTITUTE,
                    match_score=substitution.confidence_score,
                )

        return IngredientMatchDetail(
            recipe_ingredient=recipe_ingredient,
            user_inventory_ingredient=None,
            match_type=MatchType.MISSING,
            match_score=0,
        )

    @staticmethod
    def _key(value: str) -> str:
        return value.strip().lower().replace("-", " ").replace("_", " ")
