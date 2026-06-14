import SwiftData
import SwiftUI

struct CanCookView: View {
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("almostCookThreshold") private var threshold = 0.7
    @Query private var ingredients: [StoredIngredient]
    @Query private var recipes: [Recipe]
    @State private var cloudAssessments: [CloudCookAssessment] = []
    @State private var isRefreshing = false
    @State private var matchError: String?

    private var assessments: [CookAssessment] {
        recipes.map { RecipeMatcher.assess(recipe: $0, inventory: ingredients) }
    }

    private var ready: [CookAssessment] {
        assessments.filter(\.canCook)
    }

    private var almostReady: [CookAssessment] {
        assessments.filter { !$0.canCook && $0.matchRatio >= threshold }
    }

    private var cloudReady: [CloudCookAssessment] {
        cloudAssessments.filter(\.canCook)
    }

    private var cloudAlmostReady: [CloudCookAssessment] {
        cloudAssessments.filter { !$0.canCook && $0.matchRatio >= threshold }
    }

    private var useCloudMatches: Bool {
        !cloudAssessments.isEmpty
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        SummaryTile(value: useCloudMatches ? cloudReady.count : ready.count, label: L.text("dishes ready", language: appLanguage))
                        SummaryTile(value: useCloudMatches ? cloudAlmostReady.count : almostReady.count, label: L.text("almost there", language: appLanguage))
                    }
                    .listRowSeparator(.hidden)

                    if isRefreshing {
                        ProgressView()
                    }

                    if let matchError {
                        Text(matchError)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Section(L.text("Ready to cook", language: appLanguage)) {
                    if useCloudMatches {
                        if cloudReady.isEmpty {
                            Text(L.text("No full matches yet.", language: appLanguage))
                                .foregroundStyle(.secondary)
                        } else {
                            ForEach(cloudReady, id: \.recipe.id) { assessment in
                                NavigationLink {
                                    RecipeDetailView(recipe: assessment.recipe)
                                } label: {
                                    CloudCookAssessmentRow(assessment: assessment)
                                }
                            }
                        }
                    } else if ready.isEmpty {
                        Text(L.text("No full matches yet.", language: appLanguage))
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(ready, id: \.recipe.id) { assessment in
                            NavigationLink {
                                RecipeDetailView(recipe: assessment.recipe)
                            } label: {
                                CookAssessmentRow(assessment: assessment)
                            }
                        }
                    }
                }

                Section(L.text("Almost there", language: appLanguage)) {
                    if useCloudMatches {
                        if cloudAlmostReady.isEmpty {
                            Text(emptyAlmostReadyText)
                                .foregroundStyle(.secondary)
                        } else {
                            ForEach(cloudAlmostReady, id: \.recipe.id) { assessment in
                                NavigationLink {
                                    RecipeDetailView(recipe: assessment.recipe)
                                } label: {
                                    CloudCookAssessmentRow(assessment: assessment)
                                }
                            }
                        }
                    } else if almostReady.isEmpty {
                        Text(emptyAlmostReadyText)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(almostReady, id: \.recipe.id) { assessment in
                            NavigationLink {
                                RecipeDetailView(recipe: assessment.recipe)
                            } label: {
                                CookAssessmentRow(assessment: assessment)
                            }
                        }
                    }
                }
            }
            .navigationTitle(L.text("Can Cook", language: appLanguage))
            .task(id: refreshSignature) {
                await refreshCloudMatches()
            }
        }
    }

    private var emptyAlmostReadyText: String {
        if appLanguage == AppLanguage.chinese.rawValue {
            return "还没有 \(Int(threshold * 100))%+ 匹配的食谱。"
        }
        return "No \(Int(threshold * 100))%+ matches yet."
    }

    private var refreshSignature: String {
        let inventory = ingredients
            .map { "\($0.name):\($0.quantity):\($0.unit)" }
            .sorted()
            .joined(separator: "|")
        return "\(inventory)#\(recipes.count)"
    }

    private func refreshCloudMatches() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        defer { isRefreshing = false }

        do {
            try await RecipeCloudSync().sync(into: modelContext, existingRecipes: recipes)
            let matches = try await CloudRecipeMatcher().matchRecipes(inventory: ingredients)
            let latestRecipes = try modelContext.fetch(FetchDescriptor<Recipe>())
            let recipesByCloudId = Dictionary(
                uniqueKeysWithValues: latestRecipes
                    .filter { !$0.cloudId.isEmpty }
                    .map { ($0.cloudId, $0) }
            )
            cloudAssessments = matches.compactMap { match in
                guard let recipe = recipesByCloudId[match.recipeID] else {
                    return nil
                }
                return CloudCookAssessment(recipe: recipe, match: match)
            }
            matchError = nil
        } catch {
            cloudAssessments = []
            matchError = appLanguage == AppLanguage.chinese.rawValue
                ? "云端匹配暂时不可用，正在使用本地匹配。"
                : "Cloud matching is unavailable. Using local matching."
        }
    }
}

struct SummaryTile: View {
    let value: Int
    let label: String

    var body: some View {
        VStack(alignment: .leading) {
            Text("\(value)")
                .font(.largeTitle)
                .foregroundStyle(.orange)
            Text(label)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

struct CookAssessmentRow: View {
    let assessment: CookAssessment
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(assessment.recipe.name)
                        .fontWeight(.semibold)
                    Text("\(Int(assessment.matchRatio * 100))% \(L.text("Ingredients", language: appLanguage).lowercased())")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if assessment.canCook {
                    Text(L.text("Ready", language: appLanguage))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.green)
                }
            }

            if !assessment.missing.isEmpty {
                ForEach(assessment.missing) { missing in
                    Text("\(L.text("Missing", language: appLanguage)) \(missing.shortage.formatted()) \(missing.unit) \(missing.name), \(L.text("have", language: appLanguage)) \(missing.available.formatted())")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 6)
    }
}

struct CloudCookAssessment: Identifiable {
    let recipe: Recipe
    let match: CloudRecipeMatch

    var id: PersistentIdentifier { recipe.id }
    var matchRatio: Double { match.matchScorePercent / 100 }
    var canCook: Bool { match.missingRequiredIngredients.isEmpty }
}

struct CloudCookAssessmentRow: View {
    let assessment: CloudCookAssessment
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(assessment.recipe.name)
                        .fontWeight(.semibold)
                    Text("\(Int(assessment.match.matchScorePercent.rounded()))% \(L.text("Ingredients", language: appLanguage).lowercased())")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if assessment.canCook {
                    Text(L.text("Ready", language: appLanguage))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.green)
                }
            }

            ForEach(assessment.match.substitutedIngredients.prefix(3), id: \.id) { item in
                Text("\(item.recipeIngredient) -> \(item.userInventoryIngredient)")
                    .font(.footnote)
                    .foregroundStyle(.orange)
            }

            ForEach(assessment.match.missingRequiredIngredients.prefix(3), id: \.id) { item in
                Text("\(L.text("Missing", language: appLanguage)) \(item.recipeIngredient)")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 6)
    }
}

struct CloudRecipeMatcher {
    var baseURL: URL = BackendConfiguration.baseURL
    var session: URLSession = .shared

    func matchRecipes(inventory: [StoredIngredient]) async throws -> [CloudRecipeMatch] {
        let url = baseURL.appending(path: "api/recipe-matches")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(CloudRecipeMatchRequest(inventory: inventory))

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw GroceryPhotoExtractorError.badResponse("Backend did not return an HTTP response.")
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "No response body."
            throw GroceryPhotoExtractorError.badResponse("Backend returned \(httpResponse.statusCode): \(message)")
        }

        return try JSONDecoder().decode(CloudRecipeMatchResponse.self, from: data).matches
    }
}

struct CloudRecipeMatchRequest: Encodable {
    let inventory: [InventoryItem]

    init(inventory: [StoredIngredient]) {
        self.inventory = inventory.map {
            InventoryItem(name: $0.name, quantity: $0.quantity, unit: $0.unit)
        }
    }

    struct InventoryItem: Encodable {
        let name: String
        let quantity: Double
        let unit: String
    }
}

struct CloudRecipeMatchResponse: Decodable {
    let matches: [CloudRecipeMatch]
}

struct CloudRecipeMatch: Decodable {
    let recipeID: String
    let recipeName: String
    let matchScorePercent: Double
    let matchedIngredients: [CloudRecipeMatchIngredient]
    let missingRequiredIngredients: [CloudRecipeMatchIngredient]
    let missingOptionalIngredients: [CloudRecipeMatchIngredient]
    let substitutedIngredients: [CloudRecipeMatchIngredient]
    let pantryMissing: [CloudRecipeMatchIngredient]

    enum CodingKeys: String, CodingKey {
        case recipeID = "recipe_id"
        case recipeName = "recipe_name"
        case matchScorePercent = "match_score_percent"
        case matchedIngredients = "matched_ingredients"
        case missingRequiredIngredients = "missing_required_ingredients"
        case missingOptionalIngredients = "missing_optional_ingredients"
        case substitutedIngredients = "substituted_ingredients"
        case pantryMissing = "pantry_missing"
    }
}

struct CloudRecipeMatchIngredient: Decodable, Identifiable {
    let recipeIngredient: String
    let userInventoryIngredient: String
    let matchType: String
    let matchScore: Double

    var id: String {
        "\(recipeIngredient)-\(userInventoryIngredient)-\(matchType)-\(matchScore)"
    }

    enum CodingKeys: String, CodingKey {
        case recipeIngredient = "recipe_ingredient"
        case userInventoryIngredient = "user_inventory_ingredient"
        case matchType = "match_type"
        case matchScore = "match_score"
    }
}
