import SwiftUI

struct TableUpLoginView: View {
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var email = ""
    @State private var isSigningIn = false
    @State private var errorMessage = ""
    @State private var successMessage = ""
    @FocusState private var isEmailFocused: Bool

    let onSignedIn: () -> Void

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                Image("LoginKitchenBackground")
                    .resizable()
                    .scaledToFill()
                    .frame(width: proxy.size.width, height: proxy.size.height)
                    .clipped()
                    .overlay(Color.black.opacity(0.30))
                    .ignoresSafeArea()

                LinearGradient(
                    colors: [
                        Color.black.opacity(0.08),
                        TableUpTheme.background.opacity(0.54),
                        Color.black.opacity(0.86)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                VStack(spacing: 24) {
                    Spacer(minLength: proxy.size.height * 0.13)

                    VStack(spacing: 10) {
                        Text("TableUp")
                            .font(.system(size: 42, weight: .semibold, design: .serif))
                            .foregroundStyle(TableUpTheme.inkText)
                    }

                    loginCard
                        .padding(.horizontal, 26)

                    Spacer()
                }
                .frame(width: proxy.size.width, height: proxy.size.height)
            }
        }
        .dismissKeyboardOnTap()
    }

    private var loginCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            if !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(TableUpTheme.warningRed)
            }
            if !successMessage.isEmpty {
                Text(successMessage)
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(TableUpTheme.softOrange)
            }

            VStack(spacing: 10) {
                loginProviderButton(
                    title: "游客模式继续",
                    systemImage: "person.crop.circle",
                    style: .gold
                ) {
                    Task { await continueAsGuest() }
                }

                loginProviderButton(
                    title: "使用 Apple 继续",
                    systemImage: "apple.logo",
                    style: .dark
                ) {
                    Task { await signInWithOAuth(.apple) }
                }

                loginProviderButton(
                    title: "使用 Google 继续",
                    systemImage: "g.circle.fill",
                    style: .light
                ) {
                    Task { await signInWithOAuth(.google) }
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Label("邮箱 Magic Link", systemImage: "envelope.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(TableUpTheme.softOrange)

                HStack(spacing: 10) {
                    TextField("输入邮箱", text: $email)
                        .focused($isEmailFocused)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.send)
                        .onSubmit { Task { await sendMagicLink() } }
                        .loginInputStyle()

                    Button {
                        Task { await sendMagicLink() }
                    } label: {
                        Image(systemName: "paperplane.fill")
                            .font(.headline.weight(.semibold))
                            .foregroundStyle(Color(red: 0.15, green: 0.09, blue: 0.04))
                            .frame(width: 50, height: 50)
                            .background(TableUpTheme.softOrange)
                            .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .disabled(isSigningIn)
                }
            }
        }
        .padding(20)
        .background(.ultraThinMaterial.opacity(0.28))
        .background(Color.black.opacity(0.56))
        .overlay(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(TableUpTheme.softOrange.opacity(0.32), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
        .shadow(color: .black.opacity(0.45), radius: 28, y: 16)
    }

    private func loginProviderButton(
        title: String,
        systemImage: String,
        style: LoginProviderButtonStyle,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: systemImage)
                    .font(.headline.weight(.semibold))
                Text(title)
                    .font(.headline.weight(.semibold))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .opacity(0.72)
            }
            .foregroundStyle(style.foreground)
            .padding(.horizontal, 16)
            .frame(height: 50)
            .background(style.background)
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(style.stroke, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(isSigningIn)
        .opacity(isSigningIn ? 0.72 : 1)
    }

    private func continueAsGuest() async {
        guard !isSigningIn else { return }
        isSigningIn = true
        errorMessage = ""
        successMessage = ""
        defer { isSigningIn = false }

        do {
            _ = try await HouseholdSyncService().continueAsGuest()
            onSignedIn()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func signInWithOAuth(_ provider: SupabaseAuthProvider) async {
        guard !isSigningIn else { return }
        isSigningIn = true
        errorMessage = ""
        successMessage = ""
        defer { isSigningIn = false }

        do {
            _ = try await HouseholdSyncService().signInWithOAuth(provider: provider)
            onSignedIn()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func sendMagicLink() async {
        guard !isSigningIn else { return }
        isSigningIn = true
        errorMessage = ""
        successMessage = ""
        defer { isSigningIn = false }

        do {
            try await HouseholdSyncService().sendMagicLink(email: email)
            successMessage = "登录链接已发送，请检查邮箱。"
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func text(_ zh: String, _ en: String) -> String {
        zh
    }
}

private enum LoginProviderButtonStyle {
    case dark
    case light
    case gold

    var foreground: Color {
        switch self {
        case .dark:
            return TableUpTheme.inkText
        case .light, .gold:
            return Color(red: 0.15, green: 0.09, blue: 0.04)
        }
    }

    var background: Color {
        switch self {
        case .dark:
            return Color.black.opacity(0.44)
        case .light:
            return Color(red: 0.95, green: 0.86, blue: 0.70).opacity(0.92)
        case .gold:
            return TableUpTheme.softOrange.opacity(0.96)
        }
    }

    var stroke: Color {
        switch self {
        case .dark:
            return TableUpTheme.softOrange.opacity(0.28)
        case .light, .gold:
            return Color.white.opacity(0.28)
        }
    }
}

private extension View {
    func loginInputStyle() -> some View {
        self
            .font(.headline.weight(.medium))
            .foregroundStyle(TableUpTheme.inkText)
            .padding(.horizontal, 14)
            .frame(height: 50)
            .background(Color.black.opacity(0.34))
            .overlay(
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .stroke(TableUpTheme.softOrange.opacity(0.28), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
    }
}
