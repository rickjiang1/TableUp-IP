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

    let onSave: (IngredientInput) async -> Bool

    var body: some View {
        VStack(spacing: 9) {
            Text(text("点击输入食材名称、数量等信息", "Enter ingredient name, quantity, and details"))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(manualInk)
                .padding(.top, 1)

            manualField(icon: "ManualIconName", title: L.text("Ingredient name", language: appLanguage)) {
                TextField(L.text("Ingredient name", language: appLanguage), text: $name)
                    .textFieldStyle(.plain)
                    .foregroundStyle(manualInk)
                    .submitLabel(.done)
            }

            manualField(icon: "ManualIconQuantity", title: L.text("Quantity", language: appLanguage)) {
                HStack(spacing: 10) {
                    TextField(L.text("Quantity", language: appLanguage), value: $quantity, format: .number)
                        .textFieldStyle(.plain)
                        .keyboardType(.decimalPad)
                        .foregroundStyle(manualInk)

                    Picker(L.text("Unit", language: appLanguage), selection: $unit) {
                        ForEach(IngredientUnit.allCases) { unit in
                            Text(unit.displayName(language: appLanguage)).tag(unit.rawValue)
                        }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                    .id(appLanguage)
                    .tint(manualInk)
                    .fixedSize()
                }
            }

            manualField(icon: "ManualIconCategory", title: L.text("Category", language: appLanguage)) {
                Picker(L.text("Category", language: appLanguage), selection: $category) {
                    ForEach(IngredientCategory.allCases) { category in
                        Text(category.displayName(language: appLanguage)).tag(category)
                    }
                }
                .labelsHidden()
                .pickerStyle(.menu)
                .tint(manualInk)
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            manualField(icon: "ManualIconStorage", title: text("储存方式", "Storage method")) {
                Picker(L.text("Location", language: appLanguage), selection: $location) {
                    ForEach(StorageLocation.selectableCases) { location in
                        Text(location.displayName(language: appLanguage)).tag(location)
                    }
                }
                .labelsHidden()
                .pickerStyle(.menu)
                .tint(manualInk)
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            manualField(icon: "ManualIconDate", title: L.text("Date", language: appLanguage)) {
                VStack(alignment: .leading, spacing: 8) {
                    DatePicker(L.text("Enter date", language: appLanguage), selection: $enteredDate, displayedComponents: .date)
                        .datePickerStyle(.compact)
                        .environment(\.locale, datePickerLocale)
                        .tint(manualInk)
                    DatePicker(L.text("Expire date", language: appLanguage), selection: $expireDate, displayedComponents: .date)
                        .datePickerStyle(.compact)
                        .environment(\.locale, datePickerLocale)
                        .tint(manualInk)
                }
            }

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
                }
            } label: {
                ZStack {
                    Image("ManualSaveButtonBackground")
                        .resizable()
                        .scaledToFill()
                    if isSaving {
                        Text(L.text("Saving...", language: appLanguage))
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(Color.white.opacity(0.92))
                            .shadow(color: .black.opacity(0.2), radius: 2, y: 1)
                    }
                }
                .frame(height: 52)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(isSaving)
            .opacity(isSaving ? 0.72 : 1)
            .padding(.top, 2)
        }
        .padding(12)
        .background(manualParchment)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color(red: 0.48, green: 0.32, blue: 0.16).opacity(0.36), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.34), radius: 14, y: 8)
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

    private func refreshExpireDate() {
        expireDate = StorageAdvisor.estimatedExpireDate(
            name: name,
            category: category,
            location: location,
            enteredDate: enteredDate
        )
    }

    private var datePickerLocale: Locale {
        Locale(identifier: appLanguage == AppLanguage.chinese.rawValue ? "zh_Hans_US" : "en_US")
    }

    private var manualInk: Color {
        Color(red: 0.18, green: 0.13, blue: 0.08)
    }

    private var manualParchment: some ShapeStyle {
        LinearGradient(
            colors: [
                Color(red: 0.91, green: 0.77, blue: 0.52).opacity(0.9),
                Color(red: 0.73, green: 0.52, blue: 0.27).opacity(0.82)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private func text(_ zh: String, _ en: String) -> String {
        appLanguage == AppLanguage.chinese.rawValue ? zh : en
    }

    private func manualField<Content: View>(
        icon: String,
        title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        HStack(alignment: .center, spacing: 13) {
            Image(icon)
                .resizable()
                .scaledToFit()
                .frame(width: 34, height: 34)

            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(manualInk.opacity(0.78))
                content()
                    .font(.callout.weight(.medium))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color(red: 0.97, green: 0.86, blue: 0.62).opacity(0.48))
        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .stroke(Color(red: 0.34, green: 0.22, blue: 0.12).opacity(0.16), lineWidth: 1)
        )
    }
}
