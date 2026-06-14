import SwiftData
import SwiftUI

struct CanCookView: View {
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("almostCookThreshold") private var threshold = 0.7
    @Query private var ingredients: [StoredIngredient]
    @Query private var recipes: [Recipe]
    @State private var cloudMatches: [CloudRecipeMatch] = []
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

    private var cloudReady: [CloudRecipeMatch] {
        cloudMatches.filter(\.canCook)
    }

    private var cloudAlmostReady: [CloudRecipeMatch] {
        cloudMatches.filter { !$0.canCook && $0.matchRatio >= threshold }
    }

    private var useCloudMatches: Bool {
        !cloudMatches.isEmpty
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack {
                        SummaryTile(value: useCloudMatches ? cloudReady.count : ready.count, label: L.text("dishes ready", language: appLanguage))
                        SummaryTile(value: useCloudMatches ? cloudAlmostReady.count : almostReady.count, label: L.text("almost there", language: appLanguage))
                    }

                    if isRefreshing {
                        ProgressView()
                    }

                    if let matchError {
                        Text(matchError)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    canCookSection(title: L.text("Ready to cook", language: appLanguage)) {
                        readyRows
                    }

                    canCookSection(title: L.text("Almost there", language: appLanguage)) {
                        almostReadyRows
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle(L.text("Can Cook", language: appLanguage))
            .toolbar {
                Button {
                    Task {
                        await refreshCloudMatches()
                    }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .disabled(isRefreshing)
            }
        }
    }

    private func canCookSection<Content: View>(
        title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 0) {
                content()
            }
            .background(.background)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    @ViewBuilder
    private var readyRows: some View {
        if useCloudMatches {
            if cloudReady.isEmpty {
                emptyRow(L.text("No full matches yet.", language: appLanguage))
            } else {
                ForEach(cloudReady, id: \.recipeID) { match in
                    cloudRow(match)
                    Divider()
                }
            }
        } else if ready.isEmpty {
            emptyRow(L.text("No full matches yet.", language: appLanguage))
        } else {
            ForEach(ready, id: \.recipe.id) { assessment in
                NavigationLink {
                    RecipeDetailView(recipe: assessment.recipe)
                } label: {
                    CookAssessmentRow(assessment: assessment)
                }
                .buttonStyle(.plain)
                Divider()
            }
        }
    }

    @ViewBuilder
    private var almostReadyRows: some View {
        if useCloudMatches {
            if cloudAlmostReady.isEmpty {
                emptyRow(emptyAlmostReadyText)
            } else {
                ForEach(cloudAlmostReady, id: \.recipeID) { match in
                    cloudRow(match)
                    Divider()
                }
            }
        } else if almostReady.isEmpty {
            emptyRow(emptyAlmostReadyText)
        } else {
            ForEach(almostReady, id: \.recipe.id) { assessment in
                NavigationLink {
                    RecipeDetailView(recipe: assessment.recipe)
                } label: {
                    CookAssessmentRow(assessment: assessment)
                }
                .buttonStyle(.plain)
                Divider()
            }
        }
    }

    @ViewBuilder
    private func cloudRow(_ match: CloudRecipeMatch) -> some View {
        if let recipe = recipe(for: match) {
            NavigationLink {
                RecipeDetailView(recipe: recipe)
            } label: {
                CloudCookAssessmentRow(match: match)
            }
            .buttonStyle(.plain)
        } else {
            CloudCookAssessmentRow(match: match)
        }
    }

    private func emptyRow(_ text: String) -> some View {
        Text(text)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
    }

    private var emptyAlmostReadyText: String {
        if appLanguage == AppLanguage.chinese.rawValue {
            return "还没有 \(Int(threshold * 100))%+ 匹配的食谱。"
        }
        return "No \(Int(threshold * 100))%+ matches yet."
    }

    private func refreshCloudMatches() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        defer { isRefreshing = false }

        do {
            let matches = try await CloudRecipeMatcher().matchRecipes(inventory: ingredients)
            cloudMatches = matches
            matchError = nil
        } catch {
            cloudMatches = []
            matchError = appLanguage == AppLanguage.chinese.rawValue
                ? "云端匹配暂时不可用，正在使用本地匹配。"
                : "Cloud matching is unavailable. Using local matching."
        }
    }

    private func recipe(for match: CloudRecipeMatch) -> Recipe? {
        recipes.first { $0.cloudId == match.recipeID }
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

struct CloudCookAssessmentRow: View {
    let match: CloudRecipeMatch
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(match.recipeName)
                        .fontWeight(.semibold)
                    Text("\(Int(match.matchScorePercent.rounded()))% \(L.text("Ingredients", language: appLanguage).lowercased())")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if match.canCook {
                    Text(L.text("Ready", language: appLanguage))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.green)
                }
            }

            ForEach(match.substitutedIngredients.prefix(3), id: \.id) { item in
                Text("\(item.recipeIngredient) -> \(item.userInventoryIngredient)")
                    .font(.footnote)
                    .foregroundStyle(.orange)
            }

            ForEach(match.missingRequiredIngredients.prefix(3), id: \.id) { item in
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
        request.timeoutInterval = 20
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

    var matchRatio: Double { matchScorePercent / 100 }
    var canCook: Bool { missingRequiredIngredients.isEmpty }

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
