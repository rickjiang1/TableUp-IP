import Foundation

enum IngredientNormalizer {
    private static let unitAliases: [String: String] = [
        "pounds": "lb",
        "pound": "lb",
        "lbs": "lb",
        "grams": "g",
        "gram": "g",
        "kilograms": "kg",
        "kilogram": "kg",
        "ounces": "oz",
        "ounce": "oz",
        "tablespoons": "tbsp",
        "tablespoon": "tbsp",
        "teaspoons": "tsp",
        "teaspoon": "tsp",
        "pieces": "piece",
        "pcs": "piece",
        "cloves": "clove",
        "cups": "cup",
        "milliliters": "ml",
        "milliliter": "ml",
        "liters": "l",
        "liter": "l"
    ]

    static func normalizeName(_ value: String) -> String {
        value
            .lowercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
    }

    static func normalizeUnit(_ value: String) -> String {
        let clean = value.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        return unitAliases[clean] ?? clean
    }

    static func category(for name: String) -> IngredientCategory {
        let normalized = normalizeName(name)
        let keywords: [IngredientCategory: [String]] = [
            .meat: ["beef", "chicken", "pork", "lamb", "turkey", "sausage", "bacon", "ham", "steak"],
            .seafood: ["fish", "shrimp", "salmon", "tuna", "cod", "crab", "scallop"],
            .vegetable: ["tomato", "broccoli", "onion", "garlic", "carrot", "lettuce", "spinach", "pepper", "potato", "cabbage", "celery", "mushroom"],
            .fruit: ["apple", "banana", "orange", "lemon", "lime", "berry", "grape", "mango", "avocado"],
            .dairy: ["milk", "cheese", "butter", "yogurt", "cream", "egg"],
            .grain: ["rice", "pasta", "noodle", "flour", "bread", "oat", "quinoa"],
            .sauce: ["sauce", "soy", "vinegar", "oil", "ketchup", "mustard", "mayonnaise", "dressing"],
            .spice: ["salt", "pepper", "paprika", "cumin", "oregano", "basil", "chili", "cinnamon", "spice"]
        ]

        return keywords.first { _, words in
            words.contains { normalized.contains($0) }
        }?.key ?? .other
    }
}
