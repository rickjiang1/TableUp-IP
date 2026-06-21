import Foundation
import SwiftData

enum IngredientCategory: String, CaseIterable, Codable, Identifiable {
    case meat = "Meat"
    case seafood = "Seafood"
    case vegetable = "Vegetable"
    case fruit = "Fruit"
    case dairy = "Dairy"
    case grain = "Grain"
    case sauce = "Sauce"
    case spice = "Spice"
    case other = "Other"

    var id: String { rawValue }
}

enum StorageLocation: String, CaseIterable, Codable, Identifiable {
    case fridge = "Fridge"
    case freezer = "Freezer"
    case pantry = "Pantry"
    case counter = "Counter"

    var id: String { rawValue }
}

@Model
final class StoredIngredient {
    var cloudClientId: String = UUID().uuidString
    var cloudUpdatedAt: Date?
    var name: String
    var normalizedName: String
    var descriptionText: String = ""
    var canonicalIngredientId: String = ""
    var canonicalQuantity: Double = 0
    var canonicalUnit: String = ""
    var unitConversionRatio: Double = 0
    var unitConversionNeedsReview: Bool = false
    var unitConversionReviewReason: String = ""
    var quantity: Double
    var unit: String
    var categoryRaw: String
    var locationRaw: String
    var enteredDate: Date
    var expireDate: Date
    var createdAt: Date

    init(
        cloudClientId: String = UUID().uuidString,
        name: String,
        descriptionText: String = "",
        canonicalIngredientId: String = "",
        canonicalQuantity: Double = 0,
        canonicalUnit: String = "",
        unitConversionRatio: Double = 0,
        unitConversionNeedsReview: Bool = false,
        unitConversionReviewReason: String = "",
        quantity: Double,
        unit: String,
        category: IngredientCategory,
        location: StorageLocation,
        enteredDate: Date = .now,
        expireDate: Date? = nil
    ) {
        self.cloudClientId = cloudClientId
        self.name = name
        self.normalizedName = IngredientNormalizer.normalizeName(name)
        self.descriptionText = descriptionText
        self.canonicalIngredientId = canonicalIngredientId
        self.canonicalQuantity = canonicalQuantity
        self.canonicalUnit = canonicalUnit
        self.unitConversionRatio = unitConversionRatio
        self.unitConversionNeedsReview = unitConversionNeedsReview
        self.unitConversionReviewReason = unitConversionReviewReason
        self.quantity = quantity
        self.unit = IngredientNormalizer.normalizeUnit(unit)
        self.categoryRaw = category.rawValue
        self.locationRaw = location.rawValue
        self.enteredDate = enteredDate
        self.expireDate = expireDate ?? StorageAdvisor.estimatedExpireDate(
            name: name,
            canonicalIngredientId: canonicalIngredientId,
            category: category,
            location: location,
            enteredDate: enteredDate
        )
        self.createdAt = .now
    }

    var category: IngredientCategory {
        get { IngredientCategory(rawValue: categoryRaw) ?? .other }
        set { categoryRaw = newValue.rawValue }
    }

    var location: StorageLocation {
        get { StorageLocation(rawValue: locationRaw) ?? .fridge }
        set { locationRaw = newValue.rawValue }
    }

    var displayName: String {
        "\(name) (\(quantity.formatted()) \(unit))"
    }

    var isMatchedToIngredientLibrary: Bool {
        !canonicalIngredientId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}
