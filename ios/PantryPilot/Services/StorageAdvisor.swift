import Foundation

enum StorageApproach: String, CaseIterable, Identifiable {
    case cold = "Cold"
    case frozen = "Frozen"
    case roomTemperature = "Room temp"

    var id: String { rawValue }
}

struct StorageRecommendation: Identifiable {
    let id = UUID()
    let approach: StorageApproach
    let expireDate: Date
    let isRecommended: Bool
}

private struct IngredientShelfLifeRule {
    let ingredientIds: Set<String>
    let normalizedNames: Set<String>
    let categoryRaw: String
    let days: [StorageApproach: Int]

    init(ids: [String], names: [String] = [], category: String = "", days: [StorageApproach: Int]) {
        ingredientIds = Set(ids.map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() })
        normalizedNames = Set((ids + names).map { IngredientNormalizer.normalizeName($0) })
        categoryRaw = category.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        self.days = days
    }

    func matches(name: String, canonicalIngredientId: String, category: IngredientCategory) -> Bool {
        let ingredientId = canonicalIngredientId.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !ingredientId.isEmpty, ingredientIds.contains(ingredientId) {
            return true
        }
        let normalizedName = IngredientNormalizer.normalizeName(name)
        if !normalizedName.isEmpty && normalizedNames.contains(normalizedName) {
            return true
        }
        return !categoryRaw.isEmpty && categoryRaw == category.rawValue.lowercased()
    }
}

private struct CloudStorageLifeRuleResponse: Decodable {
    let rules: [CloudStorageLifeRule]
}

private struct CloudStorageLifeRule: Decodable {
    let ingredientId: String?
    let category: String
    let storageApproach: String
    let defaultDays: Int
    let priority: Int

    enum CodingKeys: String, CodingKey {
        case ingredientId = "ingredient_id"
        case category
        case storageApproach = "storage_approach"
        case defaultDays = "default_days"
        case priority
    }
}

enum StorageAdvisor {
    private static var cloudShelfLifeRules: [IngredientShelfLifeRule] = []

    private static let shelfLife: [IngredientCategory: [StorageApproach: Int]] = [
        .meat: [.cold: 3, .frozen: 180, .roomTemperature: 0],
        .seafood: [.cold: 2, .frozen: 90, .roomTemperature: 0],
        .vegetable: [.cold: 7, .frozen: 240, .roomTemperature: 2],
        .fruit: [.cold: 7, .frozen: 180, .roomTemperature: 3],
        .dairy: [.cold: 10, .frozen: 60, .roomTemperature: 0],
        .grain: [.cold: 180, .frozen: 365, .roomTemperature: 180],
        .sauce: [.cold: 120, .frozen: 180, .roomTemperature: 30],
        .spice: [.cold: 365, .frozen: 365, .roomTemperature: 365],
        .other: [.cold: 14, .frozen: 90, .roomTemperature: 7]
    ]

    private static let ingredientShelfLifeRules: [IngredientShelfLifeRule] = [
        IngredientShelfLifeRule(
            ids: ["garlic"],
            names: ["大蒜", "大蒜头", "蒜头", "蒜", "garlic bulb", "whole garlic"],
            days: [.cold: 30, .frozen: 180, .roomTemperature: 45]
        ),
        IngredientShelfLifeRule(
            ids: ["onion", "yellow_onion", "white_onion", "red_onion"],
            names: ["洋葱", "黄洋葱", "白洋葱", "红洋葱"],
            days: [.cold: 30, .frozen: 180, .roomTemperature: 30]
        ),
        IngredientShelfLifeRule(
            ids: ["potato", "sweet_potato", "yam"],
            names: ["土豆", "马铃薯", "红薯", "地瓜", "紫薯"],
            days: [.cold: 21, .frozen: 240, .roomTemperature: 30]
        ),
        IngredientShelfLifeRule(
            ids: ["ginger"],
            names: ["姜", "生姜"],
            days: [.cold: 30, .frozen: 180, .roomTemperature: 21]
        ),
        IngredientShelfLifeRule(
            ids: ["carrot", "daikon", "radish", "beet", "turnip"],
            names: ["胡萝卜", "白萝卜", "萝卜", "甜菜根", "芜菁"],
            days: [.cold: 21, .frozen: 240, .roomTemperature: 5]
        ),
        IngredientShelfLifeRule(
            ids: ["cabbage", "napa_cabbage", "bok_choy"],
            names: ["包菜", "卷心菜", "白菜", "大白菜", "小白菜", "上海青"],
            days: [.cold: 10, .frozen: 180, .roomTemperature: 2]
        ),
        IngredientShelfLifeRule(
            ids: ["spinach", "lettuce", "cilantro", "parsley", "scallion", "green_onion"],
            names: ["菠菜", "生菜", "香菜", "欧芹", "葱", "小葱", "青葱"],
            days: [.cold: 5, .frozen: 90, .roomTemperature: 1]
        ),
        IngredientShelfLifeRule(
            ids: ["tomato"],
            names: ["番茄", "西红柿"],
            days: [.cold: 7, .frozen: 180, .roomTemperature: 5]
        ),
        IngredientShelfLifeRule(
            ids: ["apple", "orange", "lemon", "lime"],
            names: ["苹果", "橙子", "柠檬", "青柠"],
            days: [.cold: 30, .frozen: 180, .roomTemperature: 14]
        ),
        IngredientShelfLifeRule(
            ids: ["banana", "avocado"],
            names: ["香蕉", "牛油果"],
            days: [.cold: 5, .frozen: 90, .roomTemperature: 4]
        ),
        IngredientShelfLifeRule(
            ids: ["egg"],
            names: ["鸡蛋", "蛋"],
            days: [.cold: 28, .frozen: 0, .roomTemperature: 2]
        ),
        IngredientShelfLifeRule(
            ids: ["milk", "cream", "heavy_cream", "yogurt"],
            names: ["牛奶", "奶油", "淡奶油", "酸奶"],
            days: [.cold: 7, .frozen: 60, .roomTemperature: 0]
        ),
        IngredientShelfLifeRule(
            ids: ["beef", "pork", "chicken", "lamb", "ground_beef", "ground_pork"],
            names: ["牛肉", "猪肉", "鸡肉", "羊肉", "肉馅"],
            days: [.cold: 3, .frozen: 180, .roomTemperature: 0]
        ),
        IngredientShelfLifeRule(
            ids: ["fish", "shrimp", "salmon", "cod", "tilapia", "clam", "mussel"],
            names: ["鱼", "虾", "三文鱼", "鳕鱼", "蛤蜊", "青口"],
            days: [.cold: 2, .frozen: 90, .roomTemperature: 0]
        )
    ]

    private static let recommended: [IngredientCategory: StorageApproach] = [
        .meat: .frozen,
        .seafood: .frozen,
        .vegetable: .cold,
        .fruit: .cold,
        .dairy: .cold,
        .grain: .roomTemperature,
        .sauce: .roomTemperature,
        .spice: .roomTemperature,
        .other: .cold
    ]

    static func approach(for location: StorageLocation) -> StorageApproach {
        switch location {
        case .freezer:
            return .frozen
        case .pantry, .counter:
            return .roomTemperature
        case .fridge:
            return .cold
        }
    }

    static func refreshCloudRules() async {
        let endpoint = BackendConfiguration.baseURL.appending(path: "api/storage-life-rules")
        do {
            let (data, response) = try await URLSession.shared.data(from: endpoint)
            guard let httpResponse = response as? HTTPURLResponse,
                  200..<300 ~= httpResponse.statusCode else { return }
            let decoded = try JSONDecoder().decode(CloudStorageLifeRuleResponse.self, from: data)
            let grouped = Dictionary(grouping: decoded.rules) { rule in
                [
                    (rule.ingredientId ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased(),
                    rule.category.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
                ].joined(separator: "::")
            }
            cloudShelfLifeRules = grouped.values
                .sorted { ($0.first?.priority ?? 100) < ($1.first?.priority ?? 100) }
                .map { rows in
                    IngredientShelfLifeRule(
                        ids: rows.compactMap(\.ingredientId).filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty },
                        category: rows.first?.category ?? "",
                        days: Dictionary(uniqueKeysWithValues: rows.compactMap { row in
                            guard let approach = storageApproach(forDatabaseValue: row.storageApproach) else { return nil }
                            return (approach, row.defaultDays)
                        })
                    )
                }
        } catch {
            return
        }
    }

    static func estimatedExpireDate(
        category: IngredientCategory,
        location: StorageLocation,
        enteredDate: Date
    ) -> Date {
        let approach = approach(for: location)
        return estimatedExpireDate(category: category, approach: approach, enteredDate: enteredDate)
    }

    static func estimatedExpireDate(
        name: String,
        canonicalIngredientId: String = "",
        category: IngredientCategory,
        location: StorageLocation,
        enteredDate: Date
    ) -> Date {
        let approach = approach(for: location)
        return estimatedExpireDate(
            name: name,
            canonicalIngredientId: canonicalIngredientId,
            category: category,
            approach: approach,
            enteredDate: enteredDate
        )
    }

    static func estimatedExpireDate(
        category: IngredientCategory,
        approach: StorageApproach,
        enteredDate: Date
    ) -> Date {
        let days = shelfLife[category]?[approach] ?? 14
        return Calendar.current.date(byAdding: .day, value: days, to: enteredDate) ?? enteredDate
    }

    static func estimatedExpireDate(
        name: String,
        canonicalIngredientId: String = "",
        category: IngredientCategory,
        approach: StorageApproach,
        enteredDate: Date
    ) -> Date {
        let days = (cloudShelfLifeRules + ingredientShelfLifeRules)
            .first { $0.matches(name: name, canonicalIngredientId: canonicalIngredientId, category: category) }?
            .days[approach] ?? shelfLife[category]?[approach] ?? 14
        return Calendar.current.date(byAdding: .day, value: days, to: enteredDate) ?? enteredDate
    }

    private static func storageApproach(forDatabaseValue value: String) -> StorageApproach? {
        switch value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
        case "cold":
            return .cold
        case "frozen":
            return .frozen
        case "room_temperature", "room_temp", "counter", "pantry":
            return .roomTemperature
        default:
            return nil
        }
    }

    static func recommendations(for ingredient: StoredIngredient) -> [StorageRecommendation] {
        let best = recommended[ingredient.category] ?? .cold
        return StorageApproach.allCases.map { approach in
            StorageRecommendation(
                approach: approach,
                expireDate: estimatedExpireDate(
                    name: ingredient.name,
                    canonicalIngredientId: ingredient.canonicalIngredientId,
                    category: ingredient.category,
                    approach: approach,
                    enteredDate: ingredient.enteredDate
                ),
                isRecommended: approach == best
            )
        }
    }
}
