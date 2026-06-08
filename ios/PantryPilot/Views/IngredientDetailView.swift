import SwiftUI

struct IngredientDetailView: View {
    @Bindable var ingredient: StoredIngredient
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue

    var body: some View {
        Form {
            Section(L.text("Ingredient", language: appLanguage)) {
                TextField(L.text("Name", language: appLanguage), text: $ingredient.name)
                TextField(L.text("Unit", language: appLanguage), text: $ingredient.unit)
                TextField(L.text("Quantity", language: appLanguage), value: $ingredient.quantity, format: .number)
                    .keyboardType(.decimalPad)
            }

            Section(L.text("Storage", language: appLanguage)) {
                Picker(L.text("Category", language: appLanguage), selection: $ingredient.categoryRaw) {
                    ForEach(IngredientCategory.allCases) { category in
                        Text(category.rawValue).tag(category.rawValue)
                    }
                }

                Picker(L.text("Location", language: appLanguage), selection: $ingredient.locationRaw) {
                    ForEach(StorageLocation.allCases) { location in
                        Text(location.rawValue).tag(location.rawValue)
                    }
                }

                DatePicker(L.text("Enter date", language: appLanguage), selection: $ingredient.enteredDate, displayedComponents: .date)
                DatePicker(L.text("Expire date", language: appLanguage), selection: $ingredient.expireDate, displayedComponents: .date)
            }

            Section(L.text("Recommended storage", language: appLanguage)) {
                ForEach(StorageAdvisor.recommendations(for: ingredient)) { recommendation in
                    HStack {
                        Text(recommendation.approach.rawValue)
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
        .navigationTitle(ingredient.name)
        .onChange(of: ingredient.name) { _, newValue in
            ingredient.normalizedName = IngredientNormalizer.normalizeName(newValue)
        }
    }
}
