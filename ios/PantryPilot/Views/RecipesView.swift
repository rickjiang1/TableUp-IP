import AVKit
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
    @State private var selectedVideo: PhotosPickerItem?
    @State private var selectedVideoData: Data?

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

                Section("Video") {
                    PhotosPicker(selection: $selectedVideo, matching: .videos) {
                        Label(selectedVideoData == nil ? "Choose Video" : "Change Video", systemImage: "video")
                    }
                    .tint(.orange)

                    if selectedVideoData != nil {
                        Label("Video selected", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)
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
            .task(id: selectedVideo) {
                await loadSelectedVideo()
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
            .compactMap { RecipeFormParser.parseIngredientLine(String($0)) }
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
                imageData: selectedImageData,
                videoData: selectedVideoData
            )
        )
    }

    private func loadSelectedPhoto() async {
        guard let selectedPhoto else { return }
        selectedImageData = try? await selectedPhoto.loadTransferable(type: Data.self)
    }

    private func loadSelectedVideo() async {
        guard let selectedVideo else { return }
        selectedVideoData = try? await selectedVideo.loadTransferable(type: Data.self)
    }
}

struct EditRecipeView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Bindable var recipe: Recipe

    @State private var name: String
    @State private var ingredientsText: String
    @State private var stepsText: String
    @State private var videoURL: String
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var selectedImageData: Data?
    @State private var selectedVideo: PhotosPickerItem?
    @State private var selectedVideoData: Data?

    init(recipe: Recipe) {
        self.recipe = recipe
        _name = State(initialValue: recipe.name)
        _ingredientsText = State(initialValue: recipe.ingredients.map {
            "\($0.quantity.formatted()) \($0.unit) \($0.name)"
        }.joined(separator: "\n"))
        _stepsText = State(initialValue: recipe.steps.joined(separator: "\n"))
        _videoURL = State(initialValue: recipe.videoURL)
        _selectedImageData = State(initialValue: recipe.imageData)
        _selectedVideoData = State(initialValue: recipe.videoData)
    }

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

                        Button("Remove Photo", role: .destructive) {
                            self.selectedImageData = nil
                        }
                    }
                }

                Section("Video") {
                    PhotosPicker(selection: $selectedVideo, matching: .videos) {
                        Label(selectedVideoData == nil ? "Choose Video" : "Change Video", systemImage: "video")
                    }
                    .tint(.orange)

                    if selectedVideoData != nil {
                        Label("Video selected", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)

                        Button("Remove Video", role: .destructive) {
                            selectedVideoData = nil
                        }
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
            .navigationTitle("Edit Recipe")
            .task(id: selectedPhoto) {
                await loadSelectedPhoto()
            }
            .task(id: selectedVideo) {
                await loadSelectedVideo()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveChanges()
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func saveChanges() {
        let ingredients = ingredientsText
            .split(separator: "\n")
            .compactMap { RecipeFormParser.parseIngredientLine(String($0)) }
        let steps = stepsText
            .split(separator: "\n")
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        recipe.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        recipe.videoURL = videoURL.trimmingCharacters(in: .whitespacesAndNewlines)
        recipe.imageData = selectedImageData
        recipe.videoData = selectedVideoData
        recipe.steps = steps

        for ingredient in Array(recipe.ingredients) {
            modelContext.delete(ingredient)
        }
        recipe.ingredients = ingredients

        try? modelContext.save()
    }

    private func loadSelectedPhoto() async {
        guard let selectedPhoto else { return }
        selectedImageData = try? await selectedPhoto.loadTransferable(type: Data.self)
    }

    private func loadSelectedVideo() async {
        guard let selectedVideo else { return }
        selectedVideoData = try? await selectedVideo.loadTransferable(type: Data.self)
    }
}

enum RecipeFormParser {
    static func parseIngredientLine(_ line: String) -> RecipeIngredient? {
        let parts = line.split(separator: " ", maxSplits: 2).map(String.init)
        guard parts.count == 3, let quantity = Double(parts[0]) else { return nil }
        return RecipeIngredient(name: parts[2], quantity: quantity, unit: parts[1])
    }
}

struct RecipeDetailView: View {
    @Bindable var recipe: Recipe
    @State private var showingEditRecipe = false
    @State private var showingCookingMode = false

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

            if recipe.videoData != nil || !recipe.videoURL.isEmpty {
                Section("Video") {
                    if let videoData = recipe.videoData {
                        RecipeVideoPlayer(videoData: videoData)
                            .frame(height: 220)
                    }

                    if let url = URL(string: recipe.videoURL), !recipe.videoURL.isEmpty {
                        Link(destination: url) {
                            Label("Open video URL", systemImage: "play.rectangle")
                        }
                    } else if !recipe.videoURL.isEmpty {
                        Text(recipe.videoURL)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle(recipe.name)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button("Cook") {
                    showingCookingMode = true
                }

                Button("Edit") {
                    showingEditRecipe = true
                }
            }
        }
        .sheet(isPresented: $showingEditRecipe) {
            EditRecipeView(recipe: recipe)
        }
        .sheet(isPresented: $showingCookingMode) {
            CookingModeView(recipe: recipe)
        }
    }
}

struct RecipeVideoPlayer: View {
    let videoData: Data
    @State private var player: AVPlayer?
    @State private var fileURL: URL?

    var body: some View {
        Group {
            if let player {
                VideoPlayer(player: player)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task {
            guard player == nil else { return }
            let url = FileManager.default.temporaryDirectory
                .appending(path: "recipe-video-\(UUID().uuidString).mov")
            do {
                try videoData.write(to: url, options: .atomic)
                fileURL = url
                player = AVPlayer(url: url)
            } catch {
                player = nil
            }
        }
        .onDisappear {
            player?.pause()
            if let fileURL {
                try? FileManager.default.removeItem(at: fileURL)
            }
        }
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
