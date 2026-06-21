import Foundation
import Security
import SwiftData

struct HouseholdSession: Codable {
    let token: String
    let user: HouseholdUser
    let household: Household
    let role: String
}

struct HouseholdUser: Codable {
    let id: String
    let displayName: String
    let lastSeenAt: String?
}

struct Household: Codable {
    let id: String
    let name: String
    let updatedAt: String?
}

struct HouseholdInvite: Codable {
    let code: String
    let householdId: String
    let householdName: String
    let expiresAt: String
}

struct HouseholdMember: Codable, Identifiable {
    let id: String
    let userId: String
    let displayName: String
    let role: String
    let joinedAt: String?
    let lastSeenAt: String?
}

enum HouseholdSyncError: LocalizedError {
    case badResponse(String)

    var errorDescription: String? {
        switch self {
        case .badResponse(let message):
            message
        }
    }
}

@MainActor
struct HouseholdSyncService {
    var baseURL: URL = BackendConfiguration.baseURL
    var session: URLSession = .shared

    func bootstrapIfNeeded(displayName: String = "TableUp User") async throws -> HouseholdSession {
        let installId = HouseholdSessionStore.installId()
        let endpoint = baseURL.appending(path: "api/session/bootstrap")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = HouseholdSessionStore.sessionToken, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONEncoder().encode(SessionBootstrapRequest(
            installId: installId,
            displayName: displayName
        ))

        let householdSession: HouseholdSession = try await send(request)
        HouseholdSessionStore.save(householdSession)
        return householdSession
    }

    func refreshSession() async throws -> HouseholdSession {
        guard let token = HouseholdSessionStore.sessionToken, !token.isEmpty else {
            return try await bootstrapIfNeeded()
        }

        var request = URLRequest(url: baseURL.appending(path: "api/session/me"))
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let response: SessionMeResponse = try await send(request)
        let session = HouseholdSession(
            token: token,
            user: response.user,
            household: response.household,
            role: response.role
        )
        HouseholdSessionStore.save(session)
        return session
    }

    func createInvite() async throws -> HouseholdInvite {
        try await ensureSessionToken()
        var request = URLRequest(url: baseURL.appending(path: "api/household/invites"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(HouseholdSessionStore.sessionToken ?? "")", forHTTPHeaderField: "Authorization")
        request.httpBody = Data("{}".utf8)

        let response: HouseholdInviteResponse = try await send(request)
        return response.invite
    }

    func joinHousehold(code: String) async throws -> HouseholdSession {
        try await ensureSessionToken()
        var request = URLRequest(url: baseURL.appending(path: "api/household/join"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(HouseholdSessionStore.sessionToken ?? "")", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(HouseholdJoinRequest(code: code))

        let joined: HouseholdSession = try await send(request)
        HouseholdSessionStore.save(joined)
        return joined
    }

    func fetchMembers() async throws -> [HouseholdMember] {
        try await ensureSessionToken()
        var request = URLRequest(url: baseURL.appending(path: "api/household/members"))
        request.httpMethod = "GET"
        request.setValue("Bearer \(HouseholdSessionStore.sessionToken ?? "")", forHTTPHeaderField: "Authorization")

        let response: HouseholdMembersResponse = try await send(request)
        return response.members
    }

    func fetchFamilyInventory() async throws -> [HouseholdInventoryItem] {
        try await ensureSessionToken()
        var request = URLRequest(url: baseURL.appending(path: "api/inventory"))
        request.httpMethod = "GET"
        request.setValue("Bearer \(HouseholdSessionStore.sessionToken ?? "")", forHTTPHeaderField: "Authorization")

        let response: CloudInventoryResponse = try await send(request)
        return response.items
    }

    @discardableResult
    func addToFamilyInventory(_ ingredient: StoredIngredient) async throws -> [HouseholdInventoryItem] {
        try await ensureSessionToken()
        var request = URLRequest(url: baseURL.appending(path: "api/inventory/sync"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(HouseholdSessionStore.sessionToken ?? "")", forHTTPHeaderField: "Authorization")
        request.httpBody = try cloudEncoder.encode(CloudInventorySyncRequest(items: [HouseholdInventoryItem(ingredient)]))

        let response: CloudInventoryResponse = try await send(request)
        return response.items
    }

    func pushLocalInventory(from modelContext: ModelContext) async throws {
        try await ensureSessionToken()
        let items = try modelContext.fetch(FetchDescriptor<StoredIngredient>())
        guard !items.isEmpty else { return }

        var request = URLRequest(url: baseURL.appending(path: "api/inventory/sync"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(HouseholdSessionStore.sessionToken ?? "")", forHTTPHeaderField: "Authorization")
        request.httpBody = try cloudEncoder.encode(CloudInventorySyncRequest(items: items.map(HouseholdInventoryItem.init)))

        let _: CloudInventoryResponse = try await send(request)
    }

    func pullCloudInventory(into modelContext: ModelContext) async throws {
        try await ensureSessionToken()
        var request = URLRequest(url: baseURL.appending(path: "api/inventory"))
        request.httpMethod = "GET"
        request.setValue("Bearer \(HouseholdSessionStore.sessionToken ?? "")", forHTTPHeaderField: "Authorization")

        let response: CloudInventoryResponse = try await send(request)
        try merge(response.items, into: modelContext)
    }

    @discardableResult
    func syncInventory(modelContext: ModelContext) async throws -> [HouseholdInventoryItem] {
        _ = try await bootstrapIfNeeded()
        return try await fetchFamilyInventory()
    }

    func deleteCloudInventoryItem(clientId: String) async {
        guard let token = HouseholdSessionStore.sessionToken, !token.isEmpty else { return }
        guard let encodedId = clientId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) else { return }
        var request = URLRequest(url: baseURL.appending(path: "api/inventory/\(encodedId)"))
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        _ = try? await session.data(for: request)
    }

    private func ensureSessionToken() async throws {
        if HouseholdSessionStore.sessionToken?.isEmpty == false {
            return
        }
        _ = try await bootstrapIfNeeded()
    }

    private func send<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw HouseholdSyncError.badResponse("Backend did not return an HTTP response.")
        }
        guard 200..<300 ~= httpResponse.statusCode else {
            let message = String(data: data, encoding: .utf8) ?? "No response body."
            throw HouseholdSyncError.badResponse("Backend returned \(httpResponse.statusCode): \(message)")
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func merge(_ cloudItems: [HouseholdInventoryItem], into modelContext: ModelContext) throws {
        let localItems = try modelContext.fetch(FetchDescriptor<StoredIngredient>())
        var localByClientId = Dictionary(uniqueKeysWithValues: localItems.map { ($0.cloudClientId, $0) })

        for cloudItem in cloudItems {
            if let existing = localByClientId[cloudItem.clientId] {
                cloudItem.apply(to: existing)
            } else {
                let ingredient = cloudItem.storedIngredient
                modelContext.insert(ingredient)
                localByClientId[cloudItem.clientId] = ingredient
            }
        }

        try modelContext.save()
    }

    private var cloudEncoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}

enum HouseholdSessionStore {
    private static let tokenKey = "TableUpHouseholdSessionToken"
    private static let serviceName = "TableUp"
    private static let installIdKey = "householdInstallId"
    private static let userIdKey = "householdUserId"
    private static let householdIdKey = "householdId"
    private static let householdNameKey = "householdName"
    private static let householdRoleKey = "householdRole"

    static var sessionToken: String? {
        get { KeychainStore.string(forKey: tokenKey, service: serviceName) }
        set {
            if let newValue, !newValue.isEmpty {
                KeychainStore.set(newValue, forKey: tokenKey, service: serviceName)
            } else {
                KeychainStore.delete(forKey: tokenKey, service: serviceName)
            }
        }
    }

    static func installId() -> String {
        let defaults = UserDefaults.standard
        if let existing = defaults.string(forKey: installIdKey), !existing.isEmpty {
            return existing
        }
        let id = UUID().uuidString
        defaults.set(id, forKey: installIdKey)
        return id
    }

    static func save(_ session: HouseholdSession) {
        sessionToken = session.token
        let defaults = UserDefaults.standard
        defaults.set(session.user.id, forKey: userIdKey)
        defaults.set(session.household.id, forKey: householdIdKey)
        defaults.set(session.household.name, forKey: householdNameKey)
        defaults.set(session.role, forKey: householdRoleKey)
    }

    static var householdName: String {
        UserDefaults.standard.string(forKey: householdNameKey) ?? "我的厨房"
    }

    static var householdRole: String {
        UserDefaults.standard.string(forKey: householdRoleKey) ?? "owner"
    }

    static var hasSession: Bool {
        sessionToken?.isEmpty == false
    }

    static func clear() {
        sessionToken = nil
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: userIdKey)
        defaults.removeObject(forKey: householdIdKey)
        defaults.removeObject(forKey: householdNameKey)
        defaults.removeObject(forKey: householdRoleKey)
    }
}

private enum KeychainStore {
    static func string(forKey key: String, service: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    static func set(_ value: String, forKey key: String, service: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        let attributes: [String: Any] = [kSecValueData as String: data]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var addQuery = query
            addQuery[kSecValueData as String] = data
            SecItemAdd(addQuery as CFDictionary, nil)
        }
    }

    static func delete(forKey key: String, service: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}

private struct SessionBootstrapRequest: Encodable {
    let installId: String
    let displayName: String
}

private struct SessionMeResponse: Decodable {
    let user: HouseholdUser
    let household: Household
    let role: String
}

private struct HouseholdInviteResponse: Decodable {
    let invite: HouseholdInvite
}

private struct HouseholdMembersResponse: Decodable {
    let members: [HouseholdMember]
}

private struct HouseholdJoinRequest: Encodable {
    let code: String
}

private struct CloudInventorySyncRequest: Encodable {
    let items: [HouseholdInventoryItem]
}

private struct CloudInventoryResponse: Decodable {
    let items: [HouseholdInventoryItem]
}

struct HouseholdInventoryItem: Codable, Identifiable {
    let id: String?
    let clientId: String
    let name: String
    let normalizedName: String
    let descriptionText: String
    let canonicalIngredientId: String
    let quantity: Double
    let unit: String
    let canonicalQuantity: Double
    let canonicalUnit: String
    let unitConversionRatio: Double
    let unitConversionNeedsReview: Bool
    let unitConversionReviewReason: String
    let category: String
    let location: String
    let enteredDate: Date
    let expireDate: Date
    let createdAt: String?
    let updatedAt: String?

    init(_ ingredient: StoredIngredient) {
        id = nil
        clientId = ingredient.cloudClientId
        name = ingredient.name
        normalizedName = ingredient.normalizedName
        descriptionText = ingredient.descriptionText
        canonicalIngredientId = ingredient.canonicalIngredientId
        quantity = ingredient.quantity
        unit = ingredient.unit
        canonicalQuantity = ingredient.canonicalQuantity
        canonicalUnit = ingredient.canonicalUnit
        unitConversionRatio = ingredient.unitConversionRatio
        unitConversionNeedsReview = ingredient.unitConversionNeedsReview
        unitConversionReviewReason = ingredient.unitConversionReviewReason
        category = ingredient.categoryRaw
        location = ingredient.locationRaw
        enteredDate = ingredient.enteredDate
        expireDate = ingredient.expireDate
        createdAt = nil
        updatedAt = nil
    }

    var storedIngredient: StoredIngredient {
        let ingredient = StoredIngredient(
            cloudClientId: clientId,
            name: name,
            descriptionText: descriptionText,
            canonicalIngredientId: canonicalIngredientId,
            canonicalQuantity: canonicalQuantity,
            canonicalUnit: canonicalUnit,
            unitConversionRatio: unitConversionRatio,
            unitConversionNeedsReview: unitConversionNeedsReview,
            unitConversionReviewReason: unitConversionReviewReason,
            quantity: quantity,
            unit: unit,
            category: IngredientCategory(rawValue: category) ?? .other,
            location: StorageLocation(rawValue: location) ?? .fridge,
            enteredDate: enteredDate,
            expireDate: expireDate
        )
        ingredient.normalizedName = normalizedName
        ingredient.cloudUpdatedAt = parsedUpdatedAt
        return ingredient
    }

    func apply(to ingredient: StoredIngredient) {
        ingredient.name = name
        ingredient.normalizedName = normalizedName
        ingredient.descriptionText = descriptionText
        ingredient.canonicalIngredientId = canonicalIngredientId
        ingredient.quantity = quantity
        ingredient.unit = unit
        ingredient.canonicalQuantity = canonicalQuantity
        ingredient.canonicalUnit = canonicalUnit
        ingredient.unitConversionRatio = unitConversionRatio
        ingredient.unitConversionNeedsReview = unitConversionNeedsReview
        ingredient.unitConversionReviewReason = unitConversionReviewReason
        ingredient.categoryRaw = category
        ingredient.locationRaw = location
        ingredient.enteredDate = enteredDate
        ingredient.expireDate = expireDate
        ingredient.cloudUpdatedAt = parsedUpdatedAt
    }

    private var parsedUpdatedAt: Date? {
        guard let updatedAt else { return nil }
        return ISO8601DateFormatter().date(from: updatedAt)
    }

    enum CodingKeys: String, CodingKey {
        case id
        case clientId
        case name
        case normalizedName
        case descriptionText
        case canonicalIngredientId
        case quantity
        case unit
        case canonicalQuantity
        case canonicalUnit
        case unitConversionRatio
        case unitConversionNeedsReview
        case unitConversionReviewReason
        case category
        case location
        case enteredDate
        case expireDate
        case createdAt
        case updatedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(String.self, forKey: .id)
        clientId = try container.decode(String.self, forKey: .clientId)
        name = try container.decode(String.self, forKey: .name)
        normalizedName = try container.decodeIfPresent(String.self, forKey: .normalizedName) ?? IngredientNormalizer.normalizeName(name)
        descriptionText = try container.decodeIfPresent(String.self, forKey: .descriptionText) ?? ""
        canonicalIngredientId = try container.decodeIfPresent(String.self, forKey: .canonicalIngredientId) ?? ""
        quantity = try container.decodeIfPresent(Double.self, forKey: .quantity) ?? 1
        unit = try container.decodeIfPresent(String.self, forKey: .unit) ?? "piece"
        canonicalQuantity = try container.decodeIfPresent(Double.self, forKey: .canonicalQuantity) ?? 0
        canonicalUnit = try container.decodeIfPresent(String.self, forKey: .canonicalUnit) ?? ""
        unitConversionRatio = try container.decodeIfPresent(Double.self, forKey: .unitConversionRatio) ?? 0
        unitConversionNeedsReview = try container.decodeIfPresent(Bool.self, forKey: .unitConversionNeedsReview) ?? false
        unitConversionReviewReason = try container.decodeIfPresent(String.self, forKey: .unitConversionReviewReason) ?? ""
        category = try container.decodeIfPresent(String.self, forKey: .category) ?? IngredientCategory.other.rawValue
        location = try container.decodeIfPresent(String.self, forKey: .location) ?? StorageLocation.fridge.rawValue
        enteredDate = Self.decodeDate(container, .enteredDate)
        expireDate = Self.decodeDate(container, .expireDate)
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
    }

    private static func decodeDate(_ container: KeyedDecodingContainer<CodingKeys>, _ key: CodingKeys) -> Date {
        if let date = try? container.decode(Date.self, forKey: key) {
            return date
        }
        if let value = try? container.decode(String.self, forKey: key) {
            return dateOnlyFormatter.date(from: value) ?? ISO8601DateFormatter().date(from: value) ?? .now
        }
        return .now
    }

    private static let dateOnlyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}
