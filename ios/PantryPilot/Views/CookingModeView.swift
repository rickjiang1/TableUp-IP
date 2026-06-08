import SwiftData
import SwiftUI

struct CookingModeView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @Query private var inventory: [StoredIngredient]
    let recipe: Recipe

    private var preview: [IngredientUsagePreview] {
        RecipeMatcher.usagePreview(recipe: recipe, inventory: inventory)
    }

    var body: some View {
        NavigationStack {
            List {
                Section(L.text("Ingredients", language: appLanguage)) {
                    ForEach(recipe.ingredients) { ingredient in
                        Text("\(ingredient.quantity.formatted()) \(ingredient.unit) \(ingredient.name)")
                    }
                }

                Section(L.text("After cooking", language: appLanguage)) {
                    ForEach(preview) { item in
                        HStack {
                            Text(item.name)
                            Spacer()
                            VStack(alignment: .trailing) {
                                Text("\(L.text("Use", language: appLanguage)) \(item.needed.formatted()) \(item.unit)")
                                Text("\(L.text("Left", language: appLanguage)) \(item.leftover.formatted()) \(item.unit)")
                                    .foregroundStyle(.secondary)
                            }
                            .font(.footnote)
                        }
                    }
                }

                Section(L.text("Steps", language: appLanguage)) {
                    ForEach(Array(recipe.steps.enumerated()), id: \.offset) { index, step in
                        Text("\(index + 1). \(step)")
                    }
                }
            }
            .navigationTitle(recipe.name)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(L.text("Cooked", language: appLanguage)) {
                        RecipeMatcher.subtract(recipe: recipe, from: inventory)
                        try? modelContext.save()
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button(L.text("Close", language: appLanguage)) { dismiss() }
                }
            }
        }
    }
}
