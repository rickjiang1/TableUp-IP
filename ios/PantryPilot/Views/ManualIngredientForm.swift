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

    let onSave: (StoredIngredient) -> Void

    var body: some View {
        VStack(spacing: 12) {
            TextField(L.text("Ingredient name", language: appLanguage), text: $name)
                .textFieldStyle(.roundedBorder)

            HStack {
                TextField(L.text("Quantity", language: appLanguage), value: $quantity, format: .number)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.decimalPad)
                TextField(L.text("Unit", language: appLanguage), text: $unit)
                    .textFieldStyle(.roundedBorder)
            }

            Picker(L.text("Category", language: appLanguage), selection: $category) {
                ForEach(IngredientCategory.allCases) { category in
                    Text(category.rawValue).tag(category)
                }
            }

            Picker(L.text("Location", language: appLanguage), selection: $location) {
                ForEach(StorageLocation.allCases) { location in
                    Text(location.rawValue).tag(location)
                }
            }

            DatePicker(L.text("Enter date", language: appLanguage), selection: $enteredDate, displayedComponents: .date)
            DatePicker(L.text("Expire date", language: appLanguage), selection: $expireDate, displayedComponents: .date)

            Button(L.text("Save item", language: appLanguage)) {
                guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
                onSave(
                    StoredIngredient(
                        name: name,
                        quantity: quantity,
                        unit: unit,
                        category: category,
                        location: location,
                        enteredDate: enteredDate,
                        expireDate: expireDate
                    )
                )
                name = ""
                quantity = 1
                unit = "piece"
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
        }
    }
}
