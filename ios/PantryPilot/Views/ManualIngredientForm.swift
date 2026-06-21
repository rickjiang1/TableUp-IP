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
    @State private var activeRow: ManualLedgerRow = .ingredient
    @FocusState private var focusedField: ManualLedgerFocus?

    let onSave: (IngredientInput) async -> Bool

    var body: some View {
        VStack(spacing: 14) {
            ledgerHeader

            ledgerPanel

            saveButton
        }
        .padding(.bottom, 18)
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

    private var ledgerHeader: some View {
        Image("ManualLedgerReference")
            .resizable()
            .scaledToFill()
            .frame(height: 225, alignment: .center)
            .clipped()
            .overlay(
                LinearGradient(
                    colors: [
                        Color.clear,
                        ledgerBlack.opacity(0.18),
                        ledgerBlack.opacity(0.78)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
    }

    private var ledgerPanel: some View {
        VStack(spacing: 0) {
            ledgerRow(row: .ingredient, icon: "ManualIconName", title: text("食材", "Ingredient")) {
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

            ledgerRule

            ledgerRow(row: .quantity, icon: "ManualIconQuantity", title: text("份量", "Amount")) {
                HStack(spacing: 8) {
                    TextField("2", value: $quantity, format: .number)
                        .focused($focusedField, equals: .quantity)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.plain)
                        .foregroundStyle(ledgerInk)
                        .frame(width: 72)

                    Menu {
                        ForEach(IngredientUnit.allCases) { unit in
                            Button(unit.displayName(language: appLanguage)) {
                                self.unit = unit.rawValue
                                activate(.quantity)
                            }
                        }
                    } label: {
                        ledgerSelectionText(displayUnit)
                    }
                }
                .ledgerInputStrip()
            }
            .onTapGesture {
                activate(.quantity)
                focusedField = .quantity
            }

            ledgerRule

            ledgerRow(row: .category, icon: "ManualIconCategory", title: text("归类", "Category")) {
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

            ledgerRule

            ledgerRow(row: .storage, icon: "ManualIconStorage", title: text("存放", "Storage")) {
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

            ledgerRule

            ledgerRow(row: .date, icon: "ManualIconDate", title: text("日期", "Date")) {
                VStack(alignment: .leading, spacing: 7) {
                    DatePicker(L.text("Enter date", language: appLanguage), selection: $enteredDate, displayedComponents: .date)
                        .datePickerStyle(.compact)
                    DatePicker(L.text("Expire date", language: appLanguage), selection: $expireDate, displayedComponents: .date)
                        .datePickerStyle(.compact)
                }
                .environment(\.locale, datePickerLocale)
                .tint(ledgerGold)
                .font(.caption.weight(.medium))
                .foregroundStyle(ledgerInk)
                .ledgerInputStrip()
            }
            .onTapGesture { activate(.date) }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.72, green: 0.55, blue: 0.33).opacity(0.96),
                    Color(red: 0.50, green: 0.34, blue: 0.18).opacity(0.94)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(ledgerGold.opacity(0.58), lineWidth: 1.2)
        )
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .shadow(color: .black.opacity(0.34), radius: 18, y: 12)
        .padding(.horizontal, 18)
    }

    private func ledgerRow<Content: View>(
        row: ManualLedgerRow,
        icon: String,
        title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        HStack(spacing: 12) {
            Image(icon)
                .resizable()
                .scaledToFit()
                .frame(width: 42, height: 42)
                .frame(width: 50, height: 58)

            Text(title)
                .font(.title3.weight(.semibold))
                .foregroundStyle(ledgerInk)
                .frame(width: 48, alignment: .leading)

            content()
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 9)
        .background(activeRow == row ? ledgerGold.opacity(0.16) : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
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
                activeRow = .ingredient
                focusedField = .name
            }
        } label: {
            Text(isSaving ? L.text("Saving...", language: appLanguage) : text("保存记录", "Save record"))
                .font(.headline.weight(.semibold))
                .foregroundStyle(ledgerInk)
                .padding(.horizontal, 34)
                .frame(height: 46)
                .background(
                    LinearGradient(
                        colors: [ledgerPaper, Color(red: 0.64, green: 0.45, blue: 0.25)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(ledgerGold.opacity(0.75), lineWidth: 1.2)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .shadow(color: ledgerGold.opacity(0.18), radius: 12, y: 7)
        }
        .buttonStyle(.plain)
        .disabled(isSaving)
        .opacity(isSaving ? 0.7 : 1)
        .padding(.top, 2)
    }

    private var ledgerRule: some View {
        Rectangle()
            .fill(ledgerInk.opacity(0.18))
            .frame(height: 1)
            .padding(.leading, 72)
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

    private func activate(_ row: ManualLedgerRow) {
        withAnimation(.easeInOut(duration: 0.16)) {
            activeRow = row
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

private enum ManualLedgerRow {
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
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(red: 0.86, green: 0.70, blue: 0.46).opacity(0.94))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(style: StrokeStyle(lineWidth: 1, dash: [5, 4]))
                    .foregroundStyle(Color(red: 0.27, green: 0.17, blue: 0.08).opacity(0.52))
            )
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}
