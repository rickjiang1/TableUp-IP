import SwiftData
import SwiftUI

struct CanCookView: View {
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
                        SummaryTile(value: ready.count, label: "dishes ready")
                        SummaryTile(value: almostReady.count, label: "almost there")
                    }
                    .listRowSeparator(.hidden)
                }

                Section("Ready to cook") {
                    if ready.isEmpty {
                        Text("No full matches yet.")
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

                Section("Almost there") {
                    if almostReady.isEmpty {
                        Text("No \(Int(threshold * 100))%+ matches yet.")
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
            .navigationTitle("Can Cook")
        }
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

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(assessment.recipe.name)
                        .fontWeight(.semibold)
                    Text("\(Int(assessment.matchRatio * 100))% ingredients")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if assessment.canCook {
                    Text("Ready")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.green)
                }
            }

            if !assessment.missing.isEmpty {
                ForEach(assessment.missing) { missing in
                    Text("Missing \(missing.shortage.formatted()) \(missing.unit) \(missing.name), have \(missing.available.formatted())")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 6)
    }
}
