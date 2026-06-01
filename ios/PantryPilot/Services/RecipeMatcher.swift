import Foundation

enum RecipeMatcher {
    private static let unitToBase: [String: (unit: String, factor: Double)] = [
        "kg": ("g", 1000),
        "g": ("g", 1),
        "lb": ("g", 453.592),
        "oz": ("g", 28.3495),
        "l": ("ml", 1000),
        "ml": ("ml", 1),
        "tbsp": ("ml", 14.7868),
        "tsp": ("ml", 4.92892),
        "cup": ("ml", 236.588),
        "piece": ("piece", 1),
        "clove": ("clove", 1),
        "bunch": ("bunch", 1)
    ]

    static func assess(recipe: Recipe, inventory: [StoredIngredient]) -> CookAssessment {
        var missing: [MissingIngredient] = []
        var matchedCount = 0

        for ingredient in recipe.ingredients {
            let needed = baseAmount(quantity: ingredient.quantity, unit: ingredient.unit)
            let availableBase = inventoryAmount(for: ingredient, inventory: inventory, targetBaseUnit: needed.unit)

            if availableBase + 0.0001 < needed.amount {
                missing.append(
                    MissingIngredient(
                        name: ingredient.name,
                        needed: ingredient.quantity,
                        available: amountInOriginalUnit(availableBase, originalUnit: ingredient.unit),
                        unit: ingredient.unit
                    )
                )
            } else {
                matchedCount += 1
            }
        }

        return CookAssessment(
            recipe: recipe,
            matchedCount: matchedCount,
            totalCount: recipe.ingredients.count,
            missing: missing
        )
    }

    static func usagePreview(recipe: Recipe, inventory: [StoredIngredient]) -> [IngredientUsagePreview] {
        recipe.ingredients.map { ingredient in
            let needed = baseAmount(quantity: ingredient.quantity, unit: ingredient.unit)
            let availableBase = inventoryAmount(for: ingredient, inventory: inventory, targetBaseUnit: needed.unit)
            let leftoverBase = max(availableBase - needed.amount, 0)

            return IngredientUsagePreview(
                name: ingredient.name,
                unit: ingredient.unit,
                needed: ingredient.quantity,
                available: amountInOriginalUnit(availableBase, originalUnit: ingredient.unit),
                leftover: amountInOriginalUnit(leftoverBase, originalUnit: ingredient.unit)
            )
        }
    }

    static func subtract(recipe: Recipe, from inventory: [StoredIngredient]) {
        for ingredient in recipe.ingredients {
            var remaining = baseAmount(quantity: ingredient.quantity, unit: ingredient.unit).amount
            let targetBaseUnit = baseAmount(quantity: ingredient.quantity, unit: ingredient.unit).unit

            for stored in inventory where remaining > 0 && stored.normalizedName == ingredient.normalizedName {
                let storedBase = baseAmount(quantity: stored.quantity, unit: stored.unit)
                guard storedBase.unit == targetBaseUnit else { continue }

                let used = min(storedBase.amount, remaining)
                let converter = unitToBase[stored.unit] ?? (stored.unit, 1)
                stored.quantity = max(0, stored.quantity - used / converter.factor)
                remaining -= used
            }
        }
    }

    private static func inventoryAmount(
        for ingredient: RecipeIngredient,
        inventory: [StoredIngredient],
        targetBaseUnit: String
    ) -> Double {
        inventory
            .filter { $0.normalizedName == ingredient.normalizedName }
            .map { baseAmount(quantity: $0.quantity, unit: $0.unit) }
            .filter { $0.unit == targetBaseUnit }
            .reduce(0) { $0 + $1.amount }
    }

    private static func baseAmount(quantity: Double, unit: String) -> (amount: Double, unit: String) {
        let normalizedUnit = IngredientNormalizer.normalizeUnit(unit)
        guard let converter = unitToBase[normalizedUnit] else {
            return (quantity, normalizedUnit)
        }
        return (quantity * converter.factor, converter.unit)
    }

    private static func amountInOriginalUnit(_ baseAmount: Double, originalUnit: String) -> Double {
        let normalizedUnit = IngredientNormalizer.normalizeUnit(originalUnit)
        guard let converter = unitToBase[normalizedUnit] else {
            return baseAmount
        }
        return baseAmount / converter.factor
    }
}
