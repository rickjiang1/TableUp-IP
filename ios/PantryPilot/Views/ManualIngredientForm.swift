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
    @FocusState private var focusedField: ManualEntryFocus?

    let onSave: (IngredientInput) async -> Bool
    let onCancel: (() -> Void)?

    init(onCancel: (() -> Void)? = nil, onSave: @escaping (IngredientInput) async -> Bool) {
        self.onCancel = onCancel
        self.onSave = onSave
    }

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .top) {
                Color(red: 0.02, green: 0.018, blue: 0.014)
                    .ignoresSafeArea()

                Image("ManualLedgerReference")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: proxy.size.width, height: proxy.size.height)
                    .scaleEffect(1.03)
                    .offset(y: 8)
                    .clipped()
                    .ignoresSafeArea()

                Color.clear
                    .contentShape(Rectangle())
                    .gesture(blankSwipeCloseGesture)
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    topBar
                        .padding(.horizontal, 22)
                        .padding(.top, 12)

                    Spacer(minLength: formTopSpacing(for: proxy.size.height))

                    ledgerInputPanel(width: proxy.size.width, height: proxy.size.height)

                    Spacer(minLength: 12)
                }
                .frame(width: proxy.size.width, height: proxy.size.height, alignment: .top)
            }
        }
        .dismissKeyboardOnTap()
        .onAppear {
            refreshExpireDate()
        }
        .task {
            await StorageAdvisor.refreshCloudRules()
            refreshExpireDate()
        }
        .onChange(of: category) { _, _ in refreshExpireDate() }
        .onChange(of: location) { _, _ in refreshExpireDate() }
        .onChange(of: enteredDate) { _, _ in refreshExpireDate() }
        .onChange(of: name) { _, _ in refreshExpireDate() }
    }

    private var topBar: some View {
        HStack {
            if let onCancel {
                Button(action: onCancel) {
                    HStack(spacing: 7) {
                        Image(systemName: "chevron.left")
                            .font(.title3.weight(.semibold))
                        Text(L.text("Cancel", language: appLanguage))
                            .font(.headline.weight(.medium))
                    }
                    .foregroundStyle(ledgerGold)
                }
                .buttonStyle(.plain)
            }
            Spacer()
        }
    }

    private func ledgerInputPanel(width: CGFloat, height: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: panelSpacing(for: height)) {
            ingredientSection

            HStack(alignment: .top, spacing: 10) {
                quantitySection
                categorySection
                storageSection
            }

            dateSection

            reminderText
                .padding(.top, -4)

            saveButton
                .padding(.top, 4)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 18)
        .frame(width: min(width - 32, 404))
        .background(.ultraThinMaterial.opacity(0.42))
        .background(Color(red: 0.02, green: 0.018, blue: 0.014).opacity(0.72))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(
                    LinearGradient(
                        colors: [
                            ledgerGold.opacity(0.78),
                            ledgerGold.opacity(0.24),
                            ledgerGold.opacity(0.62)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.32), radius: 26, y: 14)
    }

    private var ingredientSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            fieldTitle(icon: "takeoutbag.and.cup.and.straw", title: "食材", size: 24)
            TextField("如：白菜", text: $name)
                .focused($focusedField, equals: .name)
                .textFieldStyle(.plain)
                .submitLabel(.next)
                .ledgerGlassInput(minHeight: 50, textSize: 18)
                .onSubmit {
                    focusedField = .quantity
                }
        }
    }

    private var quantitySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            fieldTitle(icon: "scalemass", title: "份量", size: 20)
            HStack(spacing: 6) {
                TextField("2", value: $quantity, format: .number)
                    .focused($focusedField, equals: .quantity)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.plain)
                    .frame(minWidth: 38)

                Menu {
                    ForEach(IngredientUnit.allCases) { unit in
                        Button(unit.displayName(language: appLanguage)) {
                            self.unit = unit.rawValue
                        }
                    }
                } label: {
                    dropdownLabel(displayUnit)
                        .frame(width: 54)
                }
            }
            .ledgerGlassInput()
        }
    }

    private var categorySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            fieldTitle(icon: "square.grid.2x2", title: "归类", size: 20)
            Menu {
                ForEach(IngredientCategory.allCases) { category in
                    Button(category.displayName(language: appLanguage)) {
                        self.category = category
                    }
                }
            } label: {
                dropdownLabel(category.displayName(language: appLanguage))
            }
            .ledgerGlassInput()
        }
    }

    private var storageSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            fieldTitle(icon: "archivebox", title: "存放", size: 20)
            Menu {
                ForEach(StorageLocation.selectableCases) { location in
                    Button(location.displayName(language: appLanguage)) {
                        self.location = location
                    }
                }
            } label: {
                dropdownLabel(location.displayName(language: appLanguage))
            }
            .ledgerGlassInput()
        }
    }

    private var dateSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            fieldTitle(icon: "calendar", title: "日期", size: 20)
            HStack(spacing: 14) {
                compactDatePicker(title: "入库", date: $enteredDate)
                Rectangle()
                    .fill(ledgerGold.opacity(0.18))
                    .frame(width: 1, height: 58)
                compactDatePicker(title: "过期", date: $expireDate)
            }
        }
    }

    private var reminderText: some View {
        Text("提醒：请确保食材在有效期内使用")
            .font(.footnote.weight(.medium))
            .foregroundStyle(ledgerGold.opacity(0.58))
    }

    private func compactDatePicker(title: String, date: Binding<Date>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption.weight(.medium))
                .foregroundStyle(ledgerGold.opacity(0.78))
            DatePicker("", selection: date, displayedComponents: .date)
                .labelsHidden()
                .datePickerStyle(.compact)
                .environment(\.locale, datePickerLocale)
                .tint(ledgerGold)
                .ledgerGlassInput(minHeight: 46, textSize: 14)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func formTopSpacing(for height: CGFloat) -> CGFloat {
        min(max(318, height * 0.39), max(286, height - 420))
    }

    private func panelSpacing(for height: CGFloat) -> CGFloat {
        height < 790 ? 12 : 14
    }

    private func fieldTitle(icon: String, title: String, size: CGFloat = 22) -> some View {
        HStack(spacing: 9) {
            Image(systemName: icon)
                .font(.system(size: size * 0.58, weight: .medium))
                .foregroundStyle(ledgerGold)
                .frame(width: 22)
            Text(title)
                .font(.system(size: size, weight: .semibold, design: .serif))
                .foregroundStyle(ledgerGold)
        }
    }

    private func dropdownLabel(_ value: String) -> some View {
        HStack(spacing: 8) {
            Text(value)
                .lineLimit(1)
                .minimumScaleFactor(0.72)
            Spacer(minLength: 2)
            Image(systemName: "chevron.down")
                .font(.caption2.weight(.bold))
        }
        .foregroundStyle(ledgerPaper)
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
                focusedField = .name
            }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "bookmark")
                    .font(.title3.weight(.semibold))
                Text(isSaving ? L.text("Saving...", language: appLanguage) : "保存记录")
                    .font(.system(size: 20, weight: .semibold, design: .serif))
                    .foregroundStyle(Color(red: 0.12, green: 0.075, blue: 0.03))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .padding(.horizontal, 16)
            .background(
                LinearGradient(
                    colors: [Color(red: 0.88, green: 0.70, blue: 0.43), Color(red: 0.68, green: 0.48, blue: 0.25)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Color.white.opacity(0.18), lineWidth: 1)
            )
            .shadow(color: ledgerGold.opacity(0.18), radius: 15, y: 6)
        }
        .buttonStyle(.plain)
        .disabled(isSaving)
        .opacity(isSaving ? 0.72 : 1)
    }

    private var blankSwipeCloseGesture: some Gesture {
        DragGesture(minimumDistance: 22)
            .onEnded { value in
                guard let onCancel,
                      value.translation.height > 78,
                      abs(value.translation.height) > abs(value.translation.width) * 1.25
                else { return }
                onCancel()
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

    private func shortDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = datePickerLocale
        formatter.setLocalizedDateFormatFromTemplate("Md")
        return formatter.string(from: date)
    }

    private var formattedQuantity: String {
        quantity.formatted(.number.precision(.fractionLength(0...2)))
    }

    private var displayUnit: String {
        IngredientUnit(rawValue: unit)?.displayName(language: appLanguage) ?? unit
    }

    private var datePickerLocale: Locale {
        Locale(identifier: appLanguage == AppLanguage.chinese.rawValue ? "zh_Hans_US" : "en_US")
    }

    private var ledgerBlack: Color { Color(red: 0.022, green: 0.019, blue: 0.014) }
    private var ledgerGold: Color { Color(red: 0.70, green: 0.52, blue: 0.30) }
    private var ledgerPaper: Color { Color(red: 0.82, green: 0.65, blue: 0.40) }
}

private enum ManualEntryFocus: Hashable {
    case name
    case quantity
}

private extension View {
    func ledgerGlassInput(minHeight: CGFloat = 48, textSize: CGFloat = 15) -> some View {
        self
            .font(.system(size: textSize, weight: .medium))
            .foregroundStyle(Color(red: 0.82, green: 0.65, blue: 0.40))
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity, minHeight: minHeight, alignment: .leading)
            .background(.ultraThinMaterial.opacity(0.18))
            .background(Color.black.opacity(0.24))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color(red: 0.70, green: 0.52, blue: 0.30).opacity(0.50), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
