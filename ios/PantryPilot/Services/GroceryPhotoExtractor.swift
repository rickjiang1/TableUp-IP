import Foundation

struct GroceryPhotoExtractor {
    var baseURL: URL = BackendConfiguration.baseURL
    var session: URLSession = .shared

    func extract(from imageData: Data) async throws -> GroceryPhotoExtractionResponse {
        let boundary = "Boundary-\(UUID().uuidString)"
        let url = baseURL.appending(path: "api/extract-grocery-photo")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = makeMultipartBody(
            imageData: imageData,
            boundary: boundary,
            fieldName: "photo",
            fileName: "grocery-photo.jpg",
            mimeType: "image/jpeg"
        )

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw GroceryPhotoExtractorError.badResponse
        }

        return try JSONDecoder().decode(GroceryPhotoExtractionResponse.self, from: data)
    }

    private func makeMultipartBody(
        imageData: Data,
        boundary: String,
        fieldName: String,
        fileName: String,
        mimeType: String
    ) -> Data {
        var body = Data()
        body.append("--\(boundary)\r\n")
        body.append("Content-Disposition: form-data; name=\"\(fieldName)\"; filename=\"\(fileName)\"\r\n")
        body.append("Content-Type: \(mimeType)\r\n\r\n")
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n")
        return body
    }
}

enum BackendConfiguration {
    static var baseURL: URL {
        if let value = Bundle.main.object(forInfoDictionaryKey: "BackendBaseURL") as? String,
           let url = URL(string: value) {
            return url
        }

        return URL(string: "http://127.0.0.1:8787/")!
    }
}

enum GroceryPhotoExtractorError: Error {
    case badResponse
}

struct GroceryPhotoExtractionResponse: Decodable {
    let items: [ExtractedGroceryItem]
}

struct ExtractedGroceryItem: Decodable {
    let name: String
    let quantity: Double
    let unit: String
    let category: IngredientCategory
    let location: StorageLocation
    let confidence: Double
    let sourceText: String

    var detectedIngredient: DetectedIngredient {
        DetectedIngredient(
            name: name,
            quantity: quantity,
            unit: unit,
            category: category,
            location: location
        )
    }
}

private extension Data {
    mutating func append(_ string: String) {
        append(Data(string.utf8))
    }
}
