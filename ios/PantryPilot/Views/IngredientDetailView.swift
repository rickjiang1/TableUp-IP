import SwiftUI
import SwiftData

struct IngredientDetailView: View {
    @Bindable var ingredient: StoredIngredient
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue

    @State private var draftName: String
    @State private var draftQuantity: Double
    @State private var draftUnit: String
    @State private var draftCategoryRaw: String
    @State private var draftLocationRaw: String
    @State private var draftEnteredDate: Date
    @State private var draftExpireDate: Date
    @State private var draftCanonicalIngredientId: String
    @State private var draftCanonicalQuantity: Double
    @State private var draftCanonicalUnit: String
    @State private var draftUnitConversionRatio: Double
    @State private var draftUnitConversionNeedsReview: Bool
    @State private var draftUnitConversionReviewReason: String
    @State private var resolveTask: Task<Void, Never>?
    @State private var normalizeTask: Task<Void, Never>?
    @State private var detailAlert: StorageAlertMessage?

    init(ingredient: StoredIngredient) {
        self.ingredient = ingredient
        _draftName = State(initialValue: ingredient.name)
        _draftQuantity = State(initialValue: ingredient.quantity)
        _draftUnit = State(initialValue: IngredientUnit.normalizedSelection(for: ingredient.unit))
        _draftCategoryRaw = State(initialValue: ingredient.categoryRaw)
        _draftLocationRaw = State(initialValue: ingredient.locationRaw)
        _draftEnteredDate = State(initialValue: ingredient.enteredDate)
        _draftExpireDate = State(initialValue: ingredient.expireDate)
        _draftCanonicalIngredientId = State(initialValue: ingredient.canonicalIngredientId)
        _draftCanonicalQuantity = State(initialValue: ingredient.canonicalQuantity)
        _draftCanonicalUnit = State(initialValue: ingredient.canonicalUnit)
        _draftUnitConversionRatio = State(initialValue: ingredient.unitConversionRatio)
        _draftUnitConversionNeedsReview = State(initialValue: ingredient.unitConversionNeedsReview)
        _draftUnitConversionReviewReason = State(initialValue: ingredient.unitConversionReviewReason)
    }

    var body: some View {
        Form {
            Section(L.text("Ingredient", language: appLanguage)) {
                TextField(L.text("Name", language: appLanguage), text: $draftName)
                if isDraftMatched {
                    Label(draftCanonicalIngredientId, systemImage: "checkmark.seal.fill")
                        .font(.footnote)
                        .foregroundStyle(.green)
                }
                LabeledContent(L.text("Amount", language: appLanguage)) {
                    VStack(alignment: .trailing, spacing: 3) {
                        Text(InventoryQuantityFormatter.amount(
                            quantity: draftQuantity,
                            unit: draftUnit,
                            language: appLanguage
                        ))
                        if let canonicalAmount = draftSecondaryCanonicalAmount {
                            Text("≈ \(canonicalAmount)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                Picker(L.text("Unit", language: appLanguage), selection: $draftUnit) {
                    ForEach(IngredientUnit.allCases) { unit in
                        Text(unit.displayName(language: appLanguage)).tag(unit.rawValue)
                    }
                }
                .pickerStyle(.menu)
                TextField(L.text("Quantity", language: appLanguage), value: $draftQuantity, format: .number)
                    .keyboardType(.decimalPad)
            }

            Section(L.text("Storage", language: appLanguage)) {
                Picker(L.text("Category", language: appLanguage), selection: $draftCategoryRaw) {
                    ForEach(IngredientCategory.allCases) { category in
                        Text(category.displayName(language: appLanguage)).tag(category.rawValue)
                    }
                }
                .pickerStyle(.menu)

                Picker(L.text("Location", language: appLanguage), selection: $draftLocationRaw) {
                    ForEach(StorageLocation.allCases) { location in
                        Text(location.displayName(language: appLanguage)).tag(location.rawValue)
                    }
                }
                .pickerStyle(.menu)

                DatePicker(L.text("Enter date", language: appLanguage), selection: $draftEnteredDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .environment(\.locale, datePickerLocale)
                DatePicker(L.text("Expire date", language: appLanguage), selection: $draftExpireDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .environment(\.locale, datePickerLocale)
            }

            Section(L.text("Recommended storage", language: appLanguage)) {
                ForEach(storageRecommendations) { recommendation in
                    HStack {
                        Text(recommendation.approach.displayName(language: appLanguage))
                        Spacer()
                        Text(TableUpDateFormatter.date(recommendation.expireDate, language: appLanguage))
                        if recommendation.isRecommended {
                            Text(L.text("Best", language: appLanguage))
                                .font(.caption)
                                .foregroundStyle(.orange)
                        }
                    }
                }
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .dismissKeyboardOnTap()
        .navigationTitle(draftName.isEmpty ? ingredient.name : draftName)
        .task {
            await StorageAdvisor.refreshCloudRules()
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(L.text("Save", language: appLanguage)) {
                    saveChanges()
                }
                .disabled(!hasUnsavedChanges)
            }
        }
        .alert(item: $detailAlert) { alert in
            Alert(
                title: Text(L.text(alert.title, language: appLanguage)),
                message: Text(alert.message),
                dismissButton: .default(Text(L.text("OK", language: appLanguage)))
            )
        }
        .onAppear {
            if draftCanonicalIngredientId.isEmpty {
                resolveIngredientName(draftName)
            } else if shouldNormalizeDraftQuantity {
                normalizeDraftQuantity()
            }
        }
        .onDisappear {
            resolveTask?.cancel()
            normalizeTask?.cancel()
        }
        .onChange(of: draftName) { _, newValue in
            draftCanonicalIngredientId = ""
            clearDraftUnitConversion()
            resolveIngredientName(newValue)
        }
        .onChange(of: draftQuantity) { _, _ in
            normalizeDraftQuantity()
        }
        .onChange(of: draftUnit) { _, newValue in
            draftUnit = IngredientUnit.normalizedSelection(for: newValue)
            normalizeDraftQuantity()
        }
        .onChange(of: draftCategoryRaw) { _, _ in
            refreshDraftExpireDate()
        }
        .onChange(of: draftLocationRaw) { _, _ in
            refreshDraftExpireDate()
        }
        .onChange(of: draftEnteredDate) { _, _ in
            refreshDraftExpireDate()
        }
    }

    private var isDraftMatched: Bool {
        !draftCanonicalIngredientId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var draftCategory: IngredientCategory {
        IngredientCategory(rawValue: draftCategoryRaw) ?? .other
    }

    private var draftLocation: StorageLocation {
        StorageLocation(rawValue: draftLocationRaw) ?? .fridge
    }

    private var datePickerLocale: Locale {
        Locale(identifier: appLanguage == AppLanguage.chinese.rawValue ? "zh_Hans_US" : "en_US")
    }

    private var shouldNormalizeDraftQuantity: Bool {
        isDraftMatched && draftQuantity > 0 && !draftUnit.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var draftSecondaryCanonicalAmount: String? {
        guard !draftUnitConversionNeedsReview,
              draftCanonicalQuantity > 0,
              !draftCanonicalUnit.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }

        let rawUnit = IngredientNormalizer.normalizeUnit(draftUnit)
        let canonicalUnit = IngredientNormalizer.normalizeUnit(draftCanonicalUnit)
        guard rawUnit != canonicalUnit else {
            return nil
        }

        return InventoryQuantityFormatter.amount(
            quantity: draftCanonicalQuantity,
            unit: draftCanonicalUnit,
            language: appLanguage
        )
    }

    private var storageRecommendations: [StorageRecommendation] {
        let best = StorageAdvisor.approach(for: draftLocation)
        return StorageApproach.allCases.map { approach in
            StorageRecommendation(
                approach: approach,
                expireDate: StorageAdvisor.estimatedExpireDate(
                    name: draftName,
                    canonicalIngredientId: draftCanonicalIngredientId,
                    category: draftCategory,
                    approach: approach,
                    enteredDate: draftEnteredDate
                ),
                isRecommended: approach == best
            )
        }
    }

    private var hasUnsavedChanges: Bool {
        draftName != ingredient.name ||
            abs(draftQuantity - ingredient.quantity) > 0.0001 ||
            draftUnit != IngredientUnit.normalizedSelection(for: ingredient.unit) ||
            draftCategoryRaw != ingredient.categoryRaw ||
            draftLocationRaw != ingredient.locationRaw ||
            !Calendar.current.isDate(draftEnteredDate, inSameDayAs: ingredient.enteredDate) ||
            !Calendar.current.isDate(draftExpireDate, inSameDayAs: ingredient.expireDate) ||
            draftCanonicalIngredientId != ingredient.canonicalIngredientId ||
            abs(draftCanonicalQuantity - ingredient.canonicalQuantity) > 0.0001 ||
            draftCanonicalUnit != ingredient.canonicalUnit ||
            abs(draftUnitConversionRatio - ingredient.unitConversionRatio) > 0.0001 ||
            draftUnitConversionNeedsReview != ingredient.unitConversionNeedsReview ||
            draftUnitConversionReviewReason != ingredient.unitConversionReviewReason
    }

    private func refreshDraftExpireDate() {
        draftExpireDate = StorageAdvisor.estimatedExpireDate(
            name: draftName,
            canonicalIngredientId: draftCanonicalIngredientId,
            category: draftCategory,
            location: draftLocation,
            enteredDate: draftEnteredDate
        )
    }

    private func clearDraftUnitConversion() {
        draftCanonicalQuantity = 0
        draftCanonicalUnit = ""
        draftUnitConversionRatio = 0
        draftUnitConversionNeedsReview = false
        draftUnitConversionReviewReason = ""
    }

    private func saveChanges() {
        let trimmedName = draftName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else {
            detailAlert = StorageAlertMessage(title: "Save failed", message: L.text("Ingredient name", language: appLanguage))
            return
        }

        ingredient.name = trimmedName
        ingredient.normalizedName = IngredientNormalizer.normalizeName(trimmedName)
        ingredient.quantity = draftQuantity
        ingredient.unit = IngredientUnit.normalizedSelection(for: draftUnit)
        ingredient.categoryRaw = draftCategoryRaw
        ingredient.locationRaw = draftLocationRaw
        ingredient.enteredDate = draftEnteredDate
        ingredient.expireDate = draftExpireDate
        ingredient.canonicalIngredientId = draftCanonicalIngredientId
        ingredient.canonicalQuantity = draftCanonicalQuantity
        ingredient.canonicalUnit = draftCanonicalUnit
        ingredient.unitConversionRatio = draftUnitConversionRatio
        ingredient.unitConversionNeedsReview = draftUnitConversionNeedsReview
        ingredient.unitConversionReviewReason = draftUnitConversionReviewReason

        do {
            try modelContext.save()
            detailAlert = StorageAlertMessage(title: "Saved", message: trimmedName)
        } catch {
            detailAlert = StorageAlertMessage(title: "Save failed", message: error.localizedDescription)
        }
    }

    private func resolveIngredientName(_ name: String) {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        resolveTask?.cancel()

        guard !trimmedName.isEmpty else {
            draftCanonicalIngredientId = ""
            clearDraftUnitConversion()
            return
        }

        resolveTask = Task {
            try? await Task.sleep(for: .milliseconds(450))
            guard !Task.isCancelled else { return }

            do {
                let results = try await UnknownIngredientClient().resolve(
                    items: [IngredientResolveInput(name: trimmedName, source: "inventory")]
                )
                let result = results.first

                await MainActor.run {
                    guard draftName.trimmingCharacters(in: .whitespacesAndNewlines) == trimmedName else { return }
                    draftCanonicalIngredientId = result?.known == true ? result?.ingredientId ?? "" : ""
                    if draftCanonicalIngredientId.isEmpty {
                        clearDraftUnitConversion()
                    } else {
                        normalizeDraftQuantity()
                    }
                }
            } catch {
                await MainActor.run {
                    guard draftName.trimmingCharacters(in: .whitespacesAndNewlines) == trimmedName else { return }
                    draftCanonicalIngredientId = ""
                    clearDraftUnitConversion()
                }
            }
        }
    }

    private func normalizeDraftQuantity() {
        normalizeTask?.cancel()

        guard shouldNormalizeDraftQuantity else {
            clearDraftUnitConversion()
            return
        }

        let savedUnit = IngredientUnit.normalizedSelection(for: ingredient.unit)
        if draftUnit == savedUnit,
           draftUnitConversionRatio > 0,
           !draftCanonicalUnit.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            draftCanonicalQuantity = draftQuantity * draftUnitConversionRatio
            draftUnitConversionNeedsReview = false
            draftUnitConversionReviewReason = ""
        } else {
            clearDraftUnitConversion()
        }

        let requestName = draftName.trimmingCharacters(in: .whitespacesAndNewlines)
        let requestIngredientId = draftCanonicalIngredientId
        let requestQuantity = draftQuantity
        let requestUnit = draftUnit

        normalizeTask = Task {
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }

            do {
                let conversion = try await UnknownIngredientClient().normalizeIngredientQuantity(
                    ingredientName: requestName,
                    ingredientId: requestIngredientId,
                    quantity: requestQuantity,
                    unit: requestUnit
                )

                await MainActor.run {
                    guard draftName.trimmingCharacters(in: .whitespacesAndNewlines) == requestName,
                          draftCanonicalIngredientId == requestIngredientId,
                          abs(draftQuantity - requestQuantity) < 0.0001,
                          draftUnit == requestUnit else {
                        return
                    }

                    draftCanonicalQuantity = conversion.canonicalQuantity
                    draftCanonicalUnit = conversion.canonicalUnit
                    draftUnitConversionRatio = conversion.conversionRatio
                    draftUnitConversionNeedsReview = conversion.needsReview
                    draftUnitConversionReviewReason = conversion.reason
                }
            } catch {
                await MainActor.run {
                    guard draftName.trimmingCharacters(in: .whitespacesAndNewlines) == requestName,
                          draftCanonicalIngredientId == requestIngredientId,
                          abs(draftQuantity - requestQuantity) < 0.0001,
                          draftUnit == requestUnit else {
                        return
                    }

                    draftCanonicalQuantity = 0
                    draftCanonicalUnit = ""
                    draftUnitConversionRatio = 0
                    draftUnitConversionNeedsReview = true
                    draftUnitConversionReviewReason = "Missing conversion rule"
                }
            }
        }
    }
}
