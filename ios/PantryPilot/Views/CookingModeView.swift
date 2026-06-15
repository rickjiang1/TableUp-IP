import SwiftData
import SwiftUI

struct CookingModeView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @Query private var inventory: [StoredIngredient]
    let recipe: Recipe
    @State private var consumedIngredients: [ConsumedIngredient] = []
    @State private var showingConsumedAlert = false

    private var preview: [IngredientUsagePreview] {
        RecipeMatcher.usagePreview(recipe: recipe, inventory: inventory)
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(RecipeIngredientRole.allCases) { role in
                    let ingredients = recipe.ingredients.filter { $0.role == role }
                    if !ingredients.isEmpty {
                        Section(role.displayName(language: appLanguage)) {
                            ForEach(ingredients) { ingredient in
                                Text(ingredient.displayText)
                            }
                        }
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
                        consumedIngredients = RecipeMatcher.subtract(recipe: recipe, from: inventory)
                        try? modelContext.save()
                        showingConsumedAlert = true
                    }
                    .fontWeight(.semibold)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button(L.text("Close", language: appLanguage)) { dismiss() }
                }
            }
            .alert(L.text("Cooked", language: appLanguage), isPresented: $showingConsumedAlert) {
                Button(L.text("OK", language: appLanguage)) {
                    dismiss()
                }
            } message: {
                Text(consumedMessage)
            }
        }
    }

    private var consumedMessage: String {
        if consumedIngredients.isEmpty {
            return L.text("No inventory items were consumed.", language: appLanguage)
        }

        let lines = consumedIngredients.map {
            "\($0.name): \($0.quantity.formatted()) \($0.unit)"
        }
        return "\(L.text("Consumed", language: appLanguage)):\n" + lines.joined(separator: "\n")
    }
}
