import SwiftData
import SwiftUI

@main
struct PantryPilotApp: App {
    var body: some Scene {
        WindowGroup {
            RootTabView()
        }
        .modelContainer(for: [
            StoredIngredient.self,
            Recipe.self,
            RecipeIngredient.self
        ])
    }
}
