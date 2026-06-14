import Foundation

enum FridgeRescueScorer {
    static func score(recipe: Recipe, inventory: [StoredIngredient]) -> Int {
        let relevantIngredients = recipe.ingredients.filter { $0.role != .seasoning }
        guard !relevantIngredients.isEmpty else { return 0 }

        var weightedValue = 0.0
        var totalWeight = 0.0

        for ingredient in relevantIngredients {
            let matchingInventory = inventory.filter { $0.normalizedName == ingredient.normalizedName }
            guard !matchingInventory.isEmpty else {
                totalWeight += 1
                continue
            }

            let bestUrgency = matchingInventory
                .map { urgencyScore(expireDate: $0.expireDate) }
                .max() ?? 0

            let bestQuantityFit = matchingInventory
                .map { quantityFit(recipeIngredient: ingredient, inventoryItem: $0) }
                .max() ?? 0

            weightedValue += bestUrgency * bestQuantityFit
            totalWeight += 1
        }

        guard totalWeight > 0 else { return 0 }
        return Int((weightedValue / totalWeight * 100).rounded())
    }

    private static func urgencyScore(expireDate: Date) -> Double {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        let expirationDay = calendar.startOfDay(for: expireDate)
        let days = calendar.dateComponents([.day], from: today, to: expirationDay).day ?? 30

        if days < 0 { return 1.0 }
        if days == 0 { return 0.95 }
        if days <= 2 { return 0.85 }
        if days <= 5 { return 0.65 }
        if days <= 7 { return 0.45 }
        return 0.15
    }

    private static func quantityFit(recipeIngredient: RecipeIngredient, inventoryItem: StoredIngredient) -> Double {
        if IngredientNormalizer.normalizeUnit(recipeIngredient.unit) == IngredientNormalizer.normalizeUnit(inventoryItem.unit) {
            guard recipeIngredient.quantity > 0 else { return 1 }
            return min(inventoryItem.quantity / recipeIngredient.quantity, 1)
        }

        return 1
    }
}
