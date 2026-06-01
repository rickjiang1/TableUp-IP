import Foundation

enum StorageApproach: String, CaseIterable, Identifiable {
    case cold = "Cold"
    case frozen = "Frozen"
    case roomTemperature = "Room temp"

    var id: String { rawValue }
}

struct StorageRecommendation: Identifiable {
    let id = UUID()
    let approach: StorageApproach
    let expireDate: Date
    let isRecommended: Bool
}

enum StorageAdvisor {
    private static let shelfLife: [IngredientCategory: [StorageApproach: Int]] = [
        .meat: [.cold: 3, .frozen: 180, .roomTemperature: 0],
        .seafood: [.cold: 2, .frozen: 90, .roomTemperature: 0],
        .vegetable: [.cold: 7, .frozen: 240, .roomTemperature: 2],
        .fruit: [.cold: 7, .frozen: 180, .roomTemperature: 3],
        .dairy: [.cold: 10, .frozen: 60, .roomTemperature: 0],
        .grain: [.cold: 180, .frozen: 365, .roomTemperature: 180],
        .sauce: [.cold: 120, .frozen: 180, .roomTemperature: 30],
        .spice: [.cold: 365, .frozen: 365, .roomTemperature: 365],
        .other: [.cold: 14, .frozen: 90, .roomTemperature: 7]
    ]

    private static let recommended: [IngredientCategory: StorageApproach] = [
        .meat: .frozen,
        .seafood: .frozen,
        .vegetable: .cold,
        .fruit: .cold,
        .dairy: .cold,
        .grain: .roomTemperature,
        .sauce: .roomTemperature,
        .spice: .roomTemperature,
        .other: .cold
    ]

    static func approach(for location: StorageLocation) -> StorageApproach {
        switch location {
        case .freezer:
            return .frozen
        case .pantry, .counter:
            return .roomTemperature
        case .fridge:
            return .cold
        }
    }

    static func estimatedExpireDate(
        category: IngredientCategory,
        location: StorageLocation,
        enteredDate: Date
    ) -> Date {
        let approach = approach(for: location)
        return estimatedExpireDate(category: category, approach: approach, enteredDate: enteredDate)
    }

    static func estimatedExpireDate(
        category: IngredientCategory,
        approach: StorageApproach,
        enteredDate: Date
    ) -> Date {
        let days = shelfLife[category]?[approach] ?? 14
        return Calendar.current.date(byAdding: .day, value: days, to: enteredDate) ?? enteredDate
    }

    static func recommendations(for ingredient: StoredIngredient) -> [StorageRecommendation] {
        let best = recommended[ingredient.category] ?? .cold
        return StorageApproach.allCases.map { approach in
            StorageRecommendation(
                approach: approach,
                expireDate: estimatedExpireDate(
                    category: ingredient.category,
                    approach: approach,
                    enteredDate: ingredient.enteredDate
                ),
                isRecommended: approach == best
            )
        }
    }
}
