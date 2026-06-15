export interface IngredientUnitConversionRule {
  ingredient_id: string;
  from_unit: string;
  to_unit: string;
  ratio: number;
  conversion_type?: string;
  is_default?: boolean;
  notes?: string;
}

export interface IngredientForUnitConversion {
  ingredient_id: string;
  canonical_name?: string;
  category?: string;
  canonical_unit?: string;
}

export interface NormalizeIngredientQuantityInput {
  ingredientName: string;
  ingredientId?: string;
  quantity: number;
  unit: string;
}

export interface NormalizedIngredientQuantity {
  ingredientName: string;
  rawQuantity: number;
  rawUnit: string;
  canonicalQuantity?: number;
  canonicalUnit?: string;
  conversionRatio?: number;
  needsReview: boolean;
  reason?: string;
}

const unitAliases = new Map<string, string>([
  ["head", "head"], ["heads", "head"], ["bulb", "bulb"], ["bulbs", "bulb"], ["whole", "whole"],
  ["piece", "piece"], ["pieces", "piece"], ["pc", "piece"], ["pcs", "piece"], ["each", "piece"],
  ["clove", "clove"], ["cloves", "clove"],
  ["tablespoon", "tbsp"], ["tablespoons", "tbsp"], ["tbsp", "tbsp"], ["tbs", "tbsp"],
  ["teaspoon", "tsp"], ["teaspoons", "tsp"], ["tsp", "tsp"],
  ["g", "gram"], ["gram", "gram"], ["grams", "gram"],
  ["kg", "kg"], ["kilogram", "kg"], ["kilograms", "kg"],
  ["ml", "ml"], ["milliliter", "ml"], ["milliliters", "ml"],
  ["l", "l"], ["liter", "l"], ["liters", "l"],
  ["cup", "cup"], ["cups", "cup"],
  ["oz", "oz"], ["ounce", "oz"], ["ounces", "oz"],
  ["lb", "lb"], ["lbs", "lb"], ["pound", "lb"], ["pounds", "lb"],
  ["斤", "jin"], ["克", "gram"], ["毫升", "ml"], ["杯", "cup"], ["瓣", "clove"]
]);

export function normalizeUnitAlias(unit: string): string {
  const normalized = String(unit || "")
    .trim()
    .toLowerCase()
    .replace(/[().]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
  return unitAliases.get(normalized) || normalized || "piece";
}

export function normalizeIngredientQuantity(
  input: NormalizeIngredientQuantityInput,
  options: {
    ingredient?: IngredientForUnitConversion;
    conversions: IngredientUnitConversionRule[];
  }
): NormalizedIngredientQuantity {
  const rawQuantity = Number.isFinite(Number(input.quantity)) ? Number(input.quantity) : 1;
  const rawUnit = String(input.unit || "piece").trim() || "piece";
  const ingredientId = options.ingredient?.ingredient_id || input.ingredientId || "";
  const canonicalUnit = options.ingredient?.canonical_unit || "";
  const fromUnit = normalizeUnitAlias(rawUnit);
  const rule = options.conversions.find((candidate) =>
    candidate.ingredient_id === ingredientId &&
    normalizeUnitAlias(candidate.from_unit) === fromUnit &&
    normalizeUnitAlias(candidate.to_unit) === normalizeUnitAlias(canonicalUnit)
  );

  if (!ingredientId || !canonicalUnit || !rule) {
    return {
      ingredientName: input.ingredientName,
      rawQuantity,
      rawUnit,
      needsReview: true,
      reason: "Missing conversion rule"
    };
  }

  return {
    ingredientName: input.ingredientName,
    rawQuantity,
    rawUnit,
    canonicalQuantity: rawQuantity * Number(rule.ratio),
    canonicalUnit: normalizeUnitAlias(canonicalUnit),
    conversionRatio: Number(rule.ratio),
    needsReview: false
  };
}
