import SwiftData
import SwiftUI

struct CanCookView: View {
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("almostCookThreshold") private var threshold = 0.7
    @Query private var ingredients: [StoredIngredient]
    @Query private var recipes: [Recipe]

    private var assessments: [CookAssessment] {
        recipes.map { RecipeMatcher.assess(recipe: $0, inventory: ingredients) }
    }

    private var ready: [CookAssessment] {
        assessments.filter(\.canCook)
    }

    private var almostReady: [CookAssessment] {
        assessments.filter { !$0.canCook && $0.matchRatio >= threshold }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        SummaryTile(value: ready.count, label: L.text("dishes ready", language: appLanguage))
                        SummaryTile(value: almostReady.count, label: L.text("almost there", language: appLanguage))
                    }
                    .listRowSeparator(.hidden)
                }

                Section(L.text("Ready to cook", language: appLanguage)) {
                    if ready.isEmpty {
                        Text(L.text("No full matches yet.", language: appLanguage))
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(ready, id: \.recipe.id) { assessment in
                            NavigationLink {
                                RecipeDetailView(recipe: assessment.recipe)
                            } label: {
                                CookAssessmentRow(assessment: assessment)
                            }
                        }
                    }
                }

                Section(L.text("Almost there", language: appLanguage)) {
                    if almostReady.isEmpty {
                        Text(emptyAlmostReadyText)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(almostReady, id: \.recipe.id) { assessment in
                            NavigationLink {
                                RecipeDetailView(recipe: assessment.recipe)
                            } label: {
                                CookAssessmentRow(assessment: assessment)
                            }
                        }
                    }
                }
            }
            .navigationTitle(L.text("Can Cook", language: appLanguage))
        }
    }

    private var emptyAlmostReadyText: String {
        if appLanguage == AppLanguage.chinese.rawValue {
            return "还没有 \(Int(threshold * 100))%+ 匹配的食谱。"
        }
        return "No \(Int(threshold * 100))%+ matches yet."
    }
}

struct SummaryTile: View {
    let value: Int
    let label: String

    var body: some View {
        VStack(alignment: .leading) {
            Text("\(value)")
                .font(.largeTitle)
                .foregroundStyle(.orange)
            Text(label)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

struct CookAssessmentRow: View {
    let assessment: CookAssessment
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(assessment.recipe.name)
                        .fontWeight(.semibold)
                    Text("\(Int(assessment.matchRatio * 100))% \(L.text("Ingredients", language: appLanguage).lowercased())")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if assessment.canCook {
                    Text(L.text("Ready", language: appLanguage))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.green)
                }
            }

            if !assessment.missing.isEmpty {
                ForEach(assessment.missing) { missing in
                    Text("\(L.text("Missing", language: appLanguage)) \(missing.shortage.formatted()) \(missing.unit) \(missing.name), \(L.text("have", language: appLanguage)) \(missing.available.formatted())")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 6)
    }
}
