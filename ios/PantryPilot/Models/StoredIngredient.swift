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
    var name: String
    var normalizedName: String
    var quantity: Double
    var unit: String
    var categoryRaw: String
    var locationRaw: String
    var enteredDate: Date
    var expireDate: Date
    var createdAt: Date

    init(
        name: String,
        quantity: Double,
        unit: String,
        category: IngredientCategory,
        location: StorageLocation,
        enteredDate: Date = .now,
        expireDate: Date? = nil
    ) {
        self.name = name
        self.normalizedName = IngredientNormalizer.normalizeName(name)
        self.quantity = quantity
        self.unit = IngredientNormalizer.normalizeUnit(unit)
        self.categoryRaw = category.rawValue
        self.locationRaw = location.rawValue
        self.enteredDate = enteredDate
        self.expireDate = expireDate ?? StorageAdvisor.estimatedExpireDate(
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
}
