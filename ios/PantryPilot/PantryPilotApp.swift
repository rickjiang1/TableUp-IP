import SwiftData
import SwiftUI

@main
struct PantryPilotApp: App {
    private let modelContainer: ModelContainer = {
        let schema = Schema([
            StoredIngredient.self,
            Recipe.self,
            RecipeFolder.self,
            RecipeIngredient.self
        ])
        let configuration = ModelConfiguration(
            "PantryPilotLocalStoreV2",
            schema: schema,
            isStoredInMemoryOnly: false,
            allowsSave: true
        )

        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Could not create Pantry Pilot model container: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            RootTabView()
        }
        .modelContainer(modelContainer)
    }
}
