import SwiftData
import SwiftUI

struct StorageView: View {
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
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
                if ingredients.isEmpty {
                    ContentUnavailableView(
                        L.text("No saved food", language: appLanguage),
                        systemImage: "archivebox",
                        description: Text(L.text("Saved ingredients will appear here.", language: appLanguage))
                    )
                    .listRowBackground(Color.clear)
                }

                ForEach(groupedIngredients, id: \.0) { category, items in
                    Section(category.displayName(language: appLanguage)) {
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
            .navigationTitle(L.text("Storage", language: appLanguage))
        }
    }
}

struct IngredientRow: View {
    let ingredient: StoredIngredient
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("expirationReminderDays") private var expirationReminderDays = 3

    private var expirationState: ExpirationState {
        ExpirationState(
            expireDate: ingredient.expireDate,
            reminderDays: expirationReminderDays
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(ingredient.name)
                    .fontWeight(.semibold)
                Spacer()
                Text("\(ingredient.quantity.formatted()) \(ingredient.unit)")
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 8) {
                Text("\(ingredient.location.displayName(language: appLanguage)) - \(L.text("expires", language: appLanguage)) \(ingredient.expireDate.formatted(date: .abbreviated, time: .omitted))")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                if let badge = expirationState.badgeText {
                    Text(L.text(badge, language: appLanguage))
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(expirationState.foregroundColor)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(expirationState.backgroundColor)
                        .clipShape(Capsule())
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack {
                    ForEach(StorageAdvisor.recommendations(for: ingredient)) { recommendation in
                        Text("\(recommendation.approach.displayName(language: appLanguage)): \(recommendation.expireDate.formatted(date: .numeric, time: .omitted))\(recommendation.isRecommended ? " \(L.text("best", language: appLanguage))" : "")")
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

struct ExpirationState {
    let expireDate: Date
    let reminderDays: Int

    private var daysUntilExpiration: Int {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        let expirationDay = calendar.startOfDay(for: expireDate)
        return calendar.dateComponents([.day], from: today, to: expirationDay).day ?? 0
    }

    var badgeText: String? {
        if daysUntilExpiration < 0 {
            return "Expired"
        }

        if daysUntilExpiration <= reminderDays {
            return daysUntilExpiration == 0 ? "Expires today" : "Expires soon"
        }

        return nil
    }

    var foregroundColor: Color {
        daysUntilExpiration < 0 ? .red : .orange
    }

    var backgroundColor: Color {
        foregroundColor.opacity(0.14)
    }
}
