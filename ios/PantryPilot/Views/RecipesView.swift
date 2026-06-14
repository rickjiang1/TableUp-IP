import AVKit
import PhotosUI
import SwiftData
import SwiftUI
import UIKit
import UniformTypeIdentifiers

struct RecipesView: View {
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @Query(sort: \Recipe.createdAt, order: .reverse) private var recipes: [Recipe]
    @Query(sort: \RecipeFolder.createdAt, order: .forward) private var folders: [RecipeFolder]
    @State private var selectedSource: RecipeSource = .central
    @State private var folderPath: [RecipeFolder] = []
    @State private var showingAddRecipe = false
    @State private var showingAddFolder = false
    @State private var newFolderName = ""
    @State private var isSyncing = false
    @State private var recipeAlert: RecipeAlertMessage?

    private var currentFolderId: String {
        folderPath.last?.id ?? ""
    }

    private var visibleFolders: [RecipeFolder] {
        folders
            .filter { $0.source == selectedSource && $0.parentId == currentFolderId }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    private var visibleRecipes: [Recipe] {
        recipes
            .filter { $0.source == selectedSource && $0.folderId == currentFolderId }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    private var moveDestinationFolders: [RecipeFolder] {
        folders
            .filter { $0.source == selectedSource }
            .sorted { folderPathTitle(for: $0).localizedCaseInsensitiveCompare(folderPathTitle(for: $1)) == .orderedAscending }
    }

    var body: some View {
        NavigationStack {
            List {
                Picker(L.text("Recipe Library", language: appLanguage), selection: $selectedSource) {
                    ForEach(RecipeSource.allCases) { source in
                        Text(source.displayName(language: appLanguage)).tag(source)
                    }
                }
                .pickerStyle(.segmented)
                .listRowInsets(EdgeInsets(top: 10, leading: 16, bottom: 8, trailing: 16))
                .onChange(of: selectedSource) { _, _ in
                    folderPath = []
                }

                if !folderPath.isEmpty {
                    Button {
                        _ = folderPath.popLast()
                    } label: {
                        Label(parentFolderTitle, systemImage: "chevron.left")
                    }
                }

                if visibleFolders.isEmpty && visibleRecipes.isEmpty {
                    ContentUnavailableView(
                        L.text("No recipes here", language: appLanguage),
                        systemImage: selectedSource == .central ? "books.vertical" : "folder",
                        description: Text(L.text("Create a folder or add a recipe.", language: appLanguage))
                    )
                }

                ForEach(visibleFolders) { folder in
                    Button {
                        folderPath.append(folder)
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "folder.fill")
                                .font(.title2)
                                .foregroundStyle(.orange)
                                .frame(width: 58, height: 58)
                                .background(Color.orange.opacity(0.12))
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                            VStack(alignment: .leading, spacing: 4) {
                                Text(folder.name)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(.primary)
                                Text(folderSummary(for: folder))
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            Image(systemName: "chevron.right")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(.tertiary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                .onDelete(perform: deleteFolders)

                ForEach(visibleRecipes) { recipe in
                    NavigationLink {
                        RecipeDetailView(recipe: recipe)
                    } label: {
                        HStack(spacing: 12) {
                            RecipeThumbnail(imageData: recipe.imageThumbnailData ?? recipe.imageData)

                            VStack(alignment: .leading, spacing: 6) {
                                Text(recipe.name)
                                    .fontWeight(.semibold)
                                Text(recipe.ingredients.map(\.displayText).joined(separator: " - "))
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .contextMenu {
                        Menu {
                            Button {
                                move(recipe, to: "")
                            } label: {
                                Label(L.text("Root Folder", language: appLanguage), systemImage: "books.vertical")
                            }
                            .disabled(recipe.folderId.isEmpty)

                            ForEach(moveDestinationFolders) { folder in
                                Button {
                                    move(recipe, to: folder.id)
                                } label: {
                                    Label(folderPathTitle(for: folder), systemImage: "folder")
                                }
                                .disabled(recipe.folderId == folder.id)
                            }
                        } label: {
                            Label(L.text("Move to Folder", language: appLanguage), systemImage: "folder")
                        }
                    }
                }
                .onDelete(perform: deleteRecipes)
            }
            .navigationTitle(navigationTitle)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if !folderPath.isEmpty {
                        Button {
                            folderPath = []
                        } label: {
                            Image(systemName: "house")
                        }
                        .accessibilityLabel(L.text("Recipe Library", language: appLanguage))
                    }
                }

                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        Task {
                            await syncRecipes()
                        }
                    } label: {
                        Image(systemName: isSyncing ? "arrow.triangle.2.circlepath.circle.fill" : "arrow.triangle.2.circlepath")
                    }
                    .disabled(isSyncing)
                    .accessibilityLabel(L.text("Sync Recipes", language: appLanguage))

                    Menu {
                        Button {
                            showingAddFolder = true
                        } label: {
                            Label(L.text("New Folder", language: appLanguage), systemImage: "folder.badge.plus")
                        }

                        Button {
                            showingAddRecipe = true
                        } label: {
                            Label(L.text("Add Recipe", language: appLanguage), systemImage: "plus")
                        }
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            }
            .sheet(isPresented: $showingAddRecipe) {
                AddRecipeView(
                    source: selectedSource,
                    folderId: currentFolderId,
                    onSaved: { name in
                        recipeAlert = RecipeAlertMessage(title: "Saved", message: name)
                    },
                    onSyncFailed: { message in
                        recipeAlert = RecipeAlertMessage(title: "Sync failed", message: message)
                    }
                )
            }
            .alert(L.text("New Folder", language: appLanguage), isPresented: $showingAddFolder) {
                TextField(L.text("Folder name", language: appLanguage), text: $newFolderName)
                Button(L.text("Cancel", language: appLanguage), role: .cancel) {
                    newFolderName = ""
                }
                Button(L.text("Save", language: appLanguage)) {
                    saveFolder()
                }
                .disabled(newFolderName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .alert(item: $recipeAlert) { alert in
                Alert(
                    title: Text(L.text(alert.title, language: appLanguage)),
                    message: Text(alert.message),
                    dismissButton: .default(Text(L.text("OK", language: appLanguage)))
                )
            }
        }
    }

    private var parentFolderTitle: String {
        if folderPath.count == 1 {
            return selectedSource.displayName(language: appLanguage)
        }
        return folderPath.dropLast().last?.name ?? selectedSource.displayName(language: appLanguage)
    }

    private var navigationTitle: String {
        folderPath.last?.name ?? selectedSource.displayName(language: appLanguage)
    }

    private func folderSummary(for folder: RecipeFolder) -> String {
        let childFolders = folders.filter { $0.parentId == folder.id }.count
        let childRecipes = recipes.filter { $0.folderId == folder.id }.count
        return "\(childFolders) \(L.text("folders", language: appLanguage)) - \(childRecipes) \(L.text("recipes", language: appLanguage))"
    }

    private func folderPathTitle(for folder: RecipeFolder) -> String {
        var names = [folder.name]
        var parentId = folder.parentId
        var visited = Set([folder.id])

        while !parentId.isEmpty,
              let parent = folders.first(where: { $0.id == parentId }),
              !visited.contains(parent.id) {
            names.insert(parent.name, at: 0)
            visited.insert(parent.id)
            parentId = parent.parentId
        }

        return names.joined(separator: " / ")
    }

    private func move(_ recipe: Recipe, to folderId: String) {
        recipe.folderId = folderId
        do {
            try modelContext.save()
            recipeAlert = RecipeAlertMessage(title: "Moved", message: recipe.name)
        } catch {
            recipeAlert = RecipeAlertMessage(title: "Save failed", message: error.localizedDescription)
        }
    }

    private func saveFolder() {
        let trimmedName = newFolderName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        modelContext.insert(
            RecipeFolder(
                source: selectedSource,
                parentId: currentFolderId,
                name: trimmedName
            )
        )
        do {
            try modelContext.save()
            recipeAlert = RecipeAlertMessage(title: "Saved", message: trimmedName)
        } catch {
            recipeAlert = RecipeAlertMessage(title: "Save failed", message: error.localizedDescription)
        }
        newFolderName = ""
    }

    private func deleteFolders(_ indexSet: IndexSet) {
        for index in indexSet {
            let folder = visibleFolders[index]
            deleteFolderTree(folder)
        }
        try? modelContext.save()
    }

    private func deleteFolderTree(_ folder: RecipeFolder) {
        for child in folders.filter({ $0.parentId == folder.id }) {
            deleteFolderTree(child)
        }
        for recipe in recipes.filter({ $0.folderId == folder.id }) {
            RecipeMediaStore.deleteVideo(fileName: recipe.videoFileName)
            modelContext.delete(recipe)
        }
        modelContext.delete(folder)
    }

    private func deleteRecipes(_ indexSet: IndexSet) {
        let deletedRecipes = indexSet.map { visibleRecipes[$0] }
        let deletedCloudIds = deletedRecipes.map(\.cloudId).filter { !$0.isEmpty }
        for recipe in deletedRecipes {
            RecipeMediaStore.deleteVideo(fileName: recipe.videoFileName)
            modelContext.delete(recipe)
        }
        try? modelContext.save()

        Task {
            for cloudId in deletedCloudIds {
                do {
                    try await RecipeCloudSync().deleteRecipe(id: cloudId)
                } catch {
                    guard !error.isCancellation else { return }
                    recipeAlert = RecipeAlertMessage(title: "Sync failed", message: error.localizedDescription)
                }
            }
        }
    }

    @MainActor
    private func syncRecipes() async {
        guard !isSyncing else { return }
        isSyncing = true
        defer { isSyncing = false }

        do {
            try await RecipeCloudSync().sync(into: modelContext, existingRecipes: recipes)
        } catch {
            guard !error.isCancellation else { return }
            recipeAlert = RecipeAlertMessage(title: "Sync failed", message: error.localizedDescription)
        }
    }
}

private extension Error {
    var isCancellation: Bool {
        if self is CancellationError {
            return true
        }

        if let urlError = self as? URLError, urlError.code == .cancelled {
            return true
        }

        return (self as NSError).code == NSURLErrorCancelled
    }
}

struct RecipeSyncError: Identifiable {
    let id = UUID()
    let message: String
}

struct RecipeAlertMessage: Identifiable {
    let id = UUID()
    let title: String
    let message: String
}

struct RecipeCloudSync {
    var baseURL: URL = BackendConfiguration.baseURL
    var session: URLSession = .shared

    @MainActor
    func sync(into modelContext: ModelContext, existingRecipes: [Recipe]) async throws {
        let cloudRecipes = try await fetchRecipes()
        let latestRecipes = (try? modelContext.fetch(FetchDescriptor<Recipe>())) ?? existingRecipes
        let recipesByCloudId = recipesByCloudId(from: latestRecipes)

        for cloudRecipe in cloudRecipes {
            let localRecipe = recipesByCloudId[cloudRecipe.id] ?? Recipe(
                cloudId: cloudRecipe.id,
                cloudUpdatedAt: cloudRecipe.updatedAt,
                source: .central,
                name: cloudRecipe.name
            )
            let previousImageURL = localRecipe.imageURL

            if localRecipe.cloudId.isEmpty {
                localRecipe.cloudId = cloudRecipe.id
            }

            localRecipe.source = .central
            localRecipe.cloudUpdatedAt = cloudRecipe.updatedAt
            localRecipe.name = cloudRecipe.name
            localRecipe.imageURL = cloudRecipe.imageURL
            localRecipe.videoURL = cloudRecipe.videoURL
            if !cloudRecipe.imageURL.isEmpty,
               (localRecipe.imageData == nil || previousImageURL != cloudRecipe.imageURL),
               let imageData = try? await fetchMediaData(pathOrURL: cloudRecipe.imageURL) {
                localRecipe.imageData = RecipeImageProcessor.jpegData(from: imageData, maxDimension: 1400, compression: 0.72) ?? imageData
                localRecipe.imageThumbnailData = RecipeImageProcessor.jpegData(from: imageData, maxDimension: 160, compression: 0.62)
            } else if cloudRecipe.imageURL.isEmpty {
                localRecipe.imageData = nil
                localRecipe.imageThumbnailData = nil
            }
            localRecipe.steps = cloudRecipe.steps
                .sorted { $0.order < $1.order }
                .map(\.text)

            for ingredient in Array(localRecipe.ingredients) {
                modelContext.delete(ingredient)
            }

            localRecipe.ingredients = cloudRecipe.ingredients
                .sorted { lhs, rhs in
                    if lhs.role == rhs.role {
                        return lhs.sortOrder < rhs.sortOrder
                    }
                    return roleRank(lhs.role) < roleRank(rhs.role)
                }
                .map { ingredient in
                    RecipeIngredient(
                        name: ingredient.name,
                        quantity: ingredient.quantity,
                        unit: ingredient.unit,
                        role: ingredient.role.recipeRole
                    )
                }

            if recipesByCloudId[cloudRecipe.id] == nil {
                modelContext.insert(localRecipe)
            }
        }

        try modelContext.save()
    }

    func saveRecipe(_ recipe: Recipe) async throws -> CloudRecipe {
        if let imageData = recipe.imageData {
            let uploadedImage = try await uploadImage(imageData)
            recipe.imageURL = uploadedImage.url
        } else {
            recipe.imageURL = ""
        }

        let payload = CloudRecipeSavePayload(recipe: recipe)
        let method = recipe.cloudId.isEmpty ? "POST" : "PUT"
        let path = recipe.cloudId.isEmpty ? "api/recipes" : "api/recipes/\(recipe.cloudId)"
        let url = baseURL.appending(path: path)

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 60
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(payload)

        let (data, response) = try await session.data(for: request)
        try validate(response: response, data: data)
        return try JSONDecoder().decode(CloudRecipeSaveResponse.self, from: data).recipe
    }

    func deleteRecipe(id: String) async throws {
        let url = baseURL.appending(path: "api/recipes/\(id)")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.timeoutInterval = 60

        let (data, response) = try await session.data(for: request)
        try validate(response: response, data: data)
    }

    private func fetchRecipes() async throws -> [CloudRecipe] {
        let url = baseURL.appending(path: "api/recipes")
        let (data, response) = try await session.data(from: url)
        try validate(response: response, data: data)
        return try JSONDecoder().decode(CloudRecipeResponse.self, from: data).recipes
    }

    private func uploadImage(_ imageData: Data) async throws -> MediaUploadResponse {
        let boundary = "Boundary-\(UUID().uuidString)"
        let url = baseURL.appending(path: "api/media/image")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 90
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = multipartBody(
            data: imageData,
            boundary: boundary,
            fieldName: "file",
            fileName: "recipe-photo.jpg",
            mimeType: "image/jpeg"
        )

        let (data, response) = try await session.data(for: request)
        try validate(response: response, data: data)
        return try JSONDecoder().decode(MediaUploadResponse.self, from: data)
    }

    private func fetchMediaData(pathOrURL: String) async throws -> Data {
        let url = backendURL(for: pathOrURL)
        let (data, response) = try await session.data(from: url)
        try validate(response: response, data: data)
        return data
    }

    private func validate(response: URLResponse, data: Data) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw GroceryPhotoExtractorError.badResponse("Backend did not return an HTTP response.")
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "No response body."
            throw GroceryPhotoExtractorError.badResponse("Backend returned \(httpResponse.statusCode): \(message)")
        }
    }

    private func roleRank(_ role: CloudRecipeIngredient.Role) -> Int {
        switch role {
        case .main:
            return 0
        case .secondary:
            return 1
        case .seasoning:
            return 2
        }
    }

    private func recipesByCloudId(from recipes: [Recipe]) -> [String: Recipe] {
        var output: [String: Recipe] = [:]
        for recipe in recipes where !recipe.cloudId.isEmpty && output[recipe.cloudId] == nil {
            output[recipe.cloudId] = recipe
        }
        return output
    }

    private func backendURL(for pathOrURL: String) -> URL {
        if let absoluteURL = URL(string: pathOrURL), absoluteURL.scheme != nil {
            return absoluteURL
        }
        return baseURL.appending(path: pathOrURL.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
    }

    private func multipartBody(
        data: Data,
        boundary: String,
        fieldName: String,
        fileName: String,
        mimeType: String
    ) -> Data {
        var body = Data()
        body.append("--\(boundary)\r\n")
        body.append("Content-Disposition: form-data; name=\"\(fieldName)\"; filename=\"\(fileName)\"\r\n")
        body.append("Content-Type: \(mimeType)\r\n\r\n")
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n")
        return body
    }
}

struct CloudRecipeResponse: Decodable {
    let recipes: [CloudRecipe]
}

struct CloudRecipeSaveResponse: Decodable {
    let recipe: CloudRecipe
}

struct MediaUploadResponse: Decodable {
    let fileName: String
    let path: String
    let url: String
}

struct CloudRecipeSavePayload: Encodable {
    let id: String?
    let name: String
    let imageURL: String
    let videoURL: String
    let ingredients: [Ingredient]
    let steps: [Step]

    init(recipe: Recipe) {
        id = recipe.cloudId.isEmpty ? nil : recipe.cloudId
        name = recipe.name
        imageURL = recipe.imageURL
        videoURL = recipe.videoURL
        ingredients = recipe.ingredients.enumerated().map { index, ingredient in
            Ingredient(
                role: ingredient.role.rawValueForCloud,
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                sortOrder: index + 1
            )
        }
        steps = recipe.steps.enumerated().map { index, step in
            Step(order: index + 1, text: step)
        }
    }

    struct Ingredient: Encodable {
        let role: String
        let name: String
        let quantity: Double
        let unit: String
        let sortOrder: Int
    }

    struct Step: Encodable {
        let order: Int
        let text: String
    }
}

private extension RecipeIngredientRole {
    var rawValueForCloud: String {
        switch self {
        case .main:
            return "main"
        case .secondary:
            return "secondary"
        case .seasoning:
            return "seasoning"
        }
    }
}

struct CloudRecipe: Decodable {
    let id: String
    let name: String
    let imageURL: String
    let videoURL: String
    let updatedAt: String
    let ingredients: [CloudRecipeIngredient]
    let steps: [CloudRecipeStep]
}

struct CloudRecipeIngredient: Decodable {
    enum Role: String, Decodable {
        case main
        case secondary
        case seasoning

        var recipeRole: RecipeIngredientRole {
            switch self {
            case .main:
                return .main
            case .secondary:
                return .secondary
            case .seasoning:
                return .seasoning
            }
        }
    }

    let id: String
    let role: Role
    let name: String
    let quantity: Double
    let unit: String
    let sortOrder: Int
}

struct CloudRecipeStep: Decodable {
    let id: String
    let order: Int
    let text: String
}

struct AddRecipeView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    let source: RecipeSource
    let folderId: String
    let onSaved: (String) -> Void
    let onSyncFailed: (String) -> Void
    @State private var name = ""
    @State private var ingredientDrafts: [RecipeIngredientDraft] = [
        RecipeIngredientDraft(name: "chicken thigh", quantity: 1, unit: "lb", role: .main),
        RecipeIngredientDraft(name: "tomato", quantity: 2, unit: "piece", role: .secondary),
        RecipeIngredientDraft(name: "soy sauce", quantity: 1, unit: "tbsp", role: .seasoning)
    ]
    @State private var stepsText = ""
    @State private var videoURL = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var selectedImageData: Data?
    @State private var selectedImageThumbnailData: Data?
    @State private var selectedVideo: PhotosPickerItem?
    @State private var selectedVideoFileName = ""
    @State private var saveError: RecipeSyncError?
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                TextField(L.text("Recipe name", language: appLanguage), text: $name)
                TextField(L.text("Video URL", language: appLanguage), text: $videoURL)

                Section(L.text("Photo", language: appLanguage)) {
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        Label(L.text(selectedImageData == nil ? "Choose Photo" : "Change Photo", language: appLanguage), systemImage: "photo")
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

                Section(L.text("Video", language: appLanguage)) {
                    PhotosPicker(selection: $selectedVideo, matching: .videos) {
                        Label(L.text(selectedVideoFileName.isEmpty ? "Choose Video" : "Change Video", language: appLanguage), systemImage: "video")
                    }
                    .tint(.orange)

                    if !selectedVideoFileName.isEmpty {
                        Label(L.text("Video selected", language: appLanguage), systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                    }
                }

                Section(L.text("Ingredients", language: appLanguage)) {
                    ForEach(RecipeIngredientRole.allCases) { role in
                        RecipeIngredientGroupEditor(
                            title: role.displayName(language: appLanguage),
                            addTitle: role.addButtonTitle(language: appLanguage),
                            role: role,
                            drafts: $ingredientDrafts
                        )
                    }
                }

                Section(L.text("Steps", language: appLanguage)) {
                    TextEditor(text: $stepsText)
                        .frame(minHeight: 100)
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .dismissKeyboardOnTap()
            .navigationTitle(L.text("Add Recipe", language: appLanguage))
            .task(id: selectedPhoto) {
                await loadSelectedPhoto()
            }
            .task(id: selectedVideo) {
                await loadSelectedVideo()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L.text("Cancel", language: appLanguage)) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(L.text("Save", language: appLanguage)) {
                        Task {
                            await saveRecipe()
                        }
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSaving)
                }
            }
            .alert(item: $saveError) { error in
                Alert(
                    title: Text(L.text("Sync failed", language: appLanguage)),
                    message: Text(error.message),
                    dismissButton: .default(Text(L.text("OK", language: appLanguage)))
                )
            }
        }
    }

    private func saveRecipe() async {
        guard !isSaving else { return }
        isSaving = true
        defer { isSaving = false }

        let ingredients = recipeIngredients(from: ingredientDrafts)
        let steps = stepsText
            .split(separator: "\n")
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        let recipe = Recipe(
            source: source,
            folderId: folderId,
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            ingredients: ingredients,
            steps: steps,
            videoURL: videoURL.trimmingCharacters(in: .whitespacesAndNewlines),
            imageData: selectedImageData,
            imageThumbnailData: selectedImageThumbnailData,
            videoFileName: selectedVideoFileName
        )
        modelContext.insert(recipe)

        do {
            try modelContext.save()
            let savedName = recipe.name
            onSaved(savedName)
            dismiss()

            guard recipe.source == .central else { return }
            Task {
                do {
                    let cloudRecipe = try await RecipeCloudSync().saveRecipe(recipe)
                    recipe.cloudId = cloudRecipe.id
                    recipe.cloudUpdatedAt = cloudRecipe.updatedAt
                    try modelContext.save()
                } catch {
                    guard !error.isCancellation else { return }
                    onSyncFailed(error.localizedDescription)
                }
            }
        } catch {
            saveError = RecipeSyncError(message: error.localizedDescription)
        }
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
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @Bindable var recipe: Recipe
    let onSaved: (String) -> Void
    let onSyncFailed: (String) -> Void

    @State private var name: String
    @State private var ingredientDrafts: [RecipeIngredientDraft]
    @State private var stepsText: String
    @State private var videoURL: String
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var selectedImageData: Data?
    @State private var selectedImageThumbnailData: Data?
    @State private var selectedVideo: PhotosPickerItem?
    @State private var selectedVideoFileName: String
    @State private var saveError: RecipeSyncError?
    @State private var isSaving = false

    init(
        recipe: Recipe,
        onSaved: @escaping (String) -> Void,
        onSyncFailed: @escaping (String) -> Void
    ) {
        self.recipe = recipe
        self.onSaved = onSaved
        self.onSyncFailed = onSyncFailed
        _name = State(initialValue: recipe.name)
        _ingredientDrafts = State(initialValue: recipe.ingredients.map { RecipeIngredientDraft(ingredient: $0) })
        _stepsText = State(initialValue: recipe.steps.joined(separator: "\n"))
        _videoURL = State(initialValue: recipe.videoURL)
        _selectedImageData = State(initialValue: recipe.imageData)
        _selectedImageThumbnailData = State(initialValue: recipe.imageThumbnailData)
        _selectedVideoFileName = State(initialValue: recipe.videoFileName)
    }

    var body: some View {
        NavigationStack {
            Form {
                TextField(L.text("Recipe name", language: appLanguage), text: $name)
                TextField(L.text("Video URL", language: appLanguage), text: $videoURL)

                Section(L.text("Photo", language: appLanguage)) {
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        Label(L.text(selectedImageData == nil ? "Choose Photo" : "Change Photo", language: appLanguage), systemImage: "photo")
                    }
                    .tint(.orange)

                    if let selectedImageData, let image = UIImage(data: selectedImageData) {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(maxWidth: .infinity, minHeight: 180, maxHeight: 220)
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                        Button(L.text("Remove Photo", language: appLanguage), role: .destructive) {
                            self.selectedImageData = nil
                            self.selectedImageThumbnailData = nil
                        }
                    }
                }

                Section(L.text("Video", language: appLanguage)) {
                    PhotosPicker(selection: $selectedVideo, matching: .videos) {
                        Label(L.text(selectedVideoFileName.isEmpty ? "Choose Video" : "Change Video", language: appLanguage), systemImage: "video")
                    }
                    .tint(.orange)

                    if !selectedVideoFileName.isEmpty || recipe.videoData != nil {
                        Label(L.text("Video selected", language: appLanguage), systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)

                        Button(L.text("Remove Video", language: appLanguage), role: .destructive) {
                            if !selectedVideoFileName.isEmpty {
                                RecipeMediaStore.deleteVideo(fileName: selectedVideoFileName)
                            }
                            selectedVideoFileName = ""
                            recipe.videoData = nil
                        }
                    }
                }

                Section(L.text("Ingredients", language: appLanguage)) {
                    ForEach(RecipeIngredientRole.allCases) { role in
                        RecipeIngredientGroupEditor(
                            title: role.displayName(language: appLanguage),
                            addTitle: role.addButtonTitle(language: appLanguage),
                            role: role,
                            drafts: $ingredientDrafts
                        )
                    }
                }

                Section(L.text("Steps", language: appLanguage)) {
                    TextEditor(text: $stepsText)
                        .frame(minHeight: 100)
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .dismissKeyboardOnTap()
            .navigationTitle(L.text("Edit Recipe", language: appLanguage))
            .task(id: selectedPhoto) {
                await loadSelectedPhoto()
            }
            .task(id: selectedVideo) {
                await loadSelectedVideo()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L.text("Cancel", language: appLanguage)) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(L.text("Save", language: appLanguage)) {
                        Task {
                            await saveChanges()
                        }
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSaving)
                }
            }
            .alert(item: $saveError) { error in
                Alert(
                    title: Text(L.text("Sync failed", language: appLanguage)),
                    message: Text(error.message),
                    dismissButton: .default(Text(L.text("OK", language: appLanguage)))
                )
            }
        }
    }

    private func saveChanges() async {
        guard !isSaving else { return }
        isSaving = true
        defer { isSaving = false }

        let ingredients = recipeIngredients(from: ingredientDrafts)
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

        do {
            try modelContext.save()
            let savedName = recipe.name
            onSaved(savedName)
            dismiss()

            guard recipe.source == .central else { return }
            Task {
                do {
                    let cloudRecipe = try await RecipeCloudSync().saveRecipe(recipe)
                    recipe.cloudId = cloudRecipe.id
                    recipe.cloudUpdatedAt = cloudRecipe.updatedAt
                    try modelContext.save()
                } catch {
                    guard !error.isCancellation else { return }
                    onSyncFailed(error.localizedDescription)
                }
            }
        } catch {
            saveError = RecipeSyncError(message: error.localizedDescription)
        }
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

struct RecipeIngredientDraft: Identifiable {
    let id: UUID
    var name: String
    var quantity: Double
    var unit: String
    var role: RecipeIngredientRole

    init(
        id: UUID = UUID(),
        name: String = "",
        quantity: Double = 1,
        unit: String = IngredientUnit.piece.rawValue,
        role: RecipeIngredientRole
    ) {
        self.id = id
        self.name = name
        self.quantity = quantity
        self.unit = IngredientUnit.normalizedSelection(for: unit)
        self.role = role
    }

    init(ingredient: RecipeIngredient) {
        self.init(
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            role: ingredient.role
        )
    }
}

struct RecipeIngredientGroupEditor: View {
    let title: String
    let addTitle: String
    let role: RecipeIngredientRole
    @Binding var drafts: [RecipeIngredientDraft]
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue

    private var indices: [Int] {
        drafts.indices.filter { drafts[$0].role == role }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.subheadline.weight(.semibold))

            ForEach(indices, id: \.self) { index in
                RecipeIngredientDraftRow(draft: $drafts[index]) {
                    let id = drafts[index].id
                    drafts.removeAll { $0.id == id }
                }
            }

            Button {
                drafts.append(RecipeIngredientDraft(role: role))
            } label: {
                Label(addTitle, systemImage: "plus.circle.fill")
            }
            .buttonStyle(.borderless)
            .tint(.orange)
        }
        .padding(.vertical, 6)
    }
}

struct RecipeIngredientDraftRow: View {
    @Binding var draft: RecipeIngredientDraft
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    let remove: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            TextField(L.text("Quantity", language: appLanguage), value: $draft.quantity, format: .number)
                .keyboardType(.decimalPad)
                .frame(width: 64)

            Picker(L.text("Unit", language: appLanguage), selection: $draft.unit) {
                ForEach(IngredientUnit.allCases) { unit in
                    Text(unit.displayName(language: appLanguage)).tag(unit.rawValue)
                }
            }
            .frame(width: 92)
            .pickerStyle(.menu)

            TextField(L.text("Ingredient name", language: appLanguage), text: $draft.name)

            Button(role: .destructive) {
                remove()
            } label: {
                Image(systemName: "minus.circle.fill")
            }
            .buttonStyle(.borderless)
        }
    }
}

private func recipeIngredients(from drafts: [RecipeIngredientDraft]) -> [RecipeIngredient] {
    RecipeIngredientRole.allCases.flatMap { role in
        drafts
            .filter { $0.role == role }
            .compactMap { draft in
                let name = draft.name.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !name.isEmpty else { return nil }
                return RecipeIngredient(
                    name: name,
                    quantity: draft.quantity,
                    unit: draft.unit,
                    role: draft.role
                )
            }
    }
}

struct RecipeDetailView: View {
    @Bindable var recipe: Recipe
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var showingEditRecipe = false
    @State private var showingCookingMode = false
    @State private var recipeAlert: RecipeAlertMessage?

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

            ForEach(RecipeIngredientRole.allCases) { role in
                let ingredients = recipe.ingredients.filter { $0.role == role }
                if !ingredients.isEmpty {
                    Section(role.displayName(language: appLanguage)) {
                        ForEach(ingredients) { ingredient in
                            Text(ingredient.displayText)
                        }
                    }
                }
            }

            Section(L.text("Steps", language: appLanguage)) {
                ForEach(Array(recipe.steps.enumerated()), id: \.offset) { index, step in
                    Text("\(index + 1). \(step)")
                }
            }

            if recipe.videoURL.isEmpty == false || recipe.videoData != nil || recipe.videoFileURL != nil {
                Section(L.text("Video", language: appLanguage)) {
                    if let videoURL = recipe.videoFileURL {
                        RecipeVideoPlayer(videoURL: videoURL)
                            .frame(height: 220)
                    } else if let videoData = recipe.videoData {
                        LegacyRecipeVideoPlayer(videoData: videoData)
                            .frame(height: 220)
                    }

                    if let url = URL(string: recipe.videoURL), !recipe.videoURL.isEmpty {
                        Link(destination: url) {
                            Label(L.text("Open video URL", language: appLanguage), systemImage: "play.rectangle")
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
                Button(L.text("Cook", language: appLanguage)) {
                    showingCookingMode = true
                }

                Button(L.text("Edit", language: appLanguage)) {
                    showingEditRecipe = true
                }
            }
        }
        .sheet(isPresented: $showingEditRecipe) {
            EditRecipeView(
                recipe: recipe,
                onSaved: { name in
                    recipeAlert = RecipeAlertMessage(title: "Saved", message: name)
                },
                onSyncFailed: { message in
                    recipeAlert = RecipeAlertMessage(title: "Sync failed", message: message)
                }
            )
        }
        .sheet(isPresented: $showingCookingMode) {
            CookingModeView(recipe: recipe)
        }
        .alert(item: $recipeAlert) { alert in
            Alert(
                title: Text(L.text(alert.title, language: appLanguage)),
                message: Text(alert.message),
                dismissButton: .default(Text(L.text("OK", language: appLanguage)))
            )
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

private extension Data {
    mutating func append(_ string: String) {
        append(Data(string.utf8))
    }
}
