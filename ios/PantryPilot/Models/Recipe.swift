import Foundation
import SwiftData

@Model
final class Recipe {
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

@Model
final class RecipeIngredient {
    var name: String
    var normalizedName: String
    var quantity: Double
    var unit: String

    init(name: String, quantity: Double, unit: String) {
        self.name = name
        self.normalizedName = IngredientNormalizer.normalizeName(name)
        self.quantity = quantity
        self.unit = IngredientNormalizer.normalizeUnit(unit)
    }
}
