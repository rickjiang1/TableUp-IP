import Foundation

struct GroceryPhotoExtractor {
    var baseURL: URL = BackendConfiguration.baseURL
    var session: URLSession = .shared

    func extract(from imageData: Data) async throws -> GroceryPhotoExtractionResponse {
        if let apiKey = OpenAIClientConfiguration.apiKey {
            return try await OpenAIGroceryPhotoExtractor(
                apiKey: apiKey,
                model: OpenAIClientConfiguration.model,
                session: session
            )
            .extract(from: imageData)
        }

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

enum OpenAIClientConfiguration {
    static var apiKey: String? {
        if let value = cleanSecret(Bundle.main.object(forInfoDictionaryKey: "OpenAIAPIKey") as? String) {
            return value
        }

        return bundledEnvValue(for: "OPENAI_API_KEY")
    }

    static var model: String {
        if let value = cleanSecret(Bundle.main.object(forInfoDictionaryKey: "OpenAIModel") as? String) {
            return value
        }

        return bundledEnvValue(for: "OPENAI_MODEL") ?? "gpt-4.1-mini"
    }

    private static func cleanSecret(_ value: String?) -> String? {
        guard let value else {
            return nil
        }

        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty,
              !trimmed.contains("$("),
              trimmed != "replace_with_a_new_key" else {
            return nil
        }
        return trimmed
    }

    private static func bundledEnvValue(for key: String) -> String? {
        guard let url = Bundle.main.url(forResource: "backend", withExtension: "env"),
              let contents = try? String(contentsOf: url, encoding: .utf8) else {
            return nil
        }

        for line in contents.split(whereSeparator: \.isNewline) {
            let trimmedLine = line.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmedLine.isEmpty,
                  !trimmedLine.hasPrefix("#"),
                  let separator = trimmedLine.firstIndex(of: "=") else {
                continue
            }

            let name = String(trimmedLine[..<separator]).trimmingCharacters(in: .whitespacesAndNewlines)
            guard name == key else { continue }

            let rawValue = String(trimmedLine[trimmedLine.index(after: separator)...])
            let unquoted = rawValue
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .trimmingCharacters(in: CharacterSet(charactersIn: "\"'"))
            return cleanSecret(unquoted)
        }

        return nil
    }
}

struct OpenAIGroceryPhotoExtractor {
    let apiKey: String
    let model: String
    var session: URLSession = .shared

    func extract(from imageData: Data) async throws -> GroceryPhotoExtractionResponse {
        let payload: [String: Any] = [
            "model": model,
            "input": [
                [
                    "role": "user",
                    "content": [
                        [
                            "type": "input_text",
                            "text": [
                                "Extract grocery inventory items from this image.",
                                "Return item name, quantity, unit, category, storage location, confidence, and source text when visible.",
                                "If quantity is unclear, estimate conservatively and lower confidence."
                            ].joined(separator: " ")
                        ],
                        [
                            "type": "input_image",
                            "image_url": "data:image/jpeg;base64,\(imageData.base64EncodedString())",
                            "detail": "auto"
                        ]
                    ]
                ]
            ],
            "text": [
                "format": [
                    "type": "json_schema",
                    "name": "grocery_extraction",
                    "schema": groceryExtractionSchema,
                    "strict": true
                ]
            ]
        ]

        var request = URLRequest(url: URL(string: "https://api.openai.com/v1/responses")!)
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw GroceryPhotoExtractorError.badResponse("OpenAI did not return an HTTP response.")
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            let message = openAIErrorMessage(from: data) ?? "No response body."
            throw GroceryPhotoExtractorError.badResponse("OpenAI returned \(httpResponse.statusCode): \(message)")
        }

        guard let outputText = outputText(from: data),
              let outputData = outputText.data(using: .utf8) else {
            throw GroceryPhotoExtractorError.badResponse("OpenAI returned no structured output.")
        }

        do {
            return try JSONDecoder().decode(GroceryPhotoExtractionResponse.self, from: outputData)
        } catch {
            throw GroceryPhotoExtractorError.badResponse("Could not read OpenAI response: \(error.localizedDescription)")
        }
    }

    private var groceryExtractionSchema: [String: Any] {
        [
            "type": "object",
            "additionalProperties": false,
            "required": ["items"],
            "properties": [
                "items": [
                    "type": "array",
                    "items": [
                        "type": "object",
                        "additionalProperties": false,
                        "required": ["name", "quantity", "unit", "category", "location", "confidence", "sourceText"],
                        "properties": [
                            "name": ["type": "string"],
                            "quantity": ["type": "number"],
                            "unit": ["type": "string"],
                            "category": [
                                "type": "string",
                                "enum": IngredientCategory.allCases.map(\.rawValue)
                            ],
                            "location": [
                                "type": "string",
                                "enum": StorageLocation.allCases.map(\.rawValue)
                            ],
                            "confidence": [
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1
                            ],
                            "sourceText": ["type": "string"]
                        ]
                    ]
                ]
            ]
        ]
    }

    private func outputText(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }

        if let outputText = json["output_text"] as? String {
            return outputText
        }

        guard let output = json["output"] as? [[String: Any]] else {
            return nil
        }

        for item in output {
            guard let content = item["content"] as? [[String: Any]] else { continue }
            if let text = content.first(where: { $0["type"] as? String == "output_text" })?["text"] as? String {
                return text
            }
        }

        return nil
    }

    private func openAIErrorMessage(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let error = json["error"] as? [String: Any] else {
            return String(data: data, encoding: .utf8)
        }
        return error["message"] as? String
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
