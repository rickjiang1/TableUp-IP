import SwiftData
import SwiftUI

struct StorageView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \StoredIngredient.categoryRaw) private var ingredients: [StoredIngredient]

    var groupedIngredients: [(IngredientCategory, [StoredIngredient])] {
        IngredientCategory.allCases.compactMap { category in
            let items = ingredients.filter { $0.category == category }
            return items.isEmpty ? nil : (category, items)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(groupedIngredients, id: \.0) { category, items in
                    Section(category.rawValue) {
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
            .navigationTitle("Storage")
        }
    }
}

struct IngredientRow: View {
    let ingredient: StoredIngredient

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(ingredient.name)
                    .fontWeight(.semibold)
                Spacer()
                Text("\(ingredient.quantity.formatted()) \(ingredient.unit)")
                    .foregroundStyle(.secondary)
            }

            Text("\(ingredient.location.rawValue) - expires \(ingredient.expireDate.formatted(date: .abbreviated, time: .omitted))")
                .font(.footnote)
                .foregroundStyle(.secondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack {
                    ForEach(StorageAdvisor.recommendations(for: ingredient)) { recommendation in
                        Text("\(recommendation.approach.rawValue): \(recommendation.expireDate.formatted(date: .numeric, time: .omitted))\(recommendation.isRecommended ? " best" : "")")
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(recommendation.isRecommended ? Color.orange.opacity(0.12) : Color(.secondarySystemBackground))
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}
