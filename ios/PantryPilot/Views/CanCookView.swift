import SwiftData
import SwiftUI

struct CanCookView: View {
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("almostCookThreshold") private var threshold = 0.7
    @Query private var ingredients: [StoredIngredient]
    @Query private var recipes: [Recipe]
    @State private var cloudMatches: [CloudRecipeMatch] = []
    @State private var isRefreshing = false
    @State private var hasMatched = false
    @State private var matchError: String?

    private var assessments: [CookAssessment] {
        recipes.map { RecipeMatcher.assess(recipe: $0, inventory: ingredients) }
    }

    private var ready: [CookAssessment] {
        assessments.filter { $0.matchRatio >= threshold }
    }

    private var almostReady: [CookAssessment] {
        assessments.filter { $0.matchRatio >= 0.3 && $0.matchRatio < threshold }
    }

    private var cloudReady: [CloudRecipeMatch] {
        cloudMatches.filter { $0.matchRatio >= threshold }
    }

    private var cloudAlmostReady: [CloudRecipeMatch] {
        cloudMatches.filter { $0.matchRatio >= 0.3 && $0.matchRatio < threshold }
    }

    private var useCloudMatches: Bool {
        hasMatched && !cloudMatches.isEmpty
    }

    private var readyCount: Int {
        guard hasMatched else { return 0 }
        return useCloudMatches ? cloudReady.count : ready.count
    }

    private var almostReadyCount: Int {
        guard hasMatched else { return 0 }
        return useCloudMatches ? cloudAlmostReady.count : almostReady.count
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        HStack {
                            SummaryTile(value: readyCount, label: L.text("dishes ready", language: appLanguage))
                            SummaryTile(value: almostReadyCount, label: L.text("almost there", language: appLanguage))
                        }

                        if isRefreshing {
                            ProgressView()
                        }

                        if let matchError {
                            Text(matchError)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }

                        if hasMatched {
                            canCookSection(title: L.text("Ready to cook", language: appLanguage)) {
                                readyRows
                            }

                            canCookSection(title: L.text("Almost there", language: appLanguage)) {
                                almostReadyRows
                            }
                        }
                    }
                    .padding()
                }
                .background(Color(.systemGroupedBackground))

                Button {
                    Task {
                        await refreshCloudMatches()
                    }
                } label: {
                    HStack {
                        if isRefreshing {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(L.text("Match Recipes", language: appLanguage))
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
                .disabled(isRefreshing)
                .frame(maxWidth: .infinity)
                .controlSize(.large)
                .padding()
                .background(.bar)
            }
            .navigationTitle(L.text("Can Cook", language: appLanguage))
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
                    RecipeDetailView(recipe: assessment.recipe, assessment: assessment)
                } label: {
                    CookAssessmentRow(
                        assessment: assessment,
                        fridgeRescueScore: FridgeRescueScorer.score(recipe: assessment.recipe, inventory: ingredients)
                    )
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
                    RecipeDetailView(recipe: assessment.recipe, assessment: assessment)
                } label: {
                    CookAssessmentRow(
                        assessment: assessment,
                        fridgeRescueScore: FridgeRescueScorer.score(recipe: assessment.recipe, inventory: ingredients)
                    )
                }
                .buttonStyle(.plain)
                Divider()
            }
        }
    }

    @ViewBuilder
    private func cloudRow(_ match: CloudRecipeMatch) -> some View {
        if let recipe = localRecipe(for: match) {
            NavigationLink {
                RecipeDetailView(recipe: recipe, cloudMatch: match)
            } label: {
                CloudCookAssessmentRow(
                    match: match,
                    recipe: recipe,
                    fridgeRescueScore: FridgeRescueScorer.score(recipe: recipe, inventory: ingredients)
                )
            }
            .buttonStyle(.plain)
        } else {
            CloudCookAssessmentRow(match: match, recipe: nil, fridgeRescueScore: nil)
        }
    }

    private func localRecipe(for match: CloudRecipeMatch) -> Recipe? {
        if let recipe = recipes.first(where: { !$0.cloudId.isEmpty && $0.cloudId == match.recipeID }) {
            return recipe
        }

        let normalizedMatchName = IngredientNormalizer.normalizeName(match.recipeName)
        return recipes.first {
            IngredientNormalizer.normalizeName($0.name) == normalizedMatchName
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
            return "还没有 30%-\(Int(threshold * 100))% 的匹配食谱。"
        }
        return "No 30%-\(Int(threshold * 100))% matches yet."
    }

    private func refreshCloudMatches() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        hasMatched = false
        cloudMatches = []
        matchError = nil
        defer { isRefreshing = false }

        do {
            let matches = try await CloudRecipeMatcher().matchRecipes(inventory: ingredients)
            cloudMatches = matches
            hasMatched = true
            matchError = nil
        } catch {
            cloudMatches = []
            hasMatched = true
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
    let fridgeRescueScore: Int
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("almostCookThreshold") private var threshold = 0.7

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

                if assessment.matchRatio >= threshold {
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

            RecipeDecisionMetrics(
                matchPercent: Int((assessment.matchRatio * 100).rounded()),
                fridgeRescueScore: fridgeRescueScore,
                totalTimeMinutes: assessment.recipe.totalTimeMinutes,
                activeTimeMinutes: assessment.recipe.activeTimeMinutes,
                difficulty: assessment.recipe.difficulty,
                leftoverScore: assessment.recipe.leftoverScore
            )
        }
        .padding(.vertical, 6)
    }
}

struct RecipeDecisionMetrics: View {
    let matchPercent: Int
    let fridgeRescueScore: Int?
    let totalTimeMinutes: Int?
    let activeTimeMinutes: Int?
    let difficulty: RecipeDifficulty?
    let leftoverScore: Double?
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 96), spacing: 8)], alignment: .leading, spacing: 8) {
            metricChip(title: "Match", value: "\(matchPercent)%", systemImage: "scope")

            if let fridgeRescueScore {
                metricChip(title: "Fridge Rescue Score", value: "\(fridgeRescueScore)", systemImage: "leaf.fill")
            }

            if let activeTimeMinutes {
                metricChip(title: "Active Time", value: "\(activeTimeMinutes)m", systemImage: "hand.raised.fill")
            }

            if let totalTimeMinutes {
                metricChip(title: "Total Time", value: "\(totalTimeMinutes)m", systemImage: "clock.fill")
            }

            if let difficulty {
                metricChip(title: "Difficulty", value: difficulty.displayName(language: appLanguage), systemImage: "flame.fill")
            }

            if let leftoverScore {
                metricChip(title: "Leftover Score", value: "\(Int(leftoverScore.rounded()))", systemImage: "takeoutbag.and.cup.and.straw.fill")
            }
        }
    }

    private func metricChip(title: String, value: String, systemImage: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: systemImage)
                .font(.caption2)
            Text("\(L.text(title, language: appLanguage)): \(value)")
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .font(.caption2.weight(.semibold))
        .foregroundStyle(.secondary)
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct CloudCookAssessmentRow: View {
    let match: CloudRecipeMatch
    let recipe: Recipe?
    let fridgeRescueScore: Int?
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("almostCookThreshold") private var threshold = 0.7

    var body: some View {
        HStack(spacing: 12) {
            if let recipe {
                RecipeThumbnail(imageData: recipe.imageThumbnailData ?? recipe.imageData)
            }

            VStack(alignment: .leading, spacing: 8) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(match.recipeName)
                        .fontWeight(.semibold)
                    Text("\(Int(match.matchScorePercent.rounded()))% \(L.text("Ingredients", language: appLanguage).lowercased())")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    if let recipe {
                        Text(recipe.ingredients.map(\.displayText).joined(separator: " - "))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }

                ForEach(match.displayableSubstitutedIngredients(for: recipe).prefix(3), id: \.id) { item in
                    Text("\(item.recipeIngredient) -> \(item.userInventoryIngredient)")
                        .font(.footnote)
                        .foregroundStyle(.orange)
                }

                ForEach(match.missingRequiredIngredients.prefix(3), id: \.id) { item in
                    Text("\(L.text("Missing", language: appLanguage)) \(item.recipeIngredient)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                RecipeDecisionMetrics(
                    matchPercent: Int(match.matchScorePercent.rounded()),
                    fridgeRescueScore: fridgeRescueScore,
                    totalTimeMinutes: recipe?.totalTimeMinutes,
                    activeTimeMinutes: recipe?.activeTimeMinutes,
                    difficulty: recipe?.difficulty,
                    leftoverScore: recipe?.leftoverScore
                )
            }

            Spacer()

            VStack(spacing: 8) {
                if match.matchRatio >= threshold {
                    Text(L.text("Ready", language: appLanguage))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.green)
                }

                if recipe != nil {
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.tertiary)
                }
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
            InventoryItem(
                name: $0.name,
                ingredientID: $0.canonicalIngredientId,
                quantity: $0.quantity,
                unit: $0.unit,
                canonicalQuantity: $0.canonicalQuantity,
                canonicalUnit: $0.canonicalUnit
            )
        }
    }

    struct InventoryItem: Encodable {
        let name: String
        let ingredientID: String
        let quantity: Double
        let unit: String
        let canonicalQuantity: Double
        let canonicalUnit: String

        enum CodingKeys: String, CodingKey {
            case name
            case ingredientID = "ingredient_id"
            case quantity
            case unit
            case canonicalQuantity = "canonical_quantity"
            case canonicalUnit = "canonical_unit"
        }
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
    var highConfidenceSubstitutedIngredients: [CloudRecipeMatchIngredient] {
        substitutedIngredients.filter { $0.matchScore > 0.90 }
    }

    func displayableSubstitutedIngredients(for recipe: Recipe?) -> [CloudRecipeMatchIngredient] {
        guard let recipe else {
            return highConfidenceSubstitutedIngredients
        }
        return substitutedIngredients.filter { item in
            guard let ingredient = recipe.ingredient(matching: item) else {
                return item.matchScore > 0.90
            }
            return ingredient.allowsSubstituteDisplay(score: item.matchScore)
        }
    }

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

extension Recipe {
    func ingredient(matching item: CloudRecipeMatchIngredient) -> RecipeIngredient? {
        let itemId = item.recipeIngredientId.trimmingCharacters(in: .whitespacesAndNewlines)
        if !itemId.isEmpty,
           let ingredient = ingredients.first(where: { $0.canonicalIngredientId == itemId }) {
            return ingredient
        }

        let normalizedName = IngredientNormalizer.normalizeName(item.recipeIngredient)
        return ingredients.first { $0.normalizedName == normalizedName }
    }
}

extension RecipeIngredient {
    func allowsSubstituteDisplay(score: Double) -> Bool {
        switch role {
        case .main:
            return score > 0.90
        case .secondary:
            return score >= 0.80
        case .seasoning:
            return false
        }
    }
}

struct CloudRecipeMatchIngredient: Decodable, Identifiable {
    let recipeIngredient: String
    let recipeIngredientId: String
    let userInventoryIngredient: String
    let userInventoryIngredientId: String
    let matchType: String
    let matchScore: Double

    var id: String {
        "\(recipeIngredient)-\(recipeIngredientId)-\(userInventoryIngredient)-\(userInventoryIngredientId)-\(matchType)-\(matchScore)"
    }

    enum CodingKeys: String, CodingKey {
        case recipeIngredient = "recipe_ingredient"
        case recipeIngredientId = "recipe_ingredient_id"
        case userInventoryIngredient = "user_inventory_ingredient"
        case userInventoryIngredientId = "user_inventory_ingredient_id"
        case matchType = "match_type"
        case matchScore = "match_score"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        recipeIngredient = try container.decode(String.self, forKey: .recipeIngredient)
        recipeIngredientId = try container.decodeIfPresent(String.self, forKey: .recipeIngredientId) ?? ""
        userInventoryIngredient = try container.decodeIfPresent(String.self, forKey: .userInventoryIngredient) ?? ""
        userInventoryIngredientId = try container.decodeIfPresent(String.self, forKey: .userInventoryIngredientId) ?? ""
        matchType = try container.decode(String.self, forKey: .matchType)
        matchScore = try container.decode(Double.self, forKey: .matchScore)
    }
}
