import PhotosUI
import SwiftData
import SwiftUI
import UIKit

struct RecipesView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Recipe.createdAt, order: .reverse) private var recipes: [Recipe]
    @State private var showingAddRecipe = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(recipes) { recipe in
                    NavigationLink {
                        RecipeDetailView(recipe: recipe)
                    } label: {
                        HStack(spacing: 12) {
                            RecipeThumbnail(imageData: recipe.imageData)

                            VStack(alignment: .leading, spacing: 6) {
                                Text(recipe.name)
                                    .fontWeight(.semibold)
                                Text(recipe.ingredients.map { "\($0.quantity.formatted()) \($0.unit) \($0.name)" }.joined(separator: " - "))
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                .onDelete { indexSet in
                    for index in indexSet {
                        modelContext.delete(recipes[index])
                    }
                }
            }
            .navigationTitle("Recipes")
            .toolbar {
                Button {
                    showingAddRecipe = true
                } label: {
                    Image(systemName: "plus")
                }
            }
            .sheet(isPresented: $showingAddRecipe) {
                AddRecipeView()
            }
        }
    }
}

struct AddRecipeView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @State private var name = ""
    @State private var ingredientsText = "1 lb chicken thigh\n2 piece tomato\n1 tbsp soy sauce"
    @State private var stepsText = ""
    @State private var videoURL = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var selectedImageData: Data?

    var body: some View {
        NavigationStack {
            Form {
                TextField("Recipe name", text: $name)
                TextField("Video URL", text: $videoURL)

                Section("Photo") {
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        Label(selectedImageData == nil ? "Choose Photo" : "Change Photo", systemImage: "photo")
                    }
                    .tint(.orange)

                    if let selectedImageData, let image = UIImage(data: selectedImageData) {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(maxWidth: .infinity, minHeight: 180, maxHeight: 220)
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                }

                Section("Ingredients") {
                    TextEditor(text: $ingredientsText)
                        .frame(minHeight: 130)
                }

                Section("Steps") {
                    TextEditor(text: $stepsText)
                        .frame(minHeight: 100)
                }
            }
            .navigationTitle("Add Recipe")
            .task(id: selectedPhoto) {
                await loadSelectedPhoto()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveRecipe()
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func saveRecipe() {
        let ingredients = ingredientsText
            .split(separator: "\n")
            .compactMap { parseIngredientLine(String($0)) }
        let steps = stepsText
            .split(separator: "\n")
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        modelContext.insert(
            Recipe(
                name: name,
                ingredients: ingredients,
                steps: steps,
                videoURL: videoURL,
                imageData: selectedImageData
            )
        )
    }

    private func loadSelectedPhoto() async {
        guard let selectedPhoto else { return }
        selectedImageData = try? await selectedPhoto.loadTransferable(type: Data.self)
    }

    private func parseIngredientLine(_ line: String) -> RecipeIngredient? {
        let parts = line.split(separator: " ", maxSplits: 2).map(String.init)
        guard parts.count == 3, let quantity = Double(parts[0]) else { return nil }
        return RecipeIngredient(name: parts[2], quantity: quantity, unit: parts[1])
    }
}

struct RecipeDetailView: View {
    let recipe: Recipe

    var body: some View {
        List {
            if let imageData = recipe.imageData,
               let image = UIImage(data: imageData) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity, minHeight: 220, maxHeight: 280)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    .listRowInsets(EdgeInsets())
            }

            Section("Ingredients") {
                ForEach(recipe.ingredients) { ingredient in
                    Text("\(ingredient.quantity.formatted()) \(ingredient.unit) \(ingredient.name)")
                }
            }

            Section("Steps") {
                ForEach(Array(recipe.steps.enumerated()), id: \.offset) { index, step in
                    Text("\(index + 1). \(step)")
                }
            }

            if !recipe.videoURL.isEmpty {
                Section("Video") {
                    Text(recipe.videoURL)
                }
            }
        }
        .navigationTitle(recipe.name)
    }
}

struct RecipeThumbnail: View {
    let imageData: Data?

    var body: some View {
        if let imageData, let image = UIImage(data: imageData) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(width: 58, height: 58)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        } else {
            Image(systemName: "fork.knife")
                .font(.title2)
                .foregroundStyle(.orange)
                .frame(width: 58, height: 58)
                .background(Color.orange.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
    }
}
