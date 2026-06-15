import Foundation

struct CookAssessment {
    let recipe: Recipe
    let matchedCount: Int
    let totalCount: Int
    let missing: [MissingIngredient]

    var canCook: Bool { missing.isEmpty }
    var matchRatio: Double {
        totalCount == 0 ? 0 : Double(matchedCount) / Double(totalCount)
    }
}

struct MissingIngredient: Identifiable {
    let id = UUID()
    let name: String
    let needed: Double
    let available: Double
    let unit: String

    var shortage: Double {
        max(needed - available, 0)
    }
}

struct IngredientUsagePreview: Identifiable {
    let id = UUID()
    let name: String
    let unit: String
    let needed: Double
    let available: Double
    let leftover: Double
}

struct ConsumedIngredient: Identifiable {
    let id = UUID()
    let name: String
    let quantity: Double
    let unit: String
}
