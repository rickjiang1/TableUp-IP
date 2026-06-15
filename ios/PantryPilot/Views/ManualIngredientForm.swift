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

    let onSave: (IngredientInput) -> Bool

    var body: some View {
        VStack(spacing: 12) {
            TextField(L.text("Ingredient name", language: appLanguage), text: $name)
                .textFieldStyle(.roundedBorder)

            HStack {
                TextField(L.text("Quantity", language: appLanguage), value: $quantity, format: .number)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.decimalPad)
                Picker(L.text("Unit", language: appLanguage), selection: $unit) {
                    ForEach(IngredientUnit.allCases) { unit in
                        Text(unit.displayName(language: appLanguage)).tag(unit.rawValue)
                    }
                }
                .labelsHidden()
                .pickerStyle(.menu)
                .id(appLanguage)
            }

            Picker(L.text("Category", language: appLanguage), selection: $category) {
                ForEach(IngredientCategory.allCases) { category in
                    Text(category.displayName(language: appLanguage)).tag(category)
                }
            }
            .pickerStyle(.menu)

            Picker(L.text("Location", language: appLanguage), selection: $location) {
                ForEach(StorageLocation.allCases) { location in
                    Text(location.displayName(language: appLanguage)).tag(location)
                }
            }
            .pickerStyle(.menu)

            DatePicker(L.text("Enter date", language: appLanguage), selection: $enteredDate, displayedComponents: .date)
                .datePickerStyle(.compact)
                .environment(\.locale, datePickerLocale)
            DatePicker(L.text("Expire date", language: appLanguage), selection: $expireDate, displayedComponents: .date)
                .datePickerStyle(.compact)
                .environment(\.locale, datePickerLocale)

            Button(L.text("Save item", language: appLanguage)) {
                guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
                let didSave = onSave(
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
                guard didSave else { return }
                name = ""
                quantity = 1
                unit = "piece"
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
        }
        .onAppear {
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
}
