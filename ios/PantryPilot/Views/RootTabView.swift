import SwiftUI

struct RootTabView: View {
    @State private var selectedTab: TableUpRootTab = .pantry
    @State private var pantryFloatingPanelOpen = false
    @State private var isCheckingSession = true
    @State private var isSignedIn = false
    private let showLoginOnLaunchForTesting = true

    var body: some View {
        ZStack {
            if isCheckingSession {
                TableUpTheme.background
                    .ignoresSafeArea()
                    .overlay {
                        ProgressView()
                            .tint(TableUpTheme.softOrange)
                    }
            } else if isSignedIn {
                ZStack(alignment: .bottom) {
                    Group {
                        switch selectedTab {
                        case .pantry:
                            YouliaoView(isFloatingPanelOpen: $pantryFloatingPanelOpen)
                        case .meal:
                            KaifanView()
                        case .settings:
                            SettingsView()
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .contentShape(Rectangle())
                    .simultaneousGesture(
                        DragGesture(minimumDistance: 44)
                            .onEnded { value in
                                handleTabSwipe(value)
                            }
                    )

                    TableUpBottomNavigation(selectedTab: $selectedTab)
                        .padding(.horizontal, 26)
                        .padding(.bottom, 12)
                }
                .background(TableUpTheme.background.ignoresSafeArea())
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                .ignoresSafeArea(edges: .bottom)
                .statusBarHidden(selectedTab == .pantry)
            } else {
                TableUpLoginView {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isSignedIn = true
                    }
                }
            }
        }
        .task {
            await refreshSession()
        }
        .onOpenURL { url in
            Task {
                await completeAuthCallback(url)
            }
        }
    }

    private func refreshSession() async {
        guard HouseholdSessionStore.hasSession else {
            isCheckingSession = false
            isSignedIn = false
            return
        }

        do {
            _ = try await HouseholdSyncService().refreshSession()
            isSignedIn = !showLoginOnLaunchForTesting
        } catch {
            HouseholdSessionStore.clear()
            isSignedIn = false
        }
        isCheckingSession = false
    }

    private func handleTabSwipe(_ value: DragGesture.Value) {
        let horizontal = value.translation.width
        let vertical = value.translation.height
        if selectedTab == .pantry, pantryFloatingPanelOpen, value.startLocation.y > 260 {
            return
        }
        guard value.startLocation.y < UIScreen.main.bounds.height - 130 else { return }
        guard abs(horizontal) > abs(vertical) * 1.45, abs(horizontal) > 90, abs(vertical) < 90 else { return }

        if horizontal < 0, selectedTab == .pantry {
            withAnimation(.spring(response: 0.32, dampingFraction: 0.86)) {
                selectedTab = .meal
            }
        } else if horizontal > 0, selectedTab == .meal {
            withAnimation(.spring(response: 0.32, dampingFraction: 0.86)) {
                selectedTab = .pantry
            }
        }
    }

    private func completeAuthCallback(_ url: URL) async {
        guard url.scheme == "tableup", url.host == "auth-callback" else { return }
        do {
            _ = try await HouseholdSyncService().completeSupabaseCallback(url: url, provider: .email)
            withAnimation(.easeInOut(duration: 0.2)) {
                isSignedIn = true
                isCheckingSession = false
            }
        } catch {
            HouseholdSessionStore.clear()
            isSignedIn = false
            isCheckingSession = false
        }
    }
}

private enum TableUpRootTab: Hashable, CaseIterable, Identifiable {
    case pantry
    case meal
    case settings
    
    var id: Self { self }
    
    var title: String {
        switch self {
        case .pantry: return "有料"
        case .meal: return "开饭"
        case .settings: return "设置"
        }
    }
    
    var icon: String {
        switch self {
        case .pantry: return "takeoutbag.and.cup.and.straw.fill"
        case .meal: return "fork.knife"
        case .settings: return "gearshape.fill"
        }
    }
}

private struct TableUpBottomNavigation: View {
    @Binding var selectedTab: TableUpRootTab
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(TableUpRootTab.allCases) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    VStack(spacing: 6) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 23, weight: .semibold))
                        Text(tab.title)
                            .font(.caption.weight(.semibold))
                    }
                    .foregroundStyle(selectedTab == tab ? TableUpTheme.orange : TableUpTheme.mutedText)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        Capsule()
                            .fill(selectedTab == tab ? Color.white.opacity(0.10) : Color.clear)
                    )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(tab.title)
            }
        }
        .padding(8)
        .background(TableUpTheme.backgroundLift.opacity(0.96))
        .overlay(
            Capsule()
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.35), radius: 24, y: 12)
    }
}
