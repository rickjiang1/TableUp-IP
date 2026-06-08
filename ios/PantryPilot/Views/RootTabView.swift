import SwiftUI

struct RootTabView: View {
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue

    var body: some View {
        TabView {
            ScanView()
                .tabItem {
                    Label(L.text("Add", language: appLanguage), systemImage: "camera.fill")
                }

            StorageView()
                .tabItem {
                    Label(L.text("Storage", language: appLanguage), systemImage: "archivebox.fill")
                }

            RecipesView()
                .tabItem {
                    Label(L.text("Recipes", language: appLanguage), systemImage: "book.pages.fill")
                }

            CanCookView()
                .tabItem {
                    Label(L.text("Can Cook", language: appLanguage), systemImage: "fork.knife")
                }

            SettingsView()
                .tabItem {
                    Label(L.text("Settings", language: appLanguage), systemImage: "gearshape.fill")
                }
        }
        .tint(.orange)
    }
}
