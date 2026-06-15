import PhotosUI
import SwiftData
import SwiftUI
import UIKit

struct ScanView: View {
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @Query private var inventory: [StoredIngredient]
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var selectedImageDataList: [Data] = []
    @State private var capturedImageData: Data?
    @State private var detectedItems: [DetectedIngredient] = []
    @State private var showingManualAdd = false
    @State private var showingCamera = false
    @State private var showingDetectedItems = false
    @State private var scanAlert: ScanAlertMessage?
    @State private var scanMessage = "Take a grocery photo to start."
    @State private var isExtracting = false
    @State private var photoLoadTask: Task<Void, Never>?
    @State private var extractionTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    Spacer(minLength: 90)

                    VStack(spacing: 18) {
                        if UIImagePickerController.isSourceTypeAvailable(.camera) {
                            Button {
                                showingCamera = true
                            } label: {
                                PhotoAddButton()
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Take grocery photo")
                        } else {
                            PhotosPicker(selection: $selectedPhotos, maxSelectionCount: 12, matching: .images) {
                                PhotoAddButton()
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Choose grocery photos")
                        }

                        PhotosPicker(selection: $selectedPhotos, maxSelectionCount: 12, matching: .images) {
                            Image(systemName: "photo.on.rectangle")
                                .font(.title2)
                                .frame(width: 52, height: 44)
                        }
                        .buttonStyle(.bordered)
                        .tint(.orange)
                        .accessibilityLabel("Choose from library")

                        if !selectedImageDataList.isEmpty {
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 92), spacing: 10)], spacing: 10) {
                                ForEach(Array(selectedImageDataList.prefix(4).enumerated()), id: \.offset) { _, imageData in
                                    if let image = UIImage(data: imageData) {
                                        Image(uiImage: image)
                                            .resizable()
                                            .scaledToFill()
                                            .frame(height: 92)
                                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                            .clipped()
                                    }
                                }

                                if selectedImageDataList.count > 4 {
                                    Text("+\(selectedImageDataList.count - 4)")
                                        .font(.headline)
                                        .frame(maxWidth: .infinity, minHeight: 92)
                                        .background(Color(.secondarySystemBackground))
                                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                }
                            }
                        }

                        if !selectedImageDataList.isEmpty {
                            Button {
                                startExtractionTask()
                            } label: {
                                Image(systemName: isExtracting ? "hourglass" : "sparkles")
                                    .font(.title3)
                                    .frame(width: 52, height: 44)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.orange)
                            .disabled(isExtracting)
                            .accessibilityLabel("Extract ingredients")
                        }
                    }
                    .padding()

                    DisclosureGroup(L.text("Add manually", language: appLanguage), isExpanded: $showingManualAdd) {
                        ManualIngredientForm { input in
                            saveManualIngredient(input)
                        }
                        .padding(.top, 12)
                    }
                    .padding()
                    .background(.background)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .padding()
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
            .dismissKeyboardOnTap()
            .onChange(of: selectedPhotos) { _, _ in
                startPhotoLoadTask()
            }
            .sheet(isPresented: $showingCamera) {
                ImagePicker(sourceType: .camera, imageData: $capturedImageData)
                    .ignoresSafeArea()
            }
            .sheet(isPresented: $showingDetectedItems) {
                DetectedItemsReviewView(items: $detectedItems) {
                    let result = await saveDetectedItems()
                    if result.didSave {
                        showingDetectedItems = false
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                            scanAlert = result.alert
                        }
                    } else {
                        scanAlert = result.alert
                    }
                }
            }
            .alert(item: $scanAlert) { alert in
                Alert(
                    title: Text(L.text(alert.title, language: appLanguage)),
                    message: Text(alert.message),
                    dismissButton: .default(Text(L.text("OK", language: appLanguage)))
                )
            }
            .onChange(of: capturedImageData) { _, newValue in
                if let newValue {
                    selectedPhotos = []
                    selectedImageDataList = [newValue]
                    scanMessage = "Photo ready."
                    detectedItems = []
                    startExtractionTask()
                }
            }
        }
    }

    private func startPhotoLoadTask() {
        photoLoadTask?.cancel()
        photoLoadTask = Task {
            await loadSelectedPhotos()
        }
    }

    private func startExtractionTask() {
        extractionTask?.cancel()
        extractionTask = Task {
            await extractIngredients()
        }
    }

    private func loadSelectedPhotos() async {
        guard !selectedPhotos.isEmpty else { return }
        var imageDataList: [Data] = []
        for selectedPhoto in selectedPhotos {
            if let data = try? await selectedPhoto.loadTransferable(type: Data.self) {
                imageDataList.append(data)
            }
        }

        selectedImageDataList = imageDataList
        scanMessage = imageDataList.isEmpty ? "Could not load those photos." : "\(imageDataList.count) photo(s) ready."
        detectedItems = []
        guard !imageDataList.isEmpty else { return }
        startExtractionTask()
    }

    private func extractIngredients() async {
        guard !selectedImageDataList.isEmpty else {
            scanMessage = "Choose photo(s) first."
            return
        }

        isExtracting = true
        scanMessage = selectedImageDataList.count == 1 ? "Extracting ingredients..." : "Extracting ingredients from \(selectedImageDataList.count) photos..."

        do {
            let extractor = GroceryPhotoExtractor()
            let extractedItems = try await extractSelectedImages(with: extractor)

            detectedItems = extractedItems
            scanMessage = detectedItems.isEmpty ? "No ingredients found. Try another photo." : "Review and save the detected items."
            showingDetectedItems = !detectedItems.isEmpty
        } catch {
            detectedItems = []
            let message = error.localizedDescription
            scanMessage = "Extraction failed."
            scanAlert = ScanAlertMessage(title: "Extraction failed", message: message)
        }

        isExtracting = false
    }

    private func extractSelectedImages(with extractor: GroceryPhotoExtractor) async throws -> [DetectedIngredient] {
        let batchSize = 4
        let language = appLanguage
        let imageBatches = stride(from: 0, to: selectedImageDataList.count, by: batchSize).map { batchStart in
            let batchEnd = min(batchStart + batchSize, selectedImageDataList.count)
            return (batchStart, Array(selectedImageDataList[batchStart..<batchEnd]))
        }

        let batchResults = try await withThrowingTaskGroup(of: (Int, [DetectedIngredient]).self) { group in
            for (batchStart, imageDataList) in imageBatches {
                group.addTask {
                    let response = try await extractor.extract(from: imageDataList, language: language)
                    return (batchStart, response.items.map(\.detectedIngredient))
                }
            }

            var results: [(Int, [DetectedIngredient])] = []
            for try await result in group {
                results.append(result)
            }
            return results.sorted { $0.0 < $1.0 }
        }

        return batchResults.flatMap(\.1)
    }

    private func saveManualIngredient(_ input: IngredientInput) -> Bool {
        do {
            let result = try InventoryStore.save([input], sourceContext: modelContext)
            showingManualAdd = false
            scanMessage = "Saved to storage."
            scanAlert = ScanAlertMessage(
                title: "Saved",
                message: SaveConfirmation(
                    items: result.savedNames,
                    inventoryCount: result.inventoryCount,
                    language: appLanguage
                ).message
            )
            return true
        } catch {
            scanAlert = ScanAlertMessage(title: "Save failed", message: error.localizedDescription)
            return false
        }
    }

    private func saveDetectedItems() async -> ReviewSaveResult {
        do {
            let result = try InventoryStore.save(detectedItems.map(\.ingredientInput), sourceContext: modelContext)

            detectedItems = []
            selectedPhotos = []
            selectedImageDataList = []
            capturedImageData = nil
            scanMessage = "Saved to storage."
            return ReviewSaveResult(
                didSave: true,
                alert: ScanAlertMessage(
                    title: "Saved",
                    message: SaveConfirmation(
                        items: result.savedNames,
                        inventoryCount: result.inventoryCount,
                        language: appLanguage
                    ).message
                )
            )
        } catch {
            return ReviewSaveResult(
                didSave: false,
                alert: ScanAlertMessage(title: "Save failed", message: error.localizedDescription)
            )
        }
    }
}

struct ScanAlertMessage: Identifiable {
    let id = UUID()
    let title: String
    let message: String
}

struct ReviewSaveResult {
    let didSave: Bool
    let alert: ScanAlertMessage
}

struct SaveConfirmation: Identifiable {
    let id = UUID()
    let items: [String]
    let inventoryCount: Int
    var language: String = AppLanguage.english.rawValue

    var message: String {
        let savedText = items.isEmpty ? L.text("Nothing was saved.", language: language) : items.joined(separator: "\n")
        let storageText = "\(L.text("Storage now has", language: language)) \(inventoryCount) \(L.text("item(s).", language: language))"
        let reminderText = L.text("Remember to match ingredients to the ingredient library.", language: language)
        return "\(savedText)\n\n\(reminderText)\n\n\(storageText)"
    }
}

enum IngredientSaveError: LocalizedError {
    case emptyInput
    case notWritten(expectedIncrease: Int, beforeCount: Int, afterCount: Int)
    case writeDidNotReturnInsertedModels

    var errorDescription: String? {
        switch self {
        case .emptyInput:
            "No ingredient was selected to save."
        case .notWritten(let expectedIncrease, let beforeCount, let afterCount):
            "The ingredient was not written to storage. Expected \(expectedIncrease) new item(s), but storage changed from \(beforeCount) to \(afterCount)."
        case .writeDidNotReturnInsertedModels:
            "The ingredient save completed, but SwiftData did not return any inserted item IDs."
        }
    }
}

struct PhotoAddButton: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(Color.orange)
                .frame(width: 168, height: 168)
                .shadow(color: .orange.opacity(0.28), radius: 20, y: 10)

            Image(systemName: "plus")
                .font(.system(size: 76, weight: .semibold))
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }
}

struct DetectedIngredient: Identifiable {
    let id = UUID()
    var name: String
    var rawName: String = ""
    var description: String = ""
    var sourceText: String = ""
    var canonicalIngredientId: String = ""
    var canonicalIngredientDisplayName: String = ""
    var ingredientMatchType: String = ""
    var ingredientMatchScore: Double = 0
    var matchedAlias: String = ""
    var suggestedCanonicalIngredientId: String = ""
    var suggestedCanonicalName: String = ""
    var suggestedCanonicalDisplayName: String = ""
    var suggestedMatchType: String = ""
    var suggestedMatchScore: Double = 0
    var suggestedMatchedAlias: String = ""
    var quantity: Double
    var unit: String
    var category: IngredientCategory
    var location: StorageLocation

    var storedIngredient: StoredIngredient {
        ingredientInput.storedIngredient
    }

    var ingredientInput: IngredientInput {
        IngredientInput(
            name: name,
            descriptionText: displayDescription,
            canonicalIngredientId: canonicalIngredientId,
            quantity: quantity,
            unit: IngredientUnit.normalizedSelection(for: unit),
            category: category,
            location: location
        )
    }

    var displayName: String {
        "\(name) (\(quantity.formatted()) \(IngredientUnit.normalizedSelection(for: unit)))"
    }

    private var displayDescription: String {
        var seen = Set<String>()
        let pieces = [rawName, description, sourceText]
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { value in
                guard !value.isEmpty && value != name && !seen.contains(value) else { return false }
                seen.insert(value)
                return true
        }
        return pieces.joined(separator: " - ")
    }

    var matchedIngredientDisplayName: String {
        if !canonicalIngredientDisplayName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return canonicalIngredientDisplayName
        }
        return canonicalIngredientId
    }

    var suggestedIngredientDisplayName: String {
        if !suggestedCanonicalDisplayName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return suggestedCanonicalDisplayName
        }
        if !suggestedCanonicalName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return suggestedCanonicalName
        }
        return suggestedCanonicalIngredientId
    }
}

struct IngredientInput {
    var name: String
    var descriptionText: String = ""
    var canonicalIngredientId: String = ""
    var quantity: Double
    var unit: String
    var category: IngredientCategory
    var location: StorageLocation
    var enteredDate: Date = .now
    var expireDate: Date?

    var storedIngredient: StoredIngredient {
        StoredIngredient(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            descriptionText: descriptionText.trimmingCharacters(in: .whitespacesAndNewlines),
            canonicalIngredientId: canonicalIngredientId.trimmingCharacters(in: .whitespacesAndNewlines),
            quantity: quantity,
            unit: IngredientUnit.normalizedSelection(for: unit),
            category: category,
            location: location,
            enteredDate: enteredDate,
            expireDate: expireDate
        )
    }

    var displayName: String {
        "\(name) (\(quantity.formatted()) \(IngredientUnit.normalizedSelection(for: unit)))"
    }
}

@MainActor
enum InventoryStore {
    static func save(_ inputs: [IngredientInput], sourceContext: ModelContext) throws -> InventorySaveResult {
        let cleanInputs = inputs.filter { !$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        guard !cleanInputs.isEmpty else { throw IngredientSaveError.emptyInput }

        let container = sourceContext.container
        let beforeCount = try ModelContext(container).fetch(FetchDescriptor<StoredIngredient>()).count
        let saveContext = ModelContext(container)
        saveContext.autosaveEnabled = false

        var insertedIDs: [PersistentIdentifier] = []
        for input in cleanInputs {
            let ingredient = input.storedIngredient
            saveContext.insert(ingredient)
            insertedIDs.append(ingredient.persistentModelID)
        }
        guard !insertedIDs.isEmpty else { throw IngredientSaveError.writeDidNotReturnInsertedModels }

        try saveContext.save()

        let verifyContext = ModelContext(container)
        let afterCount = try verifyContext.fetch(FetchDescriptor<StoredIngredient>()).count
        guard afterCount >= beforeCount + cleanInputs.count else {
            throw IngredientSaveError.notWritten(
                expectedIncrease: cleanInputs.count,
                beforeCount: beforeCount,
                afterCount: afterCount
            )
        }

        return InventorySaveResult(
            savedNames: cleanInputs.map(\.displayName),
            inventoryCount: afterCount
        )
    }
}

struct InventorySaveResult {
    let savedNames: [String]
    let inventoryCount: Int
}

struct DetectedItemsReviewView: View {
    @Binding var items: [DetectedIngredient]
    @Environment(\.dismiss) private var dismiss
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var isSaving = false
    let save: () async -> Void

    var body: some View {
        NavigationStack {
            Form {
                ForEach($items) { $item in
                    Section {
                        LabeledContent(L.text("Ingredient name", language: appLanguage)) {
                            TextField(L.text("Ingredient name", language: appLanguage), text: $item.name)
                                .multilineTextAlignment(.trailing)
                        }

                        LabeledContent(L.text("Full product name", language: appLanguage)) {
                            TextField(L.text("Full product name", language: appLanguage), text: $item.rawName)
                                .multilineTextAlignment(.trailing)
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text(L.text("Description", language: appLanguage))
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(.secondary)
                            TextField(L.text("Description", language: appLanguage), text: $item.description, axis: .vertical)
                                .lineLimit(2...4)
                        }

                        if !item.sourceText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(L.text("Original detected text", language: appLanguage))
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                Text(item.sourceText)
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        if !item.canonicalIngredientId.isEmpty {
                            VStack(alignment: .leading, spacing: 5) {
                                Label(item.matchedIngredientDisplayName, systemImage: "checkmark.seal.fill")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(.green)
                                if appLanguage != AppLanguage.chinese.rawValue && item.matchedIngredientDisplayName != item.canonicalIngredientId {
                                    Text(item.canonicalIngredientId)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                if item.ingredientMatchScore > 0 {
                                    Text(matchSummary(type: item.ingredientMatchType, score: item.ingredientMatchScore))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                if !item.matchedAlias.isEmpty {
                                    Text("\(L.text("Matched alias", language: appLanguage)): \(item.matchedAlias)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        } else if !item.suggestedCanonicalIngredientId.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Label(
                                    "\(L.text("Possible match", language: appLanguage)): \(item.suggestedIngredientDisplayName)",
                                    systemImage: "questionmark.circle.fill"
                                )
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(.orange)
                                Text(matchSummary(type: item.suggestedMatchType, score: item.suggestedMatchScore))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                if !item.suggestedMatchedAlias.isEmpty {
                                    Text("\(L.text("Matched alias", language: appLanguage)): \(item.suggestedMatchedAlias)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Button(L.text("Use suggestion", language: appLanguage)) {
                                    item.canonicalIngredientId = item.suggestedCanonicalIngredientId
                                    item.canonicalIngredientDisplayName = item.suggestedIngredientDisplayName
                                    item.ingredientMatchType = item.suggestedMatchType
                                    item.ingredientMatchScore = item.suggestedMatchScore
                                    item.matchedAlias = item.suggestedMatchedAlias
                                }
                                .buttonStyle(.bordered)
                            }
                        }

                        HStack {
                            TextField(L.text("Quantity", language: appLanguage), value: $item.quantity, format: .number)
                                .keyboardType(.decimalPad)
                            Picker(L.text("Unit", language: appLanguage), selection: $item.unit) {
                                ForEach(IngredientUnit.allCases) { unit in
                                    Text(unit.displayName(language: appLanguage)).tag(unit.rawValue)
                                }
                            }
                            .labelsHidden()
                            .pickerStyle(.menu)
                        }

                        Picker(L.text("Category", language: appLanguage), selection: $item.category) {
                            ForEach(IngredientCategory.allCases) { category in
                                Text(category.displayName(language: appLanguage)).tag(category)
                            }
                        }
                        .pickerStyle(.menu)

                        Picker(L.text("Location", language: appLanguage), selection: $item.location) {
                            ForEach(StorageLocation.allCases) { location in
                                Text(location.displayName(language: appLanguage)).tag(location)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                }
                .onDelete { indexSet in
                    items.remove(atOffsets: indexSet)
                }
            }
            .onAppear {
                for index in items.indices {
                    items[index].unit = IngredientUnit.normalizedSelection(for: items[index].unit)
                }
            }
            .navigationTitle(L.text("Review items", language: appLanguage))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L.text("Cancel", language: appLanguage)) { dismiss() }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? L.text("Saving...", language: appLanguage) : L.text("Save", language: appLanguage)) {
                        isSaving = true
                        Task {
                            await save()
                            isSaving = false
                        }
                    }
                        .fontWeight(.semibold)
                        .disabled(items.isEmpty || isSaving)
                }
            }
        }
    }

    private func matchSummary(type: String, score: Double) -> String {
        let percent = Int((score * 100).rounded())
        let label: String
        switch type {
        case "exact":
            label = L.text("Exact match", language: appLanguage)
        case "alias":
            label = L.text("Alias match", language: appLanguage)
        case "fuzzy_alias":
            label = L.text("Fuzzy alias match", language: appLanguage)
        case "fuzzy":
            label = L.text("Fuzzy match", language: appLanguage)
        default:
            label = L.text("Match", language: appLanguage)
        }
        return "\(label) \(percent)%"
    }
}
