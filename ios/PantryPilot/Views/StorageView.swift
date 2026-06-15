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
    @State private var unmatchedRefreshToken = UUID()

    var groupedIngredients: [(IngredientCategory, [StoredIngredient])] {
        IngredientCategory.allCases.compactMap { category in
            let items = ingredients
                .filter { $0.category == category }
                .sorted(by: inventorySort)
            return items.isEmpty ? nil : (category, items)
        }
    }

    private func inventorySort(_ lhs: StoredIngredient, _ rhs: StoredIngredient) -> Bool {
        let lhsNameKey = ingredientGroupKey(lhs)
        let rhsNameKey = ingredientGroupKey(rhs)
        if lhsNameKey != rhsNameKey {
            return lhsNameKey.localizedStandardCompare(rhsNameKey) == .orderedAscending
        }

        if lhs.expireDate != rhs.expireDate {
            return lhs.expireDate < rhs.expireDate
        }

        if lhs.locationRaw != rhs.locationRaw {
            return lhs.locationRaw.localizedStandardCompare(rhs.locationRaw) == .orderedAscending
        }

        if lhs.enteredDate != rhs.enteredDate {
            return lhs.enteredDate < rhs.enteredDate
        }

        return lhs.createdAt < rhs.createdAt
    }

    private func ingredientGroupKey(_ ingredient: StoredIngredient) -> String {
        let canonicalId = ingredient.canonicalIngredientId.trimmingCharacters(in: .whitespacesAndNewlines)
        if !canonicalId.isEmpty {
            return canonicalId.lowercased()
        }

        let normalizedName = ingredient.normalizedName.trimmingCharacters(in: .whitespacesAndNewlines)
        if !normalizedName.isEmpty {
            return normalizedName.lowercased()
        }

        return ingredient.name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
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
                if newValue == .unmatched {
                    Task { await loadUnmatchedIngredients(force: true) }
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
                        refreshToken: unmatchedRefreshToken,
                        resolve: { selectedIngredient in
                            await resolveUnknownIngredient(ingredient, as: selectedIngredient)
                        }
                    )
                }
            } header: {
                Text(L.text("Not matched to ingredient dictionary", language: appLanguage))
            } footer: {
                Text(L.text("Choose a dictionary ingredient to bind the local item without changing the global alias dictionary.", language: appLanguage))
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
            let client = UnknownIngredientClient()
            let unresolvedIngredients = ingredients.filter {
                $0.canonicalIngredientId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            }
            _ = try await client.resolve(items: unresolvedIngredients.map {
                IngredientResolveInput(name: $0.name, source: "inventory")
            })
            async let unknowns = client.fetchPending(source: "inventory")
            async let dictionary = client.fetchIngredientDictionary(language: appLanguage)
            unmatchedIngredients = filterUnknowns(try await unknowns, against: unresolvedIngredients.map(\.name))
            ingredientDictionary = try await dictionary
            unmatchedRefreshToken = UUID()
        } catch {
            unmatchedError = error.localizedDescription
        }

        isLoadingUnmatched = false
    }

    private func filterUnknowns(_ unknowns: [UnknownIngredient], against names: [String]) -> [UnknownIngredient] {
        let currentNames = Set(names.map(normalizedUnknownKey))
        return unknowns.filter { unknown in
            currentNames.contains(normalizedUnknownKey(unknown.rawName)) ||
            currentNames.contains(normalizedUnknownKey(unknown.normalizedName))
        }
    }

    private func normalizedUnknownKey(_ value: String) -> String {
        value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
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
    var itemsToScan: [IngredientResolveInput] = []
    var source: String = ""
    var shouldPersistAliasResolution = true
    var onResolved: ((UnknownIngredient, CloudIngredient) async throws -> Void)?
    @Environment(\.dismiss) private var dismiss
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var unmatchedIngredients: [UnknownIngredient] = []
    @State private var ingredientDictionary: [CloudIngredient] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var alert: StorageAlertMessage?
    @State private var refreshToken = UUID()

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
                                refreshToken: refreshToken,
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
            let client = UnknownIngredientClient()
            if !itemsToScan.isEmpty {
                _ = try await client.resolve(items: itemsToScan)
            }
            async let unknowns = client.fetchPending(source: source)
            async let dictionary = client.fetchIngredientDictionary(language: appLanguage)
            unmatchedIngredients = filterUnknowns(try await unknowns)
            ingredientDictionary = try await dictionary
            refreshToken = UUID()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    @MainActor
    private func resolve(_ unknown: UnknownIngredient, as ingredient: CloudIngredient) async {
        do {
            try await onResolved?(unknown, ingredient)
            if shouldPersistAliasResolution {
                try await UnknownIngredientClient().resolve(unknown: unknown, as: ingredient)
            }
            unmatchedIngredients.removeAll { $0.id == unknown.id }
            alert = StorageAlertMessage(title: "Saved", message: "\(unknown.rawName) -> \(ingredient.canonicalName)")
        } catch {
            alert = StorageAlertMessage(title: "Save failed", message: error.localizedDescription)
        }
    }

    private func filterUnknowns(_ unknowns: [UnknownIngredient]) -> [UnknownIngredient] {
        guard !itemsToScan.isEmpty else { return [] }
        let currentNames = Set(itemsToScan.map { normalizedUnknownKey($0.name) })
        return unknowns.filter { unknown in
            currentNames.contains(normalizedUnknownKey(unknown.rawName)) ||
            currentNames.contains(normalizedUnknownKey(unknown.normalizedName))
        }
    }

    private func normalizedUnknownKey(_ value: String) -> String {
        value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
    }
}

struct UnknownIngredientRow: View {
    let ingredient: UnknownIngredient
    let dictionary: [CloudIngredient]
    let refreshToken: UUID
    let resolve: (CloudIngredient) async -> Void
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var selectedIngredientId = ""
    @State private var isResolving = false
    @State private var showingIngredientPicker = false
    @State private var candidates: [IngredientCandidate] = []
    @State private var isLoadingCandidates = false

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
                if let lastSeen {
                    Label(lastSeen, systemImage: "clock")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            HStack {
                Button {
                    showingIngredientPicker = true
                } label: {
                    HStack {
                        Text(selectedIngredientText)
                            .lineLimit(1)
                        Spacer()
                        Image(systemName: isLoadingCandidates ? "hourglass" : "magnifyingglass")
                    }
                }
                .buttonStyle(.bordered)

                Button {
                    guard let selected = selectedIngredient else { return }
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
            Task {
                await loadCandidates()
            }
        }
        .onChange(of: refreshToken) { _, _ in
            selectedIngredientId = bestGuessIngredientId
            candidates = []
            Task {
                await loadCandidates()
            }
        }
        .sheet(isPresented: $showingIngredientPicker) {
            IngredientDictionaryPickerView(
                dictionary: dictionary,
                suggestedCandidates: candidates,
                selectedIngredientId: $selectedIngredientId
            )
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

    private var lastSeen: String? {
        guard let lastSeenAt = ingredient.lastSeenAt else { return nil }
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: lastSeenAt) else { return nil }
        return TableUpDateFormatter.date(date, language: appLanguage)
    }

    private var bestGuessIngredientId: String {
        let normalized = ingredient.normalizedName.replacingOccurrences(of: "_", with: " ")
        return dictionary.first {
            $0.id == ingredient.normalizedName ||
            $0.id.replacingOccurrences(of: "_", with: " ") == normalized ||
            $0.canonicalName.localizedCaseInsensitiveCompare(normalized) == .orderedSame ||
            $0.displayName.localizedCaseInsensitiveCompare(normalized) == .orderedSame
        }?.id ?? ""
    }

    private var selectedIngredient: CloudIngredient? {
        dictionary.first(where: { $0.id == selectedIngredientId }) ??
        candidates.first(where: { $0.ingredientId == selectedIngredientId })?.ingredient
    }

    private var selectedIngredientText: String {
        guard let selected = selectedIngredient else {
            return L.text("Choose ingredient", language: appLanguage)
        }
        return "\(selected.displayName) (\(selected.category))"
    }

    @MainActor
    private func loadCandidates() async {
        guard candidates.isEmpty, !isLoadingCandidates else { return }
        let query = ingredient.rawName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? ingredient.normalizedName
            : ingredient.rawName
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        isLoadingCandidates = true
        defer { isLoadingCandidates = false }

        do {
            let fetched = try await UnknownIngredientClient().fetchIngredientCandidates(
                query: query,
                language: appLanguage,
                limit: 8
            )
            candidates = fetched
            if selectedIngredientId.isEmpty {
                selectedIngredientId = fetched.first?.ingredientId ?? bestGuessIngredientId
            }
        } catch {
            if selectedIngredientId.isEmpty {
                selectedIngredientId = bestGuessIngredientId
            }
        }
    }
}

struct IngredientDictionaryPickerView: View {
    let dictionary: [CloudIngredient]
    var suggestedCandidates: [IngredientCandidate] = []
    @Binding var selectedIngredientId: String
    @Environment(\.dismiss) private var dismiss
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var searchText = ""

    private var filteredDictionary: [CloudIngredient] {
        let trimmedSearch = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedSearch.isEmpty else { return dictionary }
        return dictionary.filter {
            $0.displayName.localizedCaseInsensitiveContains(trimmedSearch) ||
            $0.canonicalName.localizedCaseInsensitiveContains(trimmedSearch) ||
            $0.id.localizedCaseInsensitiveContains(trimmedSearch) ||
            $0.category.localizedCaseInsensitiveContains(trimmedSearch)
        }
    }

    private var groupedDictionary: [(String, [CloudIngredient])] {
        Dictionary(grouping: filteredDictionary, by: \.category)
            .map { category, ingredients in
                (
                    category,
                    ingredients.sorted {
                        if $0.id == $1.id {
                            return $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending
                        }
                        return $0.id.localizedCaseInsensitiveCompare($1.id) == .orderedAscending
                    }
                )
            }
            .sorted { $0.0.localizedCaseInsensitiveCompare($1.0) == .orderedAscending }
    }

    var body: some View {
        NavigationStack {
            List {
                if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !suggestedCandidates.isEmpty {
                    Section(L.text("Suggested", language: appLanguage)) {
                        ForEach(suggestedCandidates) { candidate in
                            candidateButton(candidate)
                        }
                    }
                }

                ForEach(groupedDictionary, id: \.0) { category, ingredients in
                    Section(category) {
                        ForEach(ingredients) { ingredient in
                            ingredientButton(ingredient)
                        }
                    }
                }
            }
            .searchable(text: $searchText, prompt: L.text("Search ingredients", language: appLanguage))
            .navigationTitle(L.text("Choose ingredient", language: appLanguage))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L.text("Cancel", language: appLanguage)) { dismiss() }
                }
            }
        }
    }

    private func ingredientButton(_ ingredient: CloudIngredient) -> some View {
        Button {
            selectedIngredientId = ingredient.id
            dismiss()
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(ingredient.displayName)
                        .fontWeight(.semibold)
                    Text(ingredient.id)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    if ingredient.displayName != ingredient.canonicalName {
                        Text(ingredient.canonicalName)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                if selectedIngredientId == ingredient.id {
                    Image(systemName: "checkmark")
                        .foregroundStyle(.green)
                }
            }
        }
        .foregroundStyle(.primary)
    }

    private func candidateButton(_ candidate: IngredientCandidate) -> some View {
        Button {
            selectedIngredientId = candidate.ingredientId
            dismiss()
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(candidate.displayName)
                        .fontWeight(.semibold)
                    Text(candidate.ingredientId)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    if let matchedAlias = candidate.matchedAlias, !matchedAlias.isEmpty {
                        Text("\(L.text("Matched alias", language: appLanguage)): \(matchedAlias)")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Text("\(Int(candidate.score * 100))%")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                if selectedIngredientId == candidate.ingredientId {
                    Image(systemName: "checkmark")
                        .foregroundStyle(.green)
                }
            }
        }
        .foregroundStyle(.primary)
    }
}

struct UnknownIngredientClient {
    var baseURL: URL = BackendConfiguration.baseURL
    var session: URLSession = .shared

    func fetchPending(limit: Int = 50, source: String = "") async throws -> [UnknownIngredient] {
        var queryItems = [URLQueryItem(name: "limit", value: "\(limit)")]
        if !source.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            queryItems.append(URLQueryItem(name: "source", value: source))
        }
        let endpoint = baseURL
            .appending(path: "api/unknown-ingredients")
            .appending(queryItems: queryItems)
        let (data, response) = try await session.data(from: endpoint)

        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw UnknownIngredientClientError.badResponse
        }

        return try JSONDecoder().decode(UnknownIngredientResponse.self, from: data).unknownIngredients
    }

    func fetchIngredientDictionary(language: String) async throws -> [CloudIngredient] {
        let endpoint = baseURL
            .appending(path: "api/ingredients")
            .appending(queryItems: [URLQueryItem(name: "language", value: language)])
        let (data, response) = try await session.data(from: endpoint)

        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw UnknownIngredientClientError.badResponse
        }

        return try JSONDecoder().decode(CloudIngredientResponse.self, from: data).ingredients
    }

    func fetchIngredientCandidates(query: String, language: String, limit: Int = 8) async throws -> [IngredientCandidate] {
        let endpoint = baseURL
            .appending(path: "api/ingredient-candidates")
            .appending(queryItems: [
                URLQueryItem(name: "q", value: query),
                URLQueryItem(name: "language", value: language),
                URLQueryItem(name: "limit", value: "\(limit)")
            ])
        let (data, response) = try await session.data(from: endpoint)

        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw UnknownIngredientClientError.badResponse
        }

        return try JSONDecoder().decode(IngredientCandidateResponse.self, from: data).candidates
    }

    func resolve(items: [IngredientResolveInput]) async throws -> [IngredientResolveResult] {
        guard !items.isEmpty else { return [] }

        let endpoint = baseURL.appending(path: "api/resolve-ingredients")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(IngredientResolveRequest(items: items))

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw UnknownIngredientClientError.badResponse
        }

        return try JSONDecoder().decode(IngredientResolveResponse.self, from: data).items
    }

    func resolve(unknown: UnknownIngredient, as ingredient: CloudIngredient) async throws {
        let endpoint = baseURL.appending(path: "api/unknown-ingredients/resolve")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(UnknownIngredientResolvePayload(
            unknownIngredientId: unknown.id,
            ingredientId: ingredient.id,
            canonicalName: ingredient.canonicalName,
            confidenceScore: 1
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

struct IngredientCandidateResponse: Decodable {
    let candidates: [IngredientCandidate]
}

struct IngredientCandidate: Decodable, Identifiable {
    let ingredientId: String
    let canonicalName: String
    let displayName: String
    let category: String
    let matchedAlias: String?
    let score: Double
    let reason: String

    var id: String { ingredientId }

    var ingredient: CloudIngredient {
        CloudIngredient(
            id: ingredientId,
            canonicalName: canonicalName,
            displayName: displayName,
            category: category
        )
    }

    enum CodingKeys: String, CodingKey {
        case ingredientId = "ingredient_id"
        case canonicalName = "canonical_name"
        case displayName = "display_name"
        case category
        case matchedAlias = "matched_alias"
        case score
        case reason
    }
}

struct CloudIngredient: Decodable, Identifiable {
    let id: String
    let canonicalName: String
    let displayName: String
    let category: String

    init(id: String, canonicalName: String, displayName: String, category: String) {
        self.id = id
        self.canonicalName = canonicalName
        self.displayName = displayName
        self.category = category
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        canonicalName = try container.decode(String.self, forKey: .canonicalName)
        displayName = try container.decodeIfPresent(String.self, forKey: .displayName) ?? canonicalName
        category = try container.decode(String.self, forKey: .category)
    }

    enum CodingKeys: String, CodingKey {
        case id = "ingredient_id"
        case canonicalName = "canonical_name"
        case displayName = "display_name"
        case category
    }
}

struct IngredientResolveInput: Encodable {
    let name: String
    let source: String
}

struct IngredientResolveRequest: Encodable {
    let items: [IngredientResolveInput]
}

struct IngredientResolveResponse: Decodable {
    let items: [IngredientResolveResult]
}

struct IngredientResolveResult: Decodable {
    let name: String
    let source: String
    let ingredientId: String
    let known: Bool
    let aliasMatched: Bool
}

struct UnknownIngredientResolvePayload: Encodable {
    let unknownIngredientId: String
    let ingredientId: String
    let canonicalName: String
    let confidenceScore: Double
}

struct UnknownIngredient: Decodable, Identifiable {
    let id: String
    let rawName: String
    let normalizedName: String
    let source: String
    let status: String
    let occurrenceCount: Int
    let lastSeenAt: String?

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
                Text("\(ingredient.location.displayName(language: appLanguage)) - \(L.text("expires", language: appLanguage)) \(TableUpDateFormatter.date(ingredient.expireDate, language: appLanguage))")
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
