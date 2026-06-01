import SwiftUI

struct IngredientDetailView: View {
    @Bindable var ingredient: StoredIngredient

    var body: some View {
        Form {
            Section("Ingredient") {
                TextField("Name", text: $ingredient.name)
                TextField("Unit", text: $ingredient.unit)
                TextField("Quantity", value: $ingredient.quantity, format: .number)
                    .keyboardType(.decimalPad)
            }

            Section("Storage") {
                Picker("Category", selection: $ingredient.categoryRaw) {
                    ForEach(IngredientCategory.allCases) { category in
                        Text(category.rawValue).tag(category.rawValue)
                    }
                }

                Picker("Location", selection: $ingredient.locationRaw) {
                    ForEach(StorageLocation.allCases) { location in
                        Text(location.rawValue).tag(location.rawValue)
                    }
                }

                DatePicker("Enter date", selection: $ingredient.enteredDate, displayedComponents: .date)
                DatePicker("Expire date", selection: $ingredient.expireDate, displayedComponents: .date)
            }

            Section("Recommended storage") {
                ForEach(StorageAdvisor.recommendations(for: ingredient)) { recommendation in
                    HStack {
                        Text(recommendation.approach.rawValue)
                        Spacer()
                        Text(recommendation.expireDate.formatted(date: .abbreviated, time: .omitted))
                        if recommendation.isRecommended {
                            Text("Best")
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
