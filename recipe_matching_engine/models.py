from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from datetime import date


class MatchType(StrEnum):
    EXACT = "exact"
    ALIAS = "alias"
    SUBSTITUTE = "substitute"
    MISSING = "missing"


@dataclass(frozen=True)
class Ingredient:
    ingredient_id: str
    canonical_name: str
    category: str


@dataclass(frozen=True)
class IngredientAlias:
    alias_name: str
    ingredient_id: str


@dataclass(frozen=True)
class IngredientSubstitution:
    ingredient_id: str
    substitute_ingredient_id: str
    confidence_score: float


@dataclass(frozen=True)
class RecipeIngredient:
    recipe_id: str
    ingredient_id: str
    required_flag: bool = True
    optional_flag: bool = False
    pantry_flag: bool = False
    quantity: float = 1
    unit: str = "piece"


@dataclass(frozen=True)
class Recipe:
    recipe_id: str
    recipe_name: str
    total_time_minutes: int
    active_time_minutes: int
    difficulty: str
    leftover_score: float
    cleanup_score: float
    ingredients: list[RecipeIngredient] = field(default_factory=list)


@dataclass(frozen=True)
class UserInventoryItem:
    user_id: str
    ingredient_id: str
    quantity: float = 1
    unit: str = "piece"
    expire_date: date | None = None


@dataclass(frozen=True)
class IngredientMatchDetail:
    recipe_ingredient: RecipeIngredient
    user_inventory_ingredient: UserInventoryItem | None
    match_type: MatchType
    match_score: float


@dataclass(frozen=True)
class SubstitutedIngredientDetail:
    recipe_ingredient: RecipeIngredient
    user_inventory_ingredient: UserInventoryItem
    match_score: float


@dataclass(frozen=True)
class RecipeMatchResult:
    recipe_id: str
    recipe_name: str
    match_score_percent: float
    matched_ingredients: list[IngredientMatchDetail]
    missing_required_ingredients: list[RecipeIngredient]
    missing_optional_ingredients: list[RecipeIngredient]
    substituted_ingredients: list[SubstitutedIngredientDetail]
    pantry_missing: list[RecipeIngredient]
