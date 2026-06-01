import SwiftUI

struct ManualIngredientForm: View {
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
            TextField("Ingredient name", text: $name)
                .textFieldStyle(.roundedBorder)

            HStack {
                TextField("Quantity", value: $quantity, format: .number)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.decimalPad)
                TextField("Unit", text: $unit)
                    .textFieldStyle(.roundedBorder)
            }

            Picker("Category", selection: $category) {
                ForEach(IngredientCategory.allCases) { category in
                    Text(category.rawValue).tag(category)
                }
            }

            Picker("Location", selection: $location) {
                ForEach(StorageLocation.allCases) { location in
                    Text(location.rawValue).tag(location)
                }
            }

            DatePicker("Enter date", selection: $enteredDate, displayedComponents: .date)
            DatePicker("Expire date", selection: $expireDate, displayedComponents: .date)

            Button("Save item") {
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
