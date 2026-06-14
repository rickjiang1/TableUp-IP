import SwiftUI

struct IngredientDetailView: View {
    @Bindable var ingredient: StoredIngredient
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var resolveTask: Task<Void, Never>?

    var body: some View {
        Form {
            Section(L.text("Ingredient", language: appLanguage)) {
                TextField(L.text("Name", language: appLanguage), text: $ingredient.name)
                if ingredient.isMatchedToIngredientLibrary {
                    Label(ingredient.canonicalIngredientId, systemImage: "checkmark.seal.fill")
                        .font(.footnote)
                        .foregroundStyle(.green)
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
                DatePicker(L.text("Expire date", language: appLanguage), selection: $ingredient.expireDate, displayedComponents: .date)
            }

            Section(L.text("Recommended storage", language: appLanguage)) {
                ForEach(StorageAdvisor.recommendations(for: ingredient)) { recommendation in
                    HStack {
                        Text(recommendation.approach.displayName(language: appLanguage))
                        Spacer()
                        Text(recommendation.expireDate.formatted(date: .abbreviated, time: .omitted))
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
            resolveIngredientName(newValue)
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
