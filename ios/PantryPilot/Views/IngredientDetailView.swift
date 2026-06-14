import SwiftUI

struct IngredientDetailView: View {
    @Bindable var ingredient: StoredIngredient
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue

    var body: some View {
        Form {
            Section(L.text("Ingredient", language: appLanguage)) {
                TextField(L.text("Name", language: appLanguage), text: $ingredient.name)
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
        }
        .onAppear {
            ingredient.unit = IngredientUnit.normalizedSelection(for: ingredient.unit)
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
}
