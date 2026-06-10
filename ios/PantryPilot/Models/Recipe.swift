import Foundation
import SwiftData

@Model
final class Recipe {
    var cloudId: String
    var cloudUpdatedAt: String
    var name: String
    var steps: [String]
    var videoURL: String
    var imageURL: String
    @Attribute(.externalStorage) var imageData: Data?
    @Attribute(.externalStorage) var imageThumbnailData: Data?
    @Attribute(.externalStorage) var videoData: Data?
    var videoFileName: String = ""
    var createdAt: Date

    @Relationship(deleteRule: .cascade)
    var ingredients: [RecipeIngredient]

    init(
        cloudId: String = "",
        cloudUpdatedAt: String = "",
        name: String,
        ingredients: [RecipeIngredient] = [],
        steps: [String] = [],
        videoURL: String = "",
        imageURL: String = "",
        imageData: Data? = nil,
        imageThumbnailData: Data? = nil,
        videoData: Data? = nil,
        videoFileName: String = ""
    ) {
        self.cloudId = cloudId
        self.cloudUpdatedAt = cloudUpdatedAt
        self.name = name
        self.ingredients = ingredients
        self.steps = steps
        self.videoURL = videoURL
        self.imageURL = imageURL
        self.imageData = imageData
        self.imageThumbnailData = imageThumbnailData
        self.videoData = videoData
        self.videoFileName = videoFileName
        self.createdAt = .now
    }
}

enum RecipeIngredientRole: String, CaseIterable, Codable, Identifiable {
    case main = "Main ingredients"
    case secondary = "Secondary ingredients"
    case seasoning = "Seasonings"

    var id: String { rawValue }
}

@Model
final class RecipeIngredient {
    var name: String
    var normalizedName: String
    var quantity: Double
    var unit: String
    var roleRaw: String = RecipeIngredientRole.main.rawValue

    init(
        name: String,
        quantity: Double,
        unit: String,
        role: RecipeIngredientRole = .main
    ) {
        self.name = name
        self.normalizedName = IngredientNormalizer.normalizeName(name)
        self.quantity = quantity
        self.unit = IngredientNormalizer.normalizeUnit(unit)
        self.roleRaw = role.rawValue
    }

    var role: RecipeIngredientRole {
        get { RecipeIngredientRole(rawValue: roleRaw) ?? .main }
        set { roleRaw = newValue.rawValue }
    }

    var displayText: String {
        "\(quantity.formatted()) \(unit) \(name)"
    }
}
