import SwiftUI

struct IngredientDetailView: View {
    @Bindable var ingredient: StoredIngredient
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var resolveTask: Task<Void, Never>?
    @State private var isUnitConversionExpanded = false

    var body: some View {
        Form {
            Section(L.text("Ingredient", language: appLanguage)) {
                TextField(L.text("Name", language: appLanguage), text: $ingredient.name)
                if ingredient.isMatchedToIngredientLibrary {
                    Label(ingredient.canonicalIngredientId, systemImage: "checkmark.seal.fill")
                        .font(.footnote)
                        .foregroundStyle(.green)
                }
                LabeledContent(L.text("Amount", language: appLanguage)) {
                    VStack(alignment: .trailing, spacing: 3) {
                        Text(InventoryQuantityFormatter.primaryAmount(for: ingredient, language: appLanguage))
                        if let canonicalAmount = InventoryQuantityFormatter.secondaryCanonicalAmount(for: ingredient, language: appLanguage) {
                            Text("≈ \(canonicalAmount)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                Picker(L.text("Unit", language: appLanguage), selection: $ingredient.unit) {
                    ForEach(IngredientUnit.allCases) { unit in
                        Text(unit.displayName(language: appLanguage)).tag(unit.rawValue)
                    }
                }
                .pickerStyle(.menu)
                TextField(L.text("Quantity", language: appLanguage), value: $ingredient.quantity, format: .number)
                    .keyboardType(.decimalPad)
            }

            if ingredient.isMatchedToIngredientLibrary {
                Section {
                    DisclosureGroup(
                        L.text("Unit conversion details", language: appLanguage),
                        isExpanded: $isUnitConversionExpanded
                    ) {
                        if ingredient.unitConversionNeedsReview {
                            LabeledContent(L.text("Canonical unit", language: appLanguage)) {
                                Text(L.text("Needs review", language: appLanguage))
                                    .foregroundStyle(.orange)
                            }
                            if !ingredient.unitConversionReviewReason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                Text(L.text(ingredient.unitConversionReviewReason, language: appLanguage))
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        } else if !ingredient.canonicalUnit.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            LabeledContent(L.text("Raw unit", language: appLanguage)) {
                                Text(InventoryQuantityFormatter.primaryAmount(for: ingredient, language: appLanguage))
                            }
                            LabeledContent(L.text("Standard unit", language: appLanguage)) {
                                Text(InventoryQuantityFormatter.amount(
                                    quantity: ingredient.canonicalQuantity,
                                    unit: ingredient.canonicalUnit,
                                    language: appLanguage
                                ))
                            }
                            if let ruleText = InventoryQuantityFormatter.conversionRuleText(for: ingredient, language: appLanguage) {
                                LabeledContent(L.text("Conversion rule", language: appLanguage)) {
                                    Text(ruleText)
                                }
                            }
                        } else {
                            Text(L.text("Match again to calculate canonical unit.", language: appLanguage))
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Section(L.text("Storage", language: appLanguage)) {
                Picker(L.text("Category", language: appLanguage), selection: $ingredient.categoryRaw) {
                    ForEach(IngredientCategory.allCases) { category in
                        Text(category.displayName(language: appLanguage)).tag(category.rawValue)
                    }
                }
                .pickerStyle(.menu)

                Picker(L.text("Location", language: appLanguage), selection: $ingredient.locationRaw) {
                    ForEach(StorageLocation.allCases) { location in
                        Text(location.displayName(language: appLanguage)).tag(location.rawValue)
                    }
                }
                .pickerStyle(.menu)

                DatePicker(L.text("Enter date", language: appLanguage), selection: $ingredient.enteredDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .environment(\.locale, datePickerLocale)
                DatePicker(L.text("Expire date", language: appLanguage), selection: $ingredient.expireDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .environment(\.locale, datePickerLocale)
            }

            Section(L.text("Recommended storage", language: appLanguage)) {
                ForEach(StorageAdvisor.recommendations(for: ingredient)) { recommendation in
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
        .navigationTitle(ingredient.name)
        .onChange(of: ingredient.name) { _, newValue in
            ingredient.normalizedName = IngredientNormalizer.normalizeName(newValue)
            ingredient.canonicalIngredientId = ""
            clearUnitConversion()
            resolveIngredientName(newValue)
        }
        .onChange(of: ingredient.quantity) { _, _ in
            clearUnitConversion()
        }
        .onChange(of: ingredient.unit) { _, _ in
            clearUnitConversion()
        }
        .onAppear {
            ingredient.unit = IngredientUnit.normalizedSelection(for: ingredient.unit)
            if ingredient.canonicalIngredientId.isEmpty {
                resolveIngredientName(ingredient.name)
            }
        }
        .onChange(of: ingredient.categoryRaw) { _, _ in
            refreshExpireDate()
        }
        .onChange(of: ingredient.locationRaw) { _, _ in
            refreshExpireDate()
        }
        .onChange(of: ingredient.enteredDate) { _, _ in
            refreshExpireDate()
        }
    }

    private func refreshExpireDate() {
        ingredient.expireDate = StorageAdvisor.estimatedExpireDate(
            category: ingredient.category,
            location: ingredient.location,
            enteredDate: ingredient.enteredDate
        )
    }

    private func clearUnitConversion() {
        ingredient.canonicalQuantity = 0
        ingredient.canonicalUnit = ""
        ingredient.unitConversionRatio = 0
        ingredient.unitConversionNeedsReview = false
        ingredient.unitConversionReviewReason = ""
    }

    private var datePickerLocale: Locale {
        Locale(identifier: appLanguage == AppLanguage.chinese.rawValue ? "zh_Hans_US" : "en_US")
    }

    private func resolveIngredientName(_ name: String) {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        resolveTask?.cancel()

        guard !trimmedName.isEmpty else {
            ingredient.canonicalIngredientId = ""
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
                    guard ingredient.name.trimmingCharacters(in: .whitespacesAndNewlines) == trimmedName else { return }
                    ingredient.canonicalIngredientId = result?.known == true ? result?.ingredientId ?? "" : ""
                }
            } catch {
                await MainActor.run {
                    guard ingredient.name.trimmingCharacters(in: .whitespacesAndNewlines) == trimmedName else { return }
                    ingredient.canonicalIngredientId = ""
                }
            }
        }
    }
}
