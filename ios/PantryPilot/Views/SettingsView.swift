import SwiftUI

enum AppLanguage: String, CaseIterable, Identifiable {
    case english = "en"
    case chinese = "zh"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .english: "English"
        case .chinese: "中文"
        }
    }
}

enum L {
    static func text(_ key: String, language: String) -> String {
        guard language == AppLanguage.chinese.rawValue else { return key }
        return zh[key] ?? key
    }

    private static let zh: [String: String] = [
        "Add": "添加",
        "Storage": "库存",
        "Recipes": "食谱",
        "Can Cook": "可制作",
        "Settings": "设置",
        "Language": "语言",
        "App language": "App 语言",
        "Recipe matching": "食谱匹配",
        "Almost cook threshold": "接近可制作比例",
        "Expire reminder": "过期提醒",
        "days": "天",
        "Cloud storage": "云存储",
        "Local only is the default. Cloud sync can be added after the local app is stable.": "默认只保存在本地。等本地版本稳定后，可以再加入云同步。",
        "AI extraction": "AI 提取",
        "AI extraction will call your backend, not OpenAI directly from the app.": "AI 提取会调用你的 backend，不会在 app 里直接调用 OpenAI。",
        "Recipe name": "食谱名称",
        "Video URL": "视频 URL",
        "Photo": "图片",
        "Choose Photo": "选择图片",
        "Change Photo": "更换图片",
        "Remove Photo": "移除图片",
        "Video": "视频",
        "Choose Video": "选择视频",
        "Change Video": "更换视频",
        "Remove Video": "移除视频",
        "Video selected": "已选择视频",
        "Ingredients": "食材",
        "Steps": "步骤",
        "Add Recipe": "添加食谱",
        "Edit Recipe": "编辑食谱",
        "Cancel": "取消",
        "Save": "保存",
        "Cook": "烹饪",
        "Edit": "编辑",
        "Open video URL": "打开视频链接",
        "Ready to cook": "现在可做",
        "Almost there": "还差一点",
        "No full matches yet.": "还没有完全匹配的食谱。",
        "dishes ready": "道菜可做",
        "almost there": "接近可做",
        "Ready": "可做",
        "Expired": "已过期",
        "Expires today": "今天过期",
        "Expires soon": "快过期",
        "expires": "过期",
        "best": "最佳",
        "Missing": "缺少",
        "have": "已有",
        "Saved": "已保存",
        "Save failed": "保存失败",
        "No saved food": "还没有保存的食材",
        "Saved ingredients will appear here.": "保存后的食材会显示在这里。",
        "Extraction failed": "提取失败",
        "OK": "好的",
        "Review items": "确认食材",
        "Name": "名称",
        "Quantity": "数量",
        "Unit": "单位",
        "Category": "分类",
        "Location": "位置",
        "Add manually": "手动添加",
        "Ingredient name": "食材名称",
        "Enter date": "入库日期",
        "Expire date": "过期日期",
        "Save item": "保存食材",
        "Ingredient": "食材",
        "Recommended storage": "推荐保存方式",
        "Best": "最佳",
        "After cooking": "烹饪后",
        "Use": "使用",
        "Left": "剩余",
        "Cooked": "已烹饪",
        "Close": "关闭",
        "Meat": "肉类",
        "Seafood": "海鲜",
        "Vegetable": "蔬菜",
        "Fruit": "水果",
        "Dairy": "乳制品",
        "Grain": "谷物",
        "Sauce": "酱料",
        "Spice": "香料",
        "Other": "其他",
        "Fridge": "冷藏",
        "Freezer": "冷冻",
        "Pantry": "食品柜",
        "Counter": "台面",
        "Cold": "冷藏",
        "Frozen": "冷冻",
        "Room temp": "常温",
        "Main ingredients": "主要食材",
        "Secondary ingredients": "次要食材",
        "Seasonings": "调料",
        "Add main ingredient": "添加主要食材",
        "Add secondary ingredient": "添加次要食材",
        "Add seasoning": "添加调料",
        "Sync Recipes": "同步食谱",
        "Sync failed": "同步失败",
        "piece": "个",
        "clove": "瓣",
        "bunch": "把",
        "bottle": "瓶",
        "can": "罐",
        "bag": "袋",
        "pack": "包"
    ]
}

extension IngredientCategory {
    func displayName(language: String) -> String {
        L.text(rawValue, language: language)
    }
}

extension StorageLocation {
    func displayName(language: String) -> String {
        L.text(rawValue, language: language)
    }
}

extension StorageApproach {
    func displayName(language: String) -> String {
        L.text(rawValue, language: language)
    }
}

extension RecipeIngredientRole {
    func displayName(language: String) -> String {
        L.text(rawValue, language: language)
    }

    func addButtonTitle(language: String) -> String {
        switch self {
        case .main:
            return L.text("Add main ingredient", language: language)
        case .secondary:
            return L.text("Add secondary ingredient", language: language)
        case .seasoning:
            return L.text("Add seasoning", language: language)
        }
    }
}

extension IngredientUnit {
    func displayName(language: String) -> String {
        L.text(rawValue, language: language)
    }
}

struct SettingsView: View {
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("almostCookThreshold") private var threshold = 0.7
    @AppStorage("cloudStorageProvider") private var cloudStorageProvider = "Local only"
    @AppStorage("expirationReminderDays") private var expirationReminderDays = 3

    private let cloudOptions = [
        "Local only",
        "Supabase",
        "Firebase",
        "iCloud"
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section(L.text("Language", language: appLanguage)) {
                    Picker(L.text("App language", language: appLanguage), selection: $appLanguage) {
                        ForEach(AppLanguage.allCases) { language in
                            Text(language.displayName).tag(language.rawValue)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section(L.text("Recipe matching", language: appLanguage)) {
                    VStack(alignment: .leading) {
                        Text("\(L.text("Almost cook threshold", language: appLanguage)): \(Int(threshold * 100))%")
                        Slider(value: $threshold, in: 0.5...0.95, step: 0.05)
                    }
                }

                Section(L.text("Storage", language: appLanguage)) {
                    Stepper(value: $expirationReminderDays, in: 0...30) {
                        LabeledContent(L.text("Expire reminder", language: appLanguage)) {
                            Text("\(expirationReminderDays) \(L.text("days", language: appLanguage))")
                        }
                    }

                    Picker(L.text("Cloud storage", language: appLanguage), selection: $cloudStorageProvider) {
                        ForEach(cloudOptions, id: \.self) { option in
                            Text(option).tag(option)
                        }
                    }
                    Text(L.text("Local only is the default. Cloud sync can be added after the local app is stable.", language: appLanguage))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section(L.text("AI extraction", language: appLanguage)) {
                    Text(L.text("AI extraction will call your backend, not OpenAI directly from the app.", language: appLanguage))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle(L.text("Settings", language: appLanguage))
        }
    }
}
