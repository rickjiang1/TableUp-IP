import SwiftData
import SwiftUI

struct StorageView: View {
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @Query(sort: \StoredIngredient.categoryRaw) private var ingredients: [StoredIngredient]
    @State private var selectedTab: StorageTab = .inventory
    @State private var showingClearConfirmation = false
    @State private var storageAlert: StorageAlertMessage?
    @State private var unmatchedIngredients: [UnknownIngredient] = []
    @State private var ingredientDictionary: [CloudIngredient] = []
    @State private var unmatchedError: String?
    @State private var isLoadingUnmatched = false

    var groupedIngredients: [(IngredientCategory, [StoredIngredient])] {
        IngredientCategory.allCases.compactMap { category in
            let items = ingredients.filter { $0.category == category }
            return items.isEmpty ? nil : (category, items)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Picker(L.text("Storage view", language: appLanguage), selection: $selectedTab) {
                    ForEach(StorageTab.allCases) { tab in
                        Text(tab.displayName(language: appLanguage)).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 8, trailing: 16))

                switch selectedTab {
                case .inventory:
                    inventoryContent
                case .unmatched:
                    unmatchedContent
                }
            }
            .navigationTitle(L.text("Storage", language: appLanguage))
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    toolbarButton
                }
            }
            .task {
                if selectedTab == .unmatched {
                    await loadUnmatchedIngredients()
                }
            }
            .onChange(of: selectedTab) { _, newValue in
                if newValue == .unmatched && unmatchedIngredients.isEmpty {
                    Task { await loadUnmatchedIngredients() }
                }
            }
            .confirmationDialog(
                L.text("Clear all storage?", language: appLanguage),
                isPresented: $showingClearConfirmation,
                titleVisibility: .visible
            ) {
                Button(L.text("Clear All", language: appLanguage), role: .destructive) {
                    clearAllIngredients()
                }
                Button(L.text("Cancel", language: appLanguage), role: .cancel) {}
            } message: {
                Text(L.text("This will remove every saved ingredient.", language: appLanguage))
            }
            .alert(item: $storageAlert) { alert in
                Alert(
                    title: Text(L.text(alert.title, language: appLanguage)),
                    message: Text(alert.message),
                    dismissButton: .default(Text(L.text("OK", language: appLanguage)))
                )
            }
        }
    }

    @ViewBuilder
    private var inventoryContent: some View {
        if ingredients.isEmpty {
            ContentUnavailableView(
                L.text("No saved food", language: appLanguage),
                systemImage: "archivebox",
                description: Text(L.text("Saved ingredients will appear here.", language: appLanguage))
            )
            .listRowBackground(Color.clear)
        }

        ForEach(groupedIngredients, id: \.0) { category, items in
            Section(category.displayName(language: appLanguage)) {
                ForEach(items) { ingredient in
                    NavigationLink {
                        IngredientDetailView(ingredient: ingredient)
                    } label: {
                        IngredientRow(ingredient: ingredient)
                    }
                }
                .onDelete { indexSet in
                    for index in indexSet {
                        modelContext.delete(items[index])
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var unmatchedContent: some View {
        if isLoadingUnmatched {
            HStack {
                Spacer()
                ProgressView()
                Spacer()
            }
            .listRowBackground(Color.clear)
        } else if let unmatchedError {
            ContentUnavailableView(
                L.text("Unable to load unmatched ingredients", language: appLanguage),
                systemImage: "exclamationmark.triangle",
                description: Text(unmatchedError)
            )
            .listRowBackground(Color.clear)
        } else if unmatchedIngredients.isEmpty {
            ContentUnavailableView(
                L.text("No unmatched ingredients", language: appLanguage),
                systemImage: "checkmark.seal",
                description: Text(L.text("Names that do not match the ingredient dictionary will appear here after recipe matching.", language: appLanguage))
            )
            .listRowBackground(Color.clear)
        } else {
            Section {
                ForEach(unmatchedIngredients) { ingredient in
                    UnknownIngredientRow(
                        ingredient: ingredient,
                        dictionary: ingredientDictionary,
                        resolve: { selectedIngredient in
                            await resolveUnknownIngredient(ingredient, as: selectedIngredient)
                        }
                    )
                }
            } header: {
                Text(L.text("Not matched to ingredient dictionary", language: appLanguage))
            } footer: {
                Text(L.text("Use these names to add aliases such as chicken breast = chicken or 鸡胸 = chicken breast.", language: appLanguage))
            }
        }
    }

    @ViewBuilder
    private var toolbarButton: some View {
        switch selectedTab {
        case .inventory:
            Button(role: .destructive) {
                showingClearConfirmation = true
            } label: {
                Image(systemName: "trash")
            }
            .disabled(ingredients.isEmpty)
            .accessibilityLabel(L.text("Clear All", language: appLanguage))
        case .unmatched:
            Button {
                Task { await loadUnmatchedIngredients(force: true) }
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .disabled(isLoadingUnmatched)
            .accessibilityLabel(L.text("Refresh", language: appLanguage))
        }
    }

    @MainActor
    private func loadUnmatchedIngredients(force: Bool = false) async {
        guard !isLoadingUnmatched else { return }
        if !force && !unmatchedIngredients.isEmpty {
            return
        }

        isLoadingUnmatched = true
        unmatchedError = nil

        do {
            async let unknowns = UnknownIngredientClient().fetchPending()
            async let dictionary = UnknownIngredientClient().fetchIngredientDictionary()
            unmatchedIngredients = try await unknowns
            ingredientDictionary = try await dictionary
        } catch {
            unmatchedError = error.localizedDescription
        }

        isLoadingUnmatched = false
    }

    @MainActor
    private func resolveUnknownIngredient(_ unknown: UnknownIngredient, as ingredient: CloudIngredient) async {
        do {
            try await UnknownIngredientClient().resolve(unknown: unknown, as: ingredient)
            markLocalInventoryItems(named: unknown, as: ingredient)
            unmatchedIngredients.removeAll { $0.id == unknown.id }
            storageAlert = StorageAlertMessage(
                title: "Saved",
                message: "\(unknown.rawName) -> \(ingredient.canonicalName)"
            )
        } catch {
            storageAlert = StorageAlertMessage(title: "Save failed", message: error.localizedDescription)
        }
    }

    private func markLocalInventoryItems(named unknown: UnknownIngredient, as ingredient: CloudIngredient) {
        let targetNames = Set([
            unknown.rawName.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
            unknown.normalizedName.replacingOccurrences(of: "_", with: " ").lowercased()
        ])

        for item in ingredients {
            let itemName = item.name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            let normalized = item.normalizedName.replacingOccurrences(of: "_", with: " ").lowercased()
            if targetNames.contains(itemName) || targetNames.contains(normalized) {
                item.canonicalIngredientId = ingredient.id
            }
        }

        try? modelContext.save()
    }

    private func clearAllIngredients() {
        let removedCount = ingredients.count
        ingredients.forEach(modelContext.delete)

        do {
            try modelContext.save()
            storageAlert = StorageAlertMessage(
                title: "Cleared",
                message: "\(removedCount) \(L.text("item(s) removed", language: appLanguage))"
            )
        } catch {
            storageAlert = StorageAlertMessage(title: "Save failed", message: error.localizedDescription)
        }
    }
}

private enum StorageTab: String, CaseIterable, Identifiable {
    case inventory
    case unmatched

    var id: String { rawValue }

    func displayName(language: String) -> String {
        switch self {
        case .inventory:
            L.text("Inventory", language: language)
        case .unmatched:
            L.text("Unmatched", language: language)
        }
    }
}

struct StorageAlertMessage: Identifiable {
    let id = UUID()
    let title: String
    let message: String
}

struct UnknownIngredientsManagerView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var unmatchedIngredients: [UnknownIngredient] = []
    @State private var ingredientDictionary: [CloudIngredient] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var alert: StorageAlertMessage?

    var body: some View {
        NavigationStack {
            List {
                if isLoading {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                } else if let errorMessage {
                    ContentUnavailableView(
                        L.text("Unable to load unmatched ingredients", language: appLanguage),
                        systemImage: "exclamationmark.triangle",
                        description: Text(errorMessage)
                    )
                    .listRowBackground(Color.clear)
                } else if unmatchedIngredients.isEmpty {
                    ContentUnavailableView(
                        L.text("No unmatched ingredients", language: appLanguage),
                        systemImage: "checkmark.seal",
                        description: Text(L.text("Names that do not match the ingredient dictionary will appear here after recipe matching.", language: appLanguage))
                    )
                    .listRowBackground(Color.clear)
                } else {
                    Section(L.text("Not matched to ingredient dictionary", language: appLanguage)) {
                        ForEach(unmatchedIngredients) { unknown in
                            UnknownIngredientRow(
                                ingredient: unknown,
                                dictionary: ingredientDictionary,
                                resolve: { selected in
                                    await resolve(unknown, as: selected)
                                }
                            )
                        }
                    }
                }
            }
            .navigationTitle(L.text("Unmatched ingredients", language: appLanguage))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L.text("Close", language: appLanguage)) { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await load(force: true) }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(isLoading)
                }
            }
            .task {
                await load()
            }
            .alert(item: $alert) { alert in
                Alert(
                    title: Text(L.text(alert.title, language: appLanguage)),
                    message: Text(alert.message),
                    dismissButton: .default(Text(L.text("OK", language: appLanguage)))
                )
            }
        }
    }

    @MainActor
    private func load(force: Bool = false) async {
        guard !isLoading else { return }
        if !force && !unmatchedIngredients.isEmpty {
            return
        }
        isLoading = true
        errorMessage = nil
        do {
            async let unknowns = UnknownIngredientClient().fetchPending()
            async let dictionary = UnknownIngredientClient().fetchIngredientDictionary()
            unmatchedIngredients = try await unknowns
            ingredientDictionary = try await dictionary
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    @MainActor
    private func resolve(_ unknown: UnknownIngredient, as ingredient: CloudIngredient) async {
        do {
            try await UnknownIngredientClient().resolve(unknown: unknown, as: ingredient)
            unmatchedIngredients.removeAll { $0.id == unknown.id }
            alert = StorageAlertMessage(title: "Saved", message: "\(unknown.rawName) -> \(ingredient.canonicalName)")
        } catch {
            alert = StorageAlertMessage(title: "Save failed", message: error.localizedDescription)
        }
    }
}

struct UnknownIngredientRow: View {
    let ingredient: UnknownIngredient
    let dictionary: [CloudIngredient]
    let resolve: (CloudIngredient) async -> Void
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var selectedIngredientId = ""
    @State private var isResolving = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(ingredient.rawName)
                    .fontWeight(.semibold)
                Spacer()
                Text(sourceText)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(Capsule())
            }

            Text("\(L.text("Normalized", language: appLanguage)): \(ingredient.normalizedName)")
                .font(.footnote)
                .foregroundStyle(.secondary)

            HStack(spacing: 12) {
                Label("\(ingredient.occurrenceCount)", systemImage: "number")
                if let lastSeen = ingredient.lastSeenText {
                    Label(lastSeen, systemImage: "clock")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            HStack {
                Picker(L.text("Match to", language: appLanguage), selection: $selectedIngredientId) {
                    Text(L.text("Choose ingredient", language: appLanguage)).tag("")
                    ForEach(dictionary) { ingredient in
                        Text("\(ingredient.canonicalName) (\(ingredient.category))").tag(ingredient.id)
                    }
                }
                .pickerStyle(.menu)

                Button {
                    guard let selected = dictionary.first(where: { $0.id == selectedIngredientId }) else { return }
                    isResolving = true
                    Task {
                        await resolve(selected)
                        isResolving = false
                    }
                } label: {
                    Image(systemName: isResolving ? "hourglass" : "checkmark")
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .disabled(selectedIngredientId.isEmpty || isResolving)
                .accessibilityLabel(L.text("Match", language: appLanguage))
            }
        }
        .padding(.vertical, 4)
        .onAppear {
            if selectedIngredientId.isEmpty {
                selectedIngredientId = bestGuessIngredientId
            }
        }
    }

    private var sourceText: String {
        switch ingredient.source {
        case "inventory":
            L.text("Inventory", language: appLanguage)
        case "recipe":
            L.text("Recipe", language: appLanguage)
        default:
            ingredient.source
        }
    }

    private var bestGuessIngredientId: String {
        let normalized = ingredient.normalizedName.replacingOccurrences(of: "_", with: " ")
        return dictionary.first {
            $0.id == ingredient.normalizedName ||
            $0.id.replacingOccurrences(of: "_", with: " ") == normalized ||
            $0.canonicalName.localizedCaseInsensitiveCompare(normalized) == .orderedSame
        }?.id ?? ""
    }
}

struct UnknownIngredientClient {
    var baseURL: URL = BackendConfiguration.baseURL
    var session: URLSession = .shared

    func fetchPending(limit: Int = 50) async throws -> [UnknownIngredient] {
        let endpoint = baseURL
            .appending(path: "api/unknown-ingredients")
            .appending(queryItems: [URLQueryItem(name: "limit", value: "\(limit)")])
        let (data, response) = try await session.data(from: endpoint)

        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw UnknownIngredientClientError.badResponse
        }

        return try JSONDecoder().decode(UnknownIngredientResponse.self, from: data).unknownIngredients
    }

    func fetchIngredientDictionary() async throws -> [CloudIngredient] {
        let endpoint = baseURL.appending(path: "api/ingredients")
        let (data, response) = try await session.data(from: endpoint)

        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw UnknownIngredientClientError.badResponse
        }

        return try JSONDecoder().decode(CloudIngredientResponse.self, from: data).ingredients
    }

    func resolve(unknown: UnknownIngredient, as ingredient: CloudIngredient) async throws {
        let endpoint = baseURL.appending(path: "api/ingredient-aliases")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(IngredientAliasResolvePayload(
            aliasName: unknown.rawName,
            ingredientId: ingredient.id,
            canonicalName: ingredient.canonicalName,
            category: ingredient.category,
            confidenceScore: 1,
            verified: true,
            language: unknown.rawName.range(of: #"\p{Han}"#, options: .regularExpression) == nil ? "en" : "zh",
            unknownIngredientId: unknown.id
        ))

        let (_, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw UnknownIngredientClientError.badResponse
        }
    }
}

enum UnknownIngredientClientError: LocalizedError {
    case badResponse

    var errorDescription: String? {
        switch self {
        case .badResponse:
            "The backend could not load unmatched ingredients."
        }
    }
}

struct UnknownIngredientResponse: Decodable {
    let unknownIngredients: [UnknownIngredient]
}

struct CloudIngredientResponse: Decodable {
    let ingredients: [CloudIngredient]
}

struct CloudIngredient: Decodable, Identifiable {
    let id: String
    let canonicalName: String
    let category: String

    enum CodingKeys: String, CodingKey {
        case id = "ingredient_id"
        case canonicalName = "canonical_name"
        case category
    }
}

struct IngredientAliasResolvePayload: Encodable {
    let aliasName: String
    let ingredientId: String
    let canonicalName: String
    let category: String
    let confidenceScore: Double
    let verified: Bool
    let language: String
    let unknownIngredientId: String
}

struct UnknownIngredient: Decodable, Identifiable {
    let id: String
    let rawName: String
    let normalizedName: String
    let source: String
    let status: String
    let occurrenceCount: Int
    let lastSeenAt: String?

    var lastSeenText: String? {
        guard let lastSeenAt else { return nil }
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: lastSeenAt) else { return nil }
        return date.formatted(date: .abbreviated, time: .shortened)
    }

    enum CodingKeys: String, CodingKey {
        case id
        case rawName = "raw_name"
        case normalizedName = "normalized_name"
        case source
        case status
        case occurrenceCount = "occurrence_count"
        case lastSeenAt = "last_seen_at"
    }
}

struct IngredientRow: View {
    let ingredient: StoredIngredient
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("expirationReminderDays") private var expirationReminderDays = 3

    private var expirationState: ExpirationState {
        ExpirationState(
            expireDate: ingredient.expireDate,
            reminderDays: expirationReminderDays
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                HStack(spacing: 6) {
                    Text(ingredient.name)
                        .fontWeight(.semibold)

                    if ingredient.isMatchedToIngredientLibrary {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.caption)
                            .foregroundStyle(.green)
                            .accessibilityLabel(L.text("Matched to ingredient library", language: appLanguage))
                    }
                }
                Spacer()
                Text("\(ingredient.quantity.formatted()) \(ingredient.unit)")
                    .foregroundStyle(.secondary)
            }

            if !ingredient.descriptionText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text(ingredient.descriptionText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            HStack(spacing: 8) {
                Text("\(ingredient.location.displayName(language: appLanguage)) - \(L.text("expires", language: appLanguage)) \(ingredient.expireDate.formatted(date: .abbreviated, time: .omitted))")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                if let badge = expirationState.badgeText {
                    Text(L.text(badge, language: appLanguage))
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(expirationState.foregroundColor)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(expirationState.backgroundColor)
                        .clipShape(Capsule())
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack {
                    ForEach(StorageAdvisor.recommendations(for: ingredient)) { recommendation in
                        Text("\(recommendation.approach.displayName(language: appLanguage)): \(recommendation.expireDate.formatted(date: .numeric, time: .omitted))\(recommendation.isRecommended ? " \(L.text("best", language: appLanguage))" : "")")
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(recommendation.isRecommended ? Color.orange.opacity(0.12) : Color(.secondarySystemBackground))
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct ExpirationState {
    let expireDate: Date
    let reminderDays: Int

    private var daysUntilExpiration: Int {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        let expirationDay = calendar.startOfDay(for: expireDate)
        return calendar.dateComponents([.day], from: today, to: expirationDay).day ?? 0
    }

    var badgeText: String? {
        if daysUntilExpiration < 0 {
            return "Expired"
        }

        if daysUntilExpiration <= reminderDays {
            return daysUntilExpiration == 0 ? "Expires today" : "Expires soon"
        }

        return nil
    }

    var foregroundColor: Color {
        daysUntilExpiration < 0 ? .red : .orange
    }

    var backgroundColor: Color {
        foregroundColor.opacity(0.14)
    }
}
