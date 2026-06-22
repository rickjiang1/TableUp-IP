import SwiftUI

struct FamilyInventoryView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var session: HouseholdSession?
    @State private var members: [HouseholdMember] = []
    @State private var items: [HouseholdInventoryItem] = []
    @State private var isLoading = false
    @State private var errorMessage = ""

    private var groupedItems: [(StorageLocation, [HouseholdInventoryItem])] {
        let knownLocations = Set(StorageLocation.displayOrder.map(\.rawValue))
        return StorageLocation.displayOrder.compactMap { location in
            let filtered = items
                .filter {
                    $0.location == location.rawValue ||
                    (location == .pantry && !knownLocations.contains($0.location))
                }
                .sorted { lhs, rhs in
                    if lhs.expireDate != rhs.expireDate {
                        return lhs.expireDate < rhs.expireDate
                    }
                    return lhs.name.localizedStandardCompare(rhs.name) == .orderedAscending
            }
            return filtered.isEmpty ? nil : (location, filtered)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                TableUpTheme.background.ignoresSafeArea()

                LinearGradient(
                    colors: [
                        TableUpTheme.softOrange.opacity(0.18),
                        Color.clear,
                        Color.black.opacity(0.45)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        header
                        memberSection
                        inventorySection
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 18)
                    .padding(.bottom, 36)
                }
                .refreshable {
                    await load()
                }

                if isLoading && items.isEmpty && members.isEmpty {
                    ProgressView()
                        .tint(TableUpTheme.softOrange)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L.text("Close", language: appLanguage)) { dismiss() }
                        .foregroundStyle(TableUpTheme.softOrange)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await load() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(isLoading)
                    .foregroundStyle(TableUpTheme.softOrange)
                }
            }
            .task {
                await load()
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(text("家庭库存", "Family inventory"))
                .font(.system(size: 36, weight: .semibold, design: .serif))
                .foregroundStyle(TableUpTheme.inkText)

            HStack(spacing: 10) {
                Label(session?.household.name ?? HouseholdSessionStore.householdName, systemImage: "house.fill")
                Text("·")
                Text(text("\(items.count) 种食材", "\(items.count) item(s)"))
                Text("·")
                Text(text("\(members.count) 位成员", "\(members.count) member(s)"))
            }
            .font(.subheadline.weight(.medium))
            .foregroundStyle(TableUpTheme.mutedText)

            if !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(TableUpTheme.warningRed)
                    .padding(.top, 2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var memberSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(text("家庭成员", "Family members"))
                .font(.headline.weight(.semibold))
                .foregroundStyle(TableUpTheme.inkText)

            if members.isEmpty {
                familyEmptyCard(
                    title: text("还没有成员信息", "No member details yet"),
                    subtitle: text("刷新后会显示已加入家庭厨房的人。", "Refresh to see who has joined this kitchen.")
                )
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(members) { member in
                            memberCard(member)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }

    @ViewBuilder
    private var inventorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(text("共享食材", "Shared ingredients"))
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(TableUpTheme.inkText)
                Spacer()
                Text(text("从个人库存左滑加入", "Swipe personal items to add"))
                    .font(.caption.weight(.medium))
                    .foregroundStyle(TableUpTheme.softOrange.opacity(0.86))
            }

            if items.isEmpty {
                familyEmptyCard(
                    title: text("家庭库存还是空的", "Family inventory is empty"),
                    subtitle: text("回到个人库存，左滑食材，点“加入家庭”。", "Go back to personal inventory, swipe an item, then tap Add to family.")
                )
            } else {
                ForEach(groupedItems, id: \.0) { location, locationItems in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 8) {
                            Image(systemName: location.familyIcon)
                                .foregroundStyle(TableUpTheme.softOrange)
                            Text(location.displayName(language: appLanguage))
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(TableUpTheme.inkText)
                            Text("\(locationItems.count)")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(TableUpTheme.softOrange)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(TableUpTheme.softOrange.opacity(0.14))
                                .clipShape(Capsule())
                        }

                        ForEach(locationItems) { item in
                            FamilyInventoryItemRow(item: item)
                        }
                    }
                    .padding(.top, 4)
                }
            }
        }
    }

    private func memberCard(_ member: HouseholdMember) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Text(String(member.displayName.prefix(1)))
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(Color(red: 0.12, green: 0.08, blue: 0.04))
                    .frame(width: 36, height: 36)
                    .background(TableUpTheme.softOrange)
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 2) {
                    Text(member.displayName)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(TableUpTheme.inkText)
                        .lineLimit(1)
                    Text(roleText(member.role))
                        .font(.caption.weight(.medium))
                        .foregroundStyle(TableUpTheme.softOrange)
                }
            }

            if let lastSeenText = relativeDate(member.lastSeenAt) {
                Text(text("最近使用：\(lastSeenText)", "Last seen: \(lastSeenText)"))
                    .font(.caption2)
                    .foregroundStyle(TableUpTheme.mutedText)
                    .lineLimit(1)
            }
        }
        .frame(width: 178, alignment: .leading)
        .padding(14)
        .background(.ultraThinMaterial.opacity(0.20))
        .background(Color.white.opacity(0.055))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(TableUpTheme.softOrange.opacity(0.18), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func familyEmptyCard(title: String, subtitle: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "person.2.fill")
                .font(.title3)
                .foregroundStyle(TableUpTheme.softOrange)
                .frame(width: 42, height: 42)
                .background(TableUpTheme.softOrange.opacity(0.14))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(TableUpTheme.inkText)
                Text(subtitle)
                    .font(.footnote)
                    .foregroundStyle(TableUpTheme.mutedText)
            }
            Spacer()
        }
        .padding(14)
        .background(Color.white.opacity(0.055))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(TableUpTheme.cardStroke, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    @MainActor
    private func load() async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = ""
        defer { isLoading = false }

        do {
            let service = HouseholdSyncService()
            async let refreshedSession = service.refreshSession()
            async let fetchedMembers = service.fetchMembers()
            async let fetchedItems = service.fetchFamilyInventory()
            session = try await refreshedSession
            members = try await fetchedMembers
            items = try await fetchedItems
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func roleText(_ role: String) -> String {
        switch role {
        case "owner":
            return text("创建者", "Owner")
        case "admin":
            return text("管理员", "Admin")
        default:
            return text("成员", "Member")
        }
    }

    private func relativeDate(_ value: String?) -> String? {
        guard let value, !value.isEmpty else { return nil }
        let isoFormatter = ISO8601DateFormatter()
        let postgresFormatter = DateFormatter()
        postgresFormatter.locale = Locale(identifier: "en_US_POSIX")
        postgresFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        postgresFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSSXXXXX"
        guard let date = isoFormatter.date(from: value) ?? postgresFormatter.date(from: value) else {
            return nil
        }
        return TableUpDateFormatter.date(date, language: appLanguage)
    }

    private func text(_ zh: String, _ en: String) -> String {
        appLanguage == AppLanguage.chinese.rawValue ? zh : en
    }
}

private struct FamilyInventoryItemRow: View {
    let item: HouseholdInventoryItem
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(TableUpTheme.softOrange.opacity(0.13))
                .frame(width: 46, height: 46)
                .overlay(
                    Image(systemName: location.familyIcon)
                        .foregroundStyle(TableUpTheme.softOrange)
                )

            VStack(alignment: .leading, spacing: 5) {
                Text(item.name)
                    .font(.headline)
                    .foregroundStyle(TableUpTheme.inkText)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    Text(primaryAmount)
                    Text(location.displayName(language: appLanguage))
                    Text(TableUpDateFormatter.date(item.expireDate, language: appLanguage))
                }
                .font(.caption)
                .foregroundStyle(TableUpTheme.mutedText)
                .lineLimit(1)
            }

            Spacer()

            Image(systemName: "person.2.fill")
                .font(.caption.weight(.semibold))
                .foregroundStyle(TableUpTheme.softOrange)
        }
        .padding(14)
        .background(Color.white.opacity(0.065))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(TableUpTheme.cardStroke, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private var location: StorageLocation {
        StorageLocation(rawValue: item.location) ?? .fridge
    }

    private var primaryAmount: String {
        let quantity = item.quantity.formatted(.number.precision(.fractionLength(0...2)))
        let unit = IngredientUnit(rawValue: item.unit)?.displayName(language: appLanguage) ?? item.unit
        return "\(quantity) \(unit)"
    }
}

private extension StorageLocation {
    static var displayOrder: [StorageLocation] {
        [.fridge, .freezer, .pantry, .counter]
    }

    var familyIcon: String {
        switch self {
        case .fridge:
            return "refrigerator"
        case .freezer:
            return "snowflake"
        case .pantry:
            return "cabinet"
        case .counter:
            return "table.furniture"
        }
    }
}
