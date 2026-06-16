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
        "liter": "l",
        "bottles": "bottle",
        "cans": "can",
        "bags": "bag",
        "packs": "pack",
        "packages": "pack",
        "box": "pack",
        "boxes": "pack",
        "carton": "pack",
        "cartons": "pack",
        "个": "piece",
        "根": "piece",
        "颗": "piece",
        "只": "piece",
        "条": "piece",
        "片": "piece",
        "克": "g",
        "千克": "kg",
        "公斤": "kg",
        "磅": "lb",
        "盎司": "oz",
        "毫升": "ml",
        "升": "l",
        "茶匙": "tsp",
        "汤匙": "tbsp",
        "杯": "cup",
        "瓣": "clove",
        "把": "bunch",
        "瓶": "bottle",
        "罐": "can",
        "袋": "bag",
        "包": "pack",
        "盒": "pack",
        "盒装": "pack",
        "斤": "jin",
        "tray": "pack",
        "trays": "pack"
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

enum IngredientUnit: String, CaseIterable, Identifiable {
    case piece
    case g
    case kg
    case lb
    case oz
    case ml
    case l
    case tsp
    case tbsp
    case cup
    case clove
    case bunch
    case bottle
    case can
    case bag
    case pack

    var id: String { rawValue }

    static func normalizedSelection(for value: String) -> String {
        let normalized = IngredientNormalizer.normalizeUnit(value)
        return normalized.isEmpty ? Self.piece.rawValue : normalized
    }
}
