import Foundation
import SwiftData

@Model
final class Recipe {
    var cloudId: String
    var cloudUpdatedAt: String
    var sourceRaw: String = RecipeSource.user.rawValue
    var folderId: String = ""
    var name: String
    var steps: [String]
    var videoURL: String
    var imageURL: String
    var totalTimeMinutes: Int = 0
    var activeTimeMinutes: Int = 0
    var difficultyRaw: String = RecipeDifficulty.medium.rawValue
    var leftoverScore: Double = 50
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
        source: RecipeSource = .user,
        folderId: String = "",
        name: String,
        ingredients: [RecipeIngredient] = [],
        steps: [String] = [],
        videoURL: String = "",
        imageURL: String = "",
        totalTimeMinutes: Int = 0,
        activeTimeMinutes: Int = 0,
        difficulty: RecipeDifficulty = .medium,
        leftoverScore: Double = 50,
        imageData: Data? = nil,
        imageThumbnailData: Data? = nil,
        videoData: Data? = nil,
        videoFileName: String = ""
    ) {
        self.cloudId = cloudId
        self.cloudUpdatedAt = cloudUpdatedAt
        self.sourceRaw = source.rawValue
        self.folderId = folderId
        self.name = name
        self.ingredients = ingredients
        self.steps = steps
        self.videoURL = videoURL
        self.imageURL = imageURL
        self.totalTimeMinutes = totalTimeMinutes
        self.activeTimeMinutes = activeTimeMinutes
        self.difficultyRaw = difficulty.rawValue
        self.leftoverScore = leftoverScore
        self.imageData = imageData
        self.imageThumbnailData = imageThumbnailData
        self.videoData = videoData
        self.videoFileName = videoFileName
        self.createdAt = .now
    }

    var source: RecipeSource {
        get { RecipeSource(rawValue: sourceRaw) ?? .user }
        set { sourceRaw = newValue.rawValue }
    }

    var difficulty: RecipeDifficulty {
        get { RecipeDifficulty(rawValue: difficultyRaw) ?? .medium }
        set { difficultyRaw = newValue.rawValue }
    }
}

enum RecipeSource: String, CaseIterable, Identifiable {
    case central
    case user

    var id: String { rawValue }
}

enum RecipeDifficulty: String, CaseIterable, Codable, Identifiable {
    case easy = "Easy"
    case medium = "Medium"
    case hard = "Hard"

    var id: String { rawValue }
}

@Model
final class RecipeFolder {
    var id: String
    var sourceRaw: String
    var parentId: String
    var name: String
    var createdAt: Date

    init(
        id: String = UUID().uuidString,
        source: RecipeSource = .user,
        parentId: String = "",
        name: String
    ) {
        self.id = id
        self.sourceRaw = source.rawValue
        self.parentId = parentId
        self.name = name
        self.createdAt = .now
    }

    var source: RecipeSource {
        get { RecipeSource(rawValue: sourceRaw) ?? .user }
        set { sourceRaw = newValue.rawValue }
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
    var canonicalIngredientId: String = ""
    var quantity: Double
    var unit: String
    var roleRaw: String = RecipeIngredientRole.main.rawValue

    init(
        name: String,
        canonicalIngredientId: String = "",
        quantity: Double,
        unit: String,
        role: RecipeIngredientRole = .main
    ) {
        self.name = name
        self.normalizedName = IngredientNormalizer.normalizeName(name)
        self.canonicalIngredientId = canonicalIngredientId
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
