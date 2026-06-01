import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            ScanView()
                .tabItem {
                    Label("Add", systemImage: "camera.fill")
                }

            StorageView()
                .tabItem {
                    Label("Storage", systemImage: "archivebox.fill")
                }

            RecipesView()
                .tabItem {
                    Label("Recipes", systemImage: "book.pages.fill")
                }

            CanCookView()
                .tabItem {
                    Label("Can Cook", systemImage: "fork.knife")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
        .tint(.orange)
    }
}
