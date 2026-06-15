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
    var workflowStepsJSON: String = ""
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
        self.workflowStepsJSON = RecipeWorkflowStep.encode(steps.map { RecipeWorkflowStep(phase: .cook, text: $0) })
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

    var workflowSteps: [RecipeWorkflowStep] {
        let decoded = RecipeWorkflowStep.decode(workflowStepsJSON)
        if !decoded.isEmpty {
            return decoded
        }
        return steps.map { RecipeWorkflowStep(phase: .cook, text: $0) }
    }

    func setWorkflowSteps(_ newSteps: [RecipeWorkflowStep]) {
        let cleanedSteps = newSteps
            .map { $0.cleaned }
            .filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !$0.imageURLs.isEmpty }
        workflowStepsJSON = RecipeWorkflowStep.encode(cleanedSteps)
        steps = cleanedSteps.map(\.text).filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }
}

enum RecipeStepPhase: String, CaseIterable, Codable, Identifiable {
    case planning = "PLANNING"
    case prep = "PREP"
    case cook = "COOK"
    case finish = "FINISH"
    case cleanup = "CLEANUP"

    var id: String { rawValue }

    func displayName(language: String) -> String {
        switch self {
        case .planning:
            return L.text("Planning", language: language)
        case .prep:
            return L.text("Prep", language: language)
        case .cook:
            return L.text("Cook phase", language: language)
        case .finish:
            return L.text("Finish", language: language)
        case .cleanup:
            return L.text("Cleanup", language: language)
        }
    }
}

struct RecipeWorkflowStep: Codable, Identifiable, Hashable {
    var id: String = UUID().uuidString
    var phase: RecipeStepPhase = .cook
    var order: Int = 0
    var text: String
    var imageURLs: [String] = []

    var cleaned: RecipeWorkflowStep {
        var copy = self
        copy.text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        copy.imageURLs = imageURLs
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        return copy
    }

    static func encode(_ steps: [RecipeWorkflowStep]) -> String {
        guard let data = try? JSONEncoder().encode(steps),
              let json = String(data: data, encoding: .utf8) else {
            return "[]"
        }
        return json
    }

    static func decode(_ json: String) -> [RecipeWorkflowStep] {
        guard let data = json.data(using: .utf8),
              let steps = try? JSONDecoder().decode([RecipeWorkflowStep].self, from: data) else {
            return []
        }
        return steps
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

    var isMatchedToIngredientLibrary: Bool {
        !canonicalIngredientId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var displayText: String {
        "\(quantity.formatted()) \(unit) \(name)"
    }
}
