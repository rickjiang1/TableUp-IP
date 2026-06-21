import SwiftUI

struct TableUpLoginView: View {
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var displayName = ""
    @State private var inviteCode = ""
    @State private var isSigningIn = false
    @State private var errorMessage = ""
    @FocusState private var focusedField: LoginField?

    let onSignedIn: () -> Void

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                Image("TableUpYouliaoMockBackground")
                    .resizable()
                    .scaledToFill()
                    .frame(width: proxy.size.width, height: proxy.size.height)
                    .clipped()
                    .overlay(Color.black.opacity(0.42))
                    .ignoresSafeArea()

                LinearGradient(
                    colors: [
                        Color.black.opacity(0.08),
                        TableUpTheme.background.opacity(0.72),
                        Color.black.opacity(0.92)
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

                        Text(text("一家人的厨房账本", "A shared kitchen ledger"))
                            .font(.headline.weight(.medium))
                            .foregroundStyle(TableUpTheme.softOrange)

                        Text(text("先告诉我怎么称呼你。之后你可以把个人库存加入家庭库存，一家人一起看。", "Tell TableUp your name. You can keep personal inventory private, then add items to the family kitchen when ready."))
                            .font(.footnote)
                            .multilineTextAlignment(.center)
                            .foregroundStyle(TableUpTheme.mutedText)
                            .padding(.horizontal, 18)
                    }

                    loginCard
                        .padding(.horizontal, 26)

                    Spacer()
                }
                .frame(width: proxy.size.width, height: proxy.size.height)
            }
        }
        .dismissKeyboardOnTap()
        .onAppear {
            if displayName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                displayName = text("我", "Me")
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                focusedField = .name
            }
        }
    }

    private var loginCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Label(text("你的名字", "Your name"), systemImage: "person.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(TableUpTheme.softOrange)

                TextField(text("例如：Rick", "For example: Rick"), text: $displayName)
                    .focused($focusedField, equals: .name)
                    .textInputAutocapitalization(.words)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .invite }
                    .loginInputStyle()
            }

            VStack(alignment: .leading, spacing: 8) {
                Label(text("家庭邀请码（可选）", "Family invite code (optional)"), systemImage: "person.2.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(TableUpTheme.softOrange)

                TextField(text("有邀请码就填这里", "Enter an invite code if you have one"), text: $inviteCode)
                    .focused($focusedField, equals: .invite)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .submitLabel(.go)
                    .onSubmit { Task { await signIn() } }
                    .loginInputStyle()
            }

            if !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(TableUpTheme.warningRed)
            }

            Button {
                Task { await signIn() }
            } label: {
                HStack {
                    if isSigningIn {
                        ProgressView()
                            .tint(Color(red: 0.15, green: 0.09, blue: 0.04))
                    } else {
                        Image(systemName: inviteCodeTrimmed.isEmpty ? "arrow.right.circle.fill" : "person.2.badge.plus.fill")
                    }
                    Text(inviteCodeTrimmed.isEmpty ? text("进入我的厨房", "Enter my kitchen") : text("加入家庭厨房", "Join family kitchen"))
                        .font(.headline.weight(.semibold))
                }
                .foregroundStyle(Color(red: 0.15, green: 0.09, blue: 0.04))
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(
                    LinearGradient(
                        colors: [TableUpTheme.softOrange, TableUpTheme.orange],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(isSigningIn)
            .opacity(isSigningIn ? 0.72 : 1)

            Text(text("MVP 使用本机安全 token 登录；真正邮箱/Apple 登录可以在下一阶段接上。", "MVP sign-in uses a secure device token. Email or Apple sign-in can be added next."))
                .font(.caption)
                .foregroundStyle(TableUpTheme.mutedText.opacity(0.82))
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
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

    private func signIn() async {
        guard !isSigningIn else { return }
        isSigningIn = true
        errorMessage = ""
        defer { isSigningIn = false }

        do {
            let name = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
            let service = HouseholdSyncService()
            _ = try await service.bootstrapIfNeeded(displayName: name.isEmpty ? "TableUp User" : name)
            if !inviteCodeTrimmed.isEmpty {
                _ = try await service.joinHousehold(code: inviteCodeTrimmed)
            }
            onSignedIn()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private var inviteCodeTrimmed: String {
        inviteCode.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func text(_ zh: String, _ en: String) -> String {
        appLanguage == AppLanguage.chinese.rawValue ? zh : en
    }
}

private enum LoginField: Hashable {
    case name
    case invite
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
