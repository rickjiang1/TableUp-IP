import AVKit
import PhotosUI
import SwiftData
import SwiftUI
import UIKit
import UniformTypeIdentifiers

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
                            RecipeThumbnail(imageData: recipe.imageThumbnailData ?? recipe.imageData)

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
                        RecipeMediaStore.deleteVideo(fileName: recipes[index].videoFileName)
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
    @State private var selectedImageThumbnailData: Data?
    @State private var selectedVideo: PhotosPickerItem?
    @State private var selectedVideoFileName = ""

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
                        Label(selectedVideoFileName.isEmpty ? "Choose Video" : "Change Video", systemImage: "video")
                    }
                    .tint(.orange)

                    if !selectedVideoFileName.isEmpty {
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
                imageThumbnailData: selectedImageThumbnailData,
                videoFileName: selectedVideoFileName
            )
        )
    }

    private func loadSelectedPhoto() async {
        guard let selectedPhoto else { return }
        guard let data = try? await selectedPhoto.loadTransferable(type: Data.self) else { return }
        selectedImageData = RecipeImageProcessor.jpegData(from: data, maxDimension: 1400, compression: 0.72)
        selectedImageThumbnailData = RecipeImageProcessor.jpegData(from: data, maxDimension: 160, compression: 0.62)
    }

    private func loadSelectedVideo() async {
        guard let selectedVideo else { return }
        guard let pickedVideo = try? await selectedVideo.loadTransferable(type: PickedVideo.self),
              let fileName = try? RecipeMediaStore.saveVideo(from: pickedVideo.url) else { return }
        selectedVideoFileName = fileName
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
    @State private var selectedImageThumbnailData: Data?
    @State private var selectedVideo: PhotosPickerItem?
    @State private var selectedVideoFileName: String

    init(recipe: Recipe) {
        self.recipe = recipe
        _name = State(initialValue: recipe.name)
        _ingredientsText = State(initialValue: recipe.ingredients.map {
            "\($0.quantity.formatted()) \($0.unit) \($0.name)"
        }.joined(separator: "\n"))
        _stepsText = State(initialValue: recipe.steps.joined(separator: "\n"))
        _videoURL = State(initialValue: recipe.videoURL)
        _selectedImageData = State(initialValue: recipe.imageData)
        _selectedImageThumbnailData = State(initialValue: recipe.imageThumbnailData)
        _selectedVideoFileName = State(initialValue: recipe.videoFileName)
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
                            self.selectedImageThumbnailData = nil
                        }
                    }
                }

                Section("Video") {
                    PhotosPicker(selection: $selectedVideo, matching: .videos) {
                        Label(selectedVideoFileName.isEmpty ? "Choose Video" : "Change Video", systemImage: "video")
                    }
                    .tint(.orange)

                    if !selectedVideoFileName.isEmpty || recipe.videoData != nil {
                        Label("Video selected", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)

                        Button("Remove Video", role: .destructive) {
                            if !selectedVideoFileName.isEmpty {
                                RecipeMediaStore.deleteVideo(fileName: selectedVideoFileName)
                            }
                            selectedVideoFileName = ""
                            recipe.videoData = nil
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
        recipe.imageThumbnailData = selectedImageThumbnailData
        if recipe.videoFileName != selectedVideoFileName {
            RecipeMediaStore.deleteVideo(fileName: recipe.videoFileName)
        }
        recipe.videoFileName = selectedVideoFileName
        recipe.steps = steps

        for ingredient in Array(recipe.ingredients) {
            modelContext.delete(ingredient)
        }
        recipe.ingredients = ingredients

        try? modelContext.save()
    }

    private func loadSelectedPhoto() async {
        guard let selectedPhoto else { return }
        guard let data = try? await selectedPhoto.loadTransferable(type: Data.self) else { return }
        selectedImageData = RecipeImageProcessor.jpegData(from: data, maxDimension: 1400, compression: 0.72)
        selectedImageThumbnailData = RecipeImageProcessor.jpegData(from: data, maxDimension: 160, compression: 0.62)
    }

    private func loadSelectedVideo() async {
        guard let selectedVideo else { return }
        guard let pickedVideo = try? await selectedVideo.loadTransferable(type: PickedVideo.self),
              let fileName = try? RecipeMediaStore.saveVideo(from: pickedVideo.url) else { return }
        RecipeMediaStore.deleteVideo(fileName: selectedVideoFileName)
        selectedVideoFileName = fileName
        recipe.videoData = nil
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

            if recipe.videoURL.isEmpty == false || recipe.videoData != nil || recipe.videoFileURL != nil {
                Section("Video") {
                    if let videoURL = recipe.videoFileURL {
                        RecipeVideoPlayer(videoURL: videoURL)
                            .frame(height: 220)
                    } else if let videoData = recipe.videoData {
                        LegacyRecipeVideoPlayer(videoData: videoData)
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
    let videoURL: URL
    @State private var player: AVPlayer?

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
            player = AVPlayer(url: videoURL)
        }
        .onDisappear {
            player?.pause()
        }
    }
}

struct LegacyRecipeVideoPlayer: View {
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

struct PickedVideo: Transferable {
    let url: URL

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(importedContentType: .movie) { received in
            let originalExtension = received.file.pathExtension
            let fileExtension = originalExtension.isEmpty ? "mov" : originalExtension
            let copiedURL = FileManager.default.temporaryDirectory
                .appending(path: "picked-video-\(UUID().uuidString)")
                .appendingPathExtension(fileExtension)
            if FileManager.default.fileExists(atPath: copiedURL.path) {
                try FileManager.default.removeItem(at: copiedURL)
            }
            try FileManager.default.copyItem(at: received.file, to: copiedURL)
            return PickedVideo(url: copiedURL)
        }
    }
}

enum RecipeImageProcessor {
    static func jpegData(from data: Data, maxDimension: CGFloat, compression: CGFloat) -> Data? {
        guard let image = UIImage(data: data) else { return nil }
        let size = image.size
        let largestSide = max(size.width, size.height)
        guard largestSide > 0 else { return nil }

        let scale = min(maxDimension / largestSide, 1)
        let targetSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        return resized.jpegData(compressionQuality: compression)
    }
}

enum RecipeMediaStore {
    static var videoDirectory: URL {
        let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appending(path: "RecipeVideos", directoryHint: .isDirectory)
        if !FileManager.default.fileExists(atPath: directory.path) {
            try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        }
        return directory
    }

    static func saveVideo(from sourceURL: URL) throws -> String {
        let originalExtension = sourceURL.pathExtension
        let fileExtension = originalExtension.isEmpty ? "mov" : originalExtension
        let fileName = "\(UUID().uuidString).\(fileExtension)"
        let destinationURL = videoDirectory.appending(path: fileName)
        if FileManager.default.fileExists(atPath: destinationURL.path) {
            try FileManager.default.removeItem(at: destinationURL)
        }
        try FileManager.default.copyItem(at: sourceURL, to: destinationURL)
        return fileName
    }

    static func videoURL(fileName: String) -> URL? {
        guard !fileName.isEmpty else { return nil }
        let url = videoDirectory.appending(path: fileName)
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    static func deleteVideo(fileName: String) {
        guard !fileName.isEmpty else { return }
        if let url = videoURL(fileName: fileName) {
            try? FileManager.default.removeItem(at: url)
        }
    }
}

private extension Recipe {
    var videoFileURL: URL? {
        RecipeMediaStore.videoURL(fileName: videoFileName)
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
