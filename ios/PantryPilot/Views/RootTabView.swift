import SwiftUI

struct RootTabView: View {
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("selectedTab") private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            ScanView()
                .tabItem {
                    Label(L.text("Add", language: appLanguage), systemImage: "camera.fill")
                }
                .tag(0)

            StorageView()
                .tabItem {
                    Label(L.text("Storage", language: appLanguage), systemImage: "archivebox.fill")
                }
                .tag(1)

            RecipesView()
                .tabItem {
                    Label(L.text("Recipes", language: appLanguage), systemImage: "book.pages.fill")
                }
                .tag(2)

            CanCookView()
                .tabItem {
                    Label(L.text("Can Cook", language: appLanguage), systemImage: "fork.knife")
                }
                .tag(3)

            SettingsView()
                .tabItem {
                    Label(L.text("Settings", language: appLanguage), systemImage: "gearshape.fill")
                }
                .tag(4)
        }
        .tint(.orange)
    }
}
