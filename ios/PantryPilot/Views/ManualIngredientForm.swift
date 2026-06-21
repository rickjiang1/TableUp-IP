import SwiftUI

struct ManualIngredientForm: View {
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var name = ""
    @State private var quantity = 1.0
    @State private var unit = "piece"
    @State private var category = IngredientCategory.other
    @State private var location = StorageLocation.fridge
    @State private var enteredDate = Date()
    @State private var expireDate = Date()
    @State private var isSaving = false
    @State private var activeCard: ManualLedgerCard = .ingredient
    @FocusState private var focusedField: ManualLedgerFocus?

    let onSave: (IngredientInput) async -> Bool

    var body: some View {
        VStack(spacing: 22) {
            ledgerHero

            VStack(spacing: 6) {
                Text(text("请填写以下信息", "Fill in the ledger"))
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(ledgerGold)
                ledgerDivider
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 14) {
                    ingredientCard
                    quantityCard
                    categoryCard
                    storageCard
                    dateCard
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 4)
            }
            .scrollClipDisabled()

            saveButton
        }
        .padding(.bottom, 20)
        .onAppear {
            refreshExpireDate()
        }
        .task {
            await StorageAdvisor.refreshCloudRules()
            refreshExpireDate()
        }
        .onChange(of: category) { _, _ in
            refreshExpireDate()
        }
        .onChange(of: location) { _, _ in
            refreshExpireDate()
        }
        .onChange(of: enteredDate) { _, _ in
            refreshExpireDate()
        }
        .onChange(of: name) { _, _ in
            refreshExpireDate()
        }
    }

    private var ledgerHero: some View {
        ZStack(alignment: .leading) {
            Image("ManualLedgerReference")
                .resizable()
                .scaledToFill()
                .frame(height: 350, alignment: .top)
                .clipped()
                .overlay(
                    LinearGradient(
                        colors: [
                            ledgerBlack.opacity(0.08),
                            ledgerBlack.opacity(0.12),
                            ledgerBlack.opacity(0.82)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )

            VStack(alignment: .leading, spacing: 12) {
                Text("手动录入")
                    .font(.system(size: 42, weight: .semibold, design: .serif))
                    .foregroundStyle(ledgerGold)
                Text("记录每一份食材，让厨房有数可依")
                    .font(.callout.weight(.medium))
                    .foregroundStyle(ledgerPaper.opacity(0.84))
                    .lineSpacing(3)
                    .frame(width: 180, alignment: .leading)
            }
            .padding(.leading, 24)
            .padding(.top, 30)
        }
        .frame(maxWidth: .infinity)
    }

    private var ingredientCard: some View {
        ledgerCard(
            card: .ingredient,
            icon: "ManualIconName",
            title: text("食材", "Ingredient"),
            detail: text("输入食材名称", "Enter ingredient name"),
            example: name.isEmpty ? text("如：白菜", "e.g. cabbage") : name
        ) {
            TextField(text("如：白菜", "e.g. cabbage"), text: $name)
                .focused($focusedField, equals: .name)
                .textFieldStyle(.plain)
                .foregroundStyle(ledgerInk)
                .submitLabel(.done)
                .ledgerInputStrip()
        }
        .onTapGesture {
            activate(.ingredient)
            focusedField = .name
        }
    }

    private var quantityCard: some View {
        ledgerCard(
            card: .quantity,
            icon: "ManualIconQuantity",
            title: text("份量", "Amount"),
            detail: text("输入数量和单位", "Enter quantity and unit"),
            example: text("如：2 颗", "e.g. 2 pieces")
        ) {
            HStack(spacing: 8) {
                TextField("2", value: $quantity, format: .number)
                    .focused($focusedField, equals: .quantity)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.plain)
                    .foregroundStyle(ledgerInk)
                    .frame(width: 64)

                Menu {
                    ForEach(IngredientUnit.allCases) { unit in
                        Button(unit.displayName(language: appLanguage)) {
                            self.unit = unit.rawValue
                        }
                    }
                } label: {
                    HStack(spacing: 5) {
                        Text(displayUnit)
                            .lineLimit(1)
                        Image(systemName: "chevron.down")
                            .font(.caption2.weight(.bold))
                    }
                    .foregroundStyle(ledgerInk)
                }
            }
            .ledgerInputStrip()
        }
        .onTapGesture {
            activate(.quantity)
            focusedField = .quantity
        }
    }

    private var categoryCard: some View {
        ledgerCard(
            card: .category,
            icon: "ManualIconCategory",
            title: text("归类", "Category"),
            detail: text("选择食材分类", "Choose category"),
            example: text("如：蔬菜类", "e.g. vegetables")
        ) {
            Menu {
                ForEach(IngredientCategory.allCases) { category in
                    Button(category.displayName(language: appLanguage)) {
                        self.category = category
                        activate(.category)
                    }
                }
            } label: {
                ledgerSelectionText(category.displayName(language: appLanguage))
            }
            .ledgerInputStrip()
        }
        .onTapGesture { activate(.category) }
    }

    private var storageCard: some View {
        ledgerCard(
            card: .storage,
            icon: "ManualIconStorage",
            title: text("存放", "Storage"),
            detail: text("选择储存方式", "Choose storage method"),
            example: text("如：冷藏", "e.g. fridge")
        ) {
            Menu {
                ForEach(StorageLocation.selectableCases) { location in
                    Button(location.displayName(language: appLanguage)) {
                        self.location = location
                        activate(.storage)
                    }
                }
            } label: {
                ledgerSelectionText(location.displayName(language: appLanguage))
            }
            .ledgerInputStrip()
        }
        .onTapGesture { activate(.storage) }
    }

    private var dateCard: some View {
        ledgerCard(
            card: .date,
            icon: "ManualIconDate",
            title: text("日期", "Date"),
            detail: text("选择记录日期 / 过期日期", "Choose entered / expire date"),
            example: "2024/05/20"
        ) {
            VStack(alignment: .leading, spacing: 8) {
                DatePicker(L.text("Enter date", language: appLanguage), selection: $enteredDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .environment(\.locale, datePickerLocale)
                    .tint(ledgerGold)
                DatePicker(L.text("Expire date", language: appLanguage), selection: $expireDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .environment(\.locale, datePickerLocale)
                    .tint(ledgerGold)
            }
            .font(.caption.weight(.medium))
            .ledgerInputStrip()
        }
        .onTapGesture { activate(.date) }
    }

    private func ledgerCard<Content: View>(
        card: ManualLedgerCard,
        icon: String,
        title: String,
        detail: String,
        example: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(spacing: 12) {
            Image(icon)
                .resizable()
                .scaledToFit()
                .frame(width: 58, height: 58)
                .padding(.top, 2)

            VStack(spacing: 5) {
                Text(title)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(ledgerGold)
                Text(detail)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(ledgerGold.opacity(0.74))
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(height: 30, alignment: .top)
            }

            content()
                .frame(minHeight: card == .date ? 68 : 40, alignment: .center)

            Text(example)
                .font(.caption2)
                .foregroundStyle(ledgerGold.opacity(0.52))
                .lineLimit(1)
        }
        .padding(14)
        .frame(width: 168, height: 246)
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.08, green: 0.06, blue: 0.035).opacity(0.96),
                    Color(red: 0.13, green: 0.09, blue: 0.05).opacity(0.92)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(activeCard == card ? ledgerGold.opacity(0.94) : ledgerGold.opacity(0.62), lineWidth: activeCard == card ? 1.7 : 1)
        )
        .shadow(color: activeCard == card ? ledgerGold.opacity(0.18) : .black.opacity(0.35), radius: activeCard == card ? 18 : 10, y: 8)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var saveButton: some View {
        Button {
            guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
            isSaving = true
            Task {
                let didSave = await onSave(
                    IngredientInput(
                        name: name,
                        quantity: quantity,
                        unit: unit,
                        category: category,
                        location: location,
                        enteredDate: enteredDate,
                        expireDate: expireDate
                    )
                )
                isSaving = false
                guard didSave else { return }
                name = ""
                quantity = 1
                unit = "piece"
                activeCard = .ingredient
                focusedField = .name
            }
        } label: {
            HStack(spacing: 16) {
                ledgerOrnament
                Text(isSaving ? L.text("Saving...", language: appLanguage) : text("保存记录", "Save record"))
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(ledgerInk)
                    .frame(minWidth: 120)
                ledgerOrnament.scaleEffect(x: -1, y: 1)
            }
            .padding(.horizontal, 22)
            .frame(height: 56)
            .background(
                LinearGradient(
                    colors: [ledgerPaper, Color(red: 0.69, green: 0.49, blue: 0.28)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(ledgerGold.opacity(0.72), lineWidth: 1.2)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .shadow(color: ledgerGold.opacity(0.18), radius: 16, y: 9)
        }
        .buttonStyle(.plain)
        .disabled(isSaving)
        .opacity(isSaving ? 0.7 : 1)
        .padding(.top, 2)
    }

    private var ledgerDivider: some View {
        HStack(spacing: 12) {
            Rectangle().fill(ledgerGold.opacity(0.36)).frame(height: 1)
            Circle().stroke(ledgerGold.opacity(0.64), lineWidth: 1).frame(width: 6, height: 6)
            Rectangle().fill(ledgerGold.opacity(0.36)).frame(height: 1)
        }
        .frame(width: 260)
    }

    private var ledgerOrnament: some View {
        HStack(spacing: 3) {
            Circle().stroke(ledgerInk.opacity(0.75), lineWidth: 1.3).frame(width: 8, height: 8)
            Rectangle().fill(ledgerInk.opacity(0.75)).frame(width: 24, height: 1.2)
        }
    }

    private func ledgerSelectionText(_ value: String) -> some View {
        HStack(spacing: 6) {
            Text(value)
                .lineLimit(1)
            Spacer(minLength: 4)
            Image(systemName: "chevron.down")
                .font(.caption2.weight(.bold))
        }
        .foregroundStyle(ledgerInk)
    }

    private func activate(_ card: ManualLedgerCard) {
        withAnimation(.easeInOut(duration: 0.16)) {
            activeCard = card
        }
    }

    private func refreshExpireDate() {
        expireDate = StorageAdvisor.estimatedExpireDate(
            name: name,
            category: category,
            location: location,
            enteredDate: enteredDate
        )
    }

    private var displayUnit: String {
        IngredientUnit(rawValue: unit)?.displayName(language: appLanguage) ?? unit
    }

    private var datePickerLocale: Locale {
        Locale(identifier: appLanguage == AppLanguage.chinese.rawValue ? "zh_Hans_US" : "en_US")
    }

    private var ledgerBlack: Color { Color(red: 0.043, green: 0.035, blue: 0.024) }
    private var ledgerGold: Color { Color(red: 0.69, green: 0.50, blue: 0.29) }
    private var ledgerPaper: Color { Color(red: 0.78, green: 0.60, blue: 0.36) }
    private var ledgerInk: Color { Color(red: 0.13, green: 0.08, blue: 0.035) }

    private func text(_ zh: String, _ en: String) -> String {
        appLanguage == AppLanguage.chinese.rawValue ? zh : en
    }
}

private enum ManualLedgerCard {
    case ingredient
    case quantity
    case category
    case storage
    case date
}

private enum ManualLedgerFocus: Hashable {
    case name
    case quantity
}

private extension View {
    func ledgerInputStrip() -> some View {
        self
            .font(.callout.weight(.medium))
            .padding(.horizontal, 10)
            .padding(.vertical, 9)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(red: 0.77, green: 0.57, blue: 0.31).opacity(0.86))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(style: StrokeStyle(lineWidth: 1, dash: [5, 4]))
                    .foregroundStyle(Color(red: 0.27, green: 0.17, blue: 0.08).opacity(0.55))
            )
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}
