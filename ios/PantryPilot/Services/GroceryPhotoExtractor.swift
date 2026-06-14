import Foundation
import UIKit

struct GroceryPhotoExtractor {
    var baseURL: URL = BackendConfiguration.baseURL
    var session: URLSession = .shared

    func extract(from imageData: Data) async throws -> GroceryPhotoExtractionResponse {
        let uploadImageData = Self.preparedJPEGData(from: imageData) ?? imageData
        let boundary = "Boundary-\(UUID().uuidString)"
        let url = baseURL.appending(path: "api/extract-grocery-photo")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 150
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = makeMultipartBody(
            imageData: uploadImageData,
            boundary: boundary,
            fieldName: "photo",
            fileName: "grocery-photo.jpg",
            mimeType: "image/jpeg"
        )

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw GroceryPhotoExtractorError.badResponse("Backend did not return an HTTP response.")
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "No response body."
            throw GroceryPhotoExtractorError.badResponse("Backend returned \(httpResponse.statusCode): \(message)")
        }

        do {
            return try JSONDecoder().decode(GroceryPhotoExtractionResponse.self, from: data)
        } catch {
            throw GroceryPhotoExtractorError.badResponse("Could not read backend response: \(error.localizedDescription)")
        }
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

    private static func preparedJPEGData(from data: Data) -> Data? {
        guard let image = UIImage(data: data) else { return nil }

        let largestSide = max(image.size.width, image.size.height)
        guard largestSide > 0 else { return nil }

        let maxDimension: CGFloat = 1400
        let scale = min(maxDimension / largestSide, 1)
        let targetSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resizedImage = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        return resizedImage.jpegData(compressionQuality: 0.72)
    }
}

enum BackendConfiguration {
    static var baseURL: URL {
        #if targetEnvironment(simulator)
        let key = "BackendBaseURLSimulator"
        #else
        let key = "BackendBaseURLDevice"
        #endif

        if let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
           let url = URL(string: value) {
            return url
        }

        return URL(string: "http://127.0.0.1:8787/")!
    }
}

enum GroceryPhotoExtractorError: LocalizedError {
    case badResponse(String)

    var errorDescription: String? {
        switch self {
        case .badResponse(let message):
            message
        }
    }
}

struct GroceryPhotoExtractionResponse: Decodable {
    let items: [ExtractedGroceryItem]
}

struct ExtractedGroceryItem: Decodable {
    let name: String
    let rawName: String?
    let description: String?
    let quantity: Double
    let unit: String
    let category: IngredientCategory
    let location: StorageLocation
    let confidence: Double
    let sourceText: String
    let canonicalIngredientId: String?
    let matchedToIngredientLibrary: Bool?

    var detectedIngredient: DetectedIngredient {
        DetectedIngredient(
            name: name,
            rawName: rawName ?? sourceText,
            description: description ?? "",
            canonicalIngredientId: canonicalIngredientId ?? "",
            quantity: quantity,
            unit: unit,
            category: category,
            location: location
        )
    }

    enum CodingKeys: String, CodingKey {
        case name
        case rawName
        case description
        case quantity
        case unit
        case category
        case location
        case confidence
        case sourceText
        case canonicalIngredientId
        case matchedToIngredientLibrary
    }
}

private extension Data {
    mutating func append(_ string: String) {
        append(Data(string.utf8))
    }
}
