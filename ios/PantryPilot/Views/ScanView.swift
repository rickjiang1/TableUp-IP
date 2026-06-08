import PhotosUI
import SwiftData
import SwiftUI
import UIKit

struct ScanView: View {
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var selectedImageData: Data?
    @State private var detectedItems: [DetectedIngredient] = []
    @State private var showingManualAdd = false
    @State private var showingCamera = false
    @State private var showingDetectedItems = false
    @State private var saveConfirmation: SaveConfirmation?
    @State private var extractionError: ExtractionErrorMessage?
    @State private var scanMessage = "Take a grocery photo to start."
    @State private var isExtracting = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    VStack(spacing: 18) {
                        if UIImagePickerController.isSourceTypeAvailable(.camera) {
                            Button {
                                showingCamera = true
                            } label: {
                                PhotoAddButton()
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Take grocery photo")
                        } else {
                            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                                PhotoAddButton()
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Choose grocery photo")
                        }

                        PhotosPicker(selection: $selectedPhoto, matching: .images) {
                            Image(systemName: "photo.on.rectangle")
                                .font(.title2)
                                .frame(width: 52, height: 44)
                        }
                        .buttonStyle(.bordered)
                        .tint(.orange)
                        .accessibilityLabel("Choose from library")

                        if let selectedImageData, let image = UIImage(data: selectedImageData) {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFit()
                                .frame(maxHeight: 260)
                                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        }

                        if selectedImageData != nil {
                            Button {
                                Task {
                                    await extractIngredients()
                                }
                            } label: {
                                Image(systemName: isExtracting ? "hourglass" : "sparkles")
                                    .font(.title3)
                                    .frame(width: 52, height: 44)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.orange)
                            .disabled(isExtracting)
                            .accessibilityLabel("Extract ingredients")
                        }
                    }
                    .padding()

                    DisclosureGroup(L.text("Add manually", language: appLanguage), isExpanded: $showingManualAdd) {
                        ManualIngredientForm { ingredient in
                            modelContext.insert(ingredient)
                            try? modelContext.save()
                            showingManualAdd = false
                            saveConfirmation = SaveConfirmation(items: [ingredient.displayName])
                        }
                        .padding(.top, 12)
                    }
                    .padding()
                    .background(.background)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .padding()
            }
            .scrollIndicators(.hidden)
            .task(id: selectedPhoto) {
                await loadSelectedPhoto()
            }
            .sheet(isPresented: $showingCamera) {
                ImagePicker(sourceType: .camera, imageData: $selectedImageData)
                    .ignoresSafeArea()
            }
            .sheet(isPresented: $showingDetectedItems) {
                DetectedItemsReviewView(items: $detectedItems) {
                    saveDetectedItems()
                    showingDetectedItems = false
                }
            }
            .alert(item: $saveConfirmation) { confirmation in
                Alert(
                    title: Text(L.text("Saved", language: appLanguage)),
                    message: Text(confirmation.message),
                    dismissButton: .default(Text(L.text("OK", language: appLanguage)))
                )
            }
            .alert(item: $extractionError) { error in
                Alert(
                    title: Text(L.text("Extraction failed", language: appLanguage)),
                    message: Text(error.message),
                    dismissButton: .default(Text(L.text("OK", language: appLanguage)))
                )
            }
            .onChange(of: selectedImageData) { _, newValue in
                if newValue != nil {
                    scanMessage = "Photo ready."
                    detectedItems = []
                    Task {
                        await extractIngredients()
                    }
                }
            }
        }
    }

    private func loadSelectedPhoto() async {
        guard let selectedPhoto else { return }
        selectedImageData = try? await selectedPhoto.loadTransferable(type: Data.self)
        scanMessage = selectedImageData == nil ? "Could not load that photo." : "Photo ready."
        detectedItems = []
    }

    private func extractIngredients() async {
        guard let selectedImageData else {
            scanMessage = "Choose a photo first."
            return
        }

        isExtracting = true
        scanMessage = "Extracting ingredients..."

        do {
            let response = try await GroceryPhotoExtractor().extract(from: selectedImageData)
            detectedItems = response.items.map(\.detectedIngredient)
            scanMessage = detectedItems.isEmpty ? "No ingredients found. Try another photo." : "Review and save the detected items."
            showingDetectedItems = !detectedItems.isEmpty
        } catch {
            detectedItems = []
            let message = error.localizedDescription
            scanMessage = "Extraction failed."
            extractionError = ExtractionErrorMessage(message: message)
        }

        isExtracting = false
    }

    private func saveDetectedItems() {
        let savedNames = detectedItems.map(\.displayName)

        for item in detectedItems {
            modelContext.insert(item.storedIngredient)
        }
        try? modelContext.save()

        detectedItems = []
        selectedPhoto = nil
        selectedImageData = nil
        scanMessage = "Saved to storage."
        saveConfirmation = SaveConfirmation(items: savedNames)
    }
}

struct SaveConfirmation: Identifiable {
    let id = UUID()
    let items: [String]

    var message: String {
        items.isEmpty ? "Nothing was saved." : items.joined(separator: "\n")
    }
}

struct ExtractionErrorMessage: Identifiable {
    let id = UUID()
    let message: String
}

struct PhotoAddButton: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(Color.orange)
                .frame(width: 168, height: 168)
                .shadow(color: .orange.opacity(0.28), radius: 20, y: 10)

            Image(systemName: "plus")
                .font(.system(size: 76, weight: .semibold))
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }
}

struct DetectedIngredient: Identifiable {
    let id = UUID()
    var name: String
    var quantity: Double
    var unit: String
    var category: IngredientCategory
    var location: StorageLocation

    var storedIngredient: StoredIngredient {
        StoredIngredient(
            name: name,
            quantity: quantity,
            unit: unit,
            category: category,
            location: location
        )
    }

    var displayName: String {
        "\(name) (\(quantity.formatted()) \(unit))"
    }
}

struct DetectedItemsReviewView: View {
    @Binding var items: [DetectedIngredient]
    @Environment(\.dismiss) private var dismiss
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    let save: () -> Void

    var body: some View {
        NavigationStack {
            Form {
                ForEach($items) { $item in
                    Section {
                        TextField(L.text("Name", language: appLanguage), text: $item.name)

                        HStack {
                            TextField(L.text("Quantity", language: appLanguage), value: $item.quantity, format: .number)
                                .keyboardType(.decimalPad)
                            TextField(L.text("Unit", language: appLanguage), text: $item.unit)
                        }

                        Picker(L.text("Category", language: appLanguage), selection: $item.category) {
                            ForEach(IngredientCategory.allCases) { category in
                                Text(category.rawValue).tag(category)
                            }
                        }

                        Picker(L.text("Location", language: appLanguage), selection: $item.location) {
                            ForEach(StorageLocation.allCases) { location in
                                Text(location.rawValue).tag(location)
                            }
                        }
                    }
                }
                .onDelete { indexSet in
                    items.remove(atOffsets: indexSet)
                }
            }
            .navigationTitle(L.text("Review items", language: appLanguage))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L.text("Cancel", language: appLanguage)) { dismiss() }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button(L.text("Save", language: appLanguage)) { save() }
                        .fontWeight(.semibold)
                        .disabled(items.isEmpty)
                }
            }
        }
    }
}
