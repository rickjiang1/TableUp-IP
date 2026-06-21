import SwiftUI
import UIKit

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
        "Family kitchen": "家庭厨房",
        "Current household": "当前家庭",
        "Sync family inventory": "刷新家庭库存",
        "Create invite code": "生成邀请码",
        "Invite code": "邀请码",
        "Enter invite code": "输入邀请码",
        "Join": "加入",
        "Family inventory is ready.": "家庭库存已就绪。",
        "Family inventory synced.": "家庭库存已刷新。",
        "Share this code with a family member.": "把这个邀请码发给家人即可加入。",
        "Joined family kitchen.": "已加入家庭厨房。",
        "AI extraction": "AI 提取",
        "AI extraction will call your backend, not OpenAI directly from the app.": "AI 提取会调用你的 backend，不会在 app 里直接调用 OpenAI。",
        "Storage view": "库存视图",
        "Inventory": "库存",
        "Unmatched": "未匹配",
        "Match ingredient library": "匹配食材库",
        "Recipe": "食谱",
        "Refresh": "刷新",
        "Match all": "一键匹配",
        "Match all unmatched": "一键匹配全部",
        "Match all unmatched?": "确定一键匹配全部吗？",
        "Matching...": "匹配中...",
        "Matched": "已匹配",
        "Skipped": "已跳过",
        "The app will choose the best suggested ingredient for each unmatched inventory item. Low confidence items will be skipped.": "App 会为每个未匹配库存食材选择最接近的推荐食材。置信度低的项目会自动跳过。",
        "Unable to load unmatched ingredients": "无法读取未匹配食材",
        "No unmatched ingredients": "没有未匹配食材",
        "Names that do not match the ingredient dictionary will appear here after recipe matching.": "库存里还没有匹配到食材库的食材会显示在这里。",
        "Not matched to ingredient dictionary": "没有匹配到食材字典",
        "Use these names to add aliases such as chicken breast = chicken or 鸡胸 = chicken breast.": "你可以用这些名称添加别名，比如 chicken breast = chicken，或 鸡胸 = chicken breast。",
        "Normalized": "归一化名称",
        "Unmatched ingredients": "未匹配食材",
        "Match to": "匹配到",
        "Choose ingredient": "选择食材",
        "Search ingredients": "搜索食材",
        "Suggested": "推荐匹配",
        "Matched alias": "匹配别名",
        "Matched to ingredient library": "已匹配到食材库",
        "Amount": "数量",
        "Unit conversion": "单位统一",
        "Unit conversion details": "单位换算详情",
        "Canonical unit": "统一单位",
        "Raw unit": "原始单位",
        "Standard unit": "标准单位",
        "Conversion rule": "换算规则",
        "Conversion ratio": "换算比例",
        "Needs review": "需要确认",
        "Missing conversion rule": "缺少单位换算规则",
        "Match again to calculate canonical unit.": "重新匹配后会计算统一单位。",
        "Full product name": "完整商品名",
        "Description": "描述",
        "Original detected text": "原始识别文字",
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
        "Planning": "计划",
        "Prep": "备菜",
        "Cook phase": "烹饪",
        "Finish": "收尾",
        "Step instruction": "步骤说明",
        "Step image URLs": "步骤图片 URL，每行一张",
        "Add Step": "添加步骤",
        "Remove Step": "删除步骤",
        "Recipe metrics": "食谱指标",
        "Match": "匹配度",
        "Fridge Rescue Score": "冰箱拯救分数",
        "Total Time": "总时长",
        "Active Time": "实际操作时间",
        "Primary cooking method": "主要烹饪方式",
        "Not specified": "未指定",
        "Stir fry": "炒",
        "Pan fry": "煎",
        "Grill": "烤架/烧烤",
        "Bake": "烘烤",
        "Roast": "烤",
        "Braise": "焖/红烧",
        "Stew": "炖",
        "Slow cook": "慢炖",
        "Soup": "汤",
        "Steam": "蒸",
        "Boil": "煮",
        "Hot pot": "火锅",
        "Air fry": "空气炸",
        "Deep fry": "油炸",
        "Sauce method": "酱汁/拌炒",
        "Raw": "凉拌/生食",
        "Difficulty": "难度",
        "Leftover Score": "剩菜友好度",
        "minutes": "分钟",
        "Easy": "简单",
        "Medium": "中等",
        "Hard": "困难",
        "Match details": "匹配详情",
        "Matched ingredients": "已有食材",
        "Missing required ingredients": "缺少必需食材",
        "Missing optional ingredients": "缺少可选食材",
        "Substituted ingredients": "替代食材",
        "Substitute score": "替代分数",
        "Missing pantry items": "缺少调料",
        "Add Recipe": "添加食谱",
        "Edit Recipe": "编辑食谱",
        "Cancel": "取消",
        "Delete": "删除",
        "Save": "保存",
        "Saving...": "保存中...",
        "Cook": "烹饪",
        "Edit": "编辑",
        "Open video URL": "打开视频链接",
        "Ready to cook": "现在可做",
        "Almost there": "还差一点",
        "Match Recipes": "匹配菜谱",
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
        "Deleted": "已删除",
        "Delete failed": "删除失败",
        "Delete folder?": "删除这个分类？",
        "Nothing was saved.": "没有保存任何食材。",
        "Storage now has": "库存现在有",
        "item(s).": "个食材。",
        "Remember to match ingredients to the ingredient library.": "别忘了去匹配食材库哦。",
        "No saved food": "还没有保存的食材",
        "Saved ingredients will appear here.": "保存后的食材会显示在这里。",
        "Clear All": "一键清除",
        "Clear all storage?": "清空所有库存？",
        "This will remove every saved ingredient.": "这会删除所有已保存的食材。",
        "Cleared": "已清空",
        "item(s) removed": "个食材已删除",
        "Move to Folder": "移动到文件夹",
        "Root Folder": "根目录",
        "Moved": "已移动",
        "Extraction failed": "提取失败",
        "OK": "好的",
        "Review items": "确认食材",
        "Name": "名称",
        "Quantity": "数量",
        "Unit": "单位",
        "Category": "分类",
        "Location": "方式",
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
        "Needed": "需要",
        "Alias match": "别名匹配",
        "Exact match": "完全匹配",
        "Fuzzy match": "模糊匹配",
        "Fuzzy alias match": "模糊别名匹配",
        "Possible match": "可能匹配",
        "Use suggestion": "使用建议",
        "Using substitute ingredient": "使用替代食材",
        "Cooked": "已烹饪",
        "Consumed": "已消耗",
        "No inventory items were consumed.": "没有扣减任何库存食材。",
        "Orange means substitute ingredient": "橙色表示使用了替代食材",
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
        "Matched to": "匹配到",
        "Not matched": "未匹配",
        "Add main ingredient": "添加主要食材",
        "Add secondary ingredient": "添加次要食材",
        "Add seasoning": "添加调料",
        "Sync Recipes": "同步食谱",
        "Sync failed": "同步失败",
        "Recipe Library": "食谱库",
        "Central Recipes": "中心食谱",
        "My Recipes": "我的食谱",
        "New Category": "新建分类",
        "Rename": "重命名",
        "New Folder": "新建文件夹",
        "Folder name": "文件夹名称",
        "Cover": "封面",
        "Remove Cover": "移除封面",
        "No recipes here": "这里还没有食谱",
        "Create a folder or add a recipe.": "创建文件夹或添加食谱。",
        "folders": "个文件夹",
        "recipes": "个食谱",
        "piece": "个",
        "g": "克",
        "kg": "公斤",
        "lb": "磅",
        "oz": "盎司",
        "ml": "毫升",
        "l": "升",
        "tsp": "茶匙",
        "tbsp": "汤匙",
        "cup": "杯",
        "clove": "瓣",
        "bunch": "把",
        "bottle": "瓶",
        "can": "罐",
        "bag": "袋",
        "pack": "包"
    ]
}

enum TableUpDateFormatter {
    static func date(_ date: Date, language: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: language == AppLanguage.chinese.rawValue ? "zh_Hans_US" : "en_US")
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

extension IngredientCategory {
    func displayName(language: String) -> String {
        return L.text(rawValue, language: language)
    }
}

extension StorageLocation {
    static var selectableCases: [StorageLocation] {
        [.fridge, .freezer, .pantry]
    }

    func displayName(language: String) -> String {
        if language == AppLanguage.chinese.rawValue {
            switch self {
            case .pantry, .counter:
                return "常温"
            default:
                break
            }
        }
        return L.text(rawValue, language: language)
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

extension RecipeSource {
    func displayName(language: String) -> String {
        switch self {
        case .central:
            return L.text("Central Recipes", language: language)
        case .user:
            return L.text("My Recipes", language: language)
        }
    }
}

extension RecipeDifficulty {
    func displayName(language: String) -> String {
        L.text(rawValue, language: language)
    }
}

extension IngredientUnit {
    func displayName(language: String) -> String {
        L.text(rawValue, language: language)
    }
}

extension View {
    func dismissKeyboardOnTap() -> some View {
        simultaneousGesture(TapGesture().onEnded {
            UIApplication.shared.sendAction(
                #selector(UIResponder.resignFirstResponder),
                to: nil,
                from: nil,
                for: nil
            )
        })
    }
}

struct SettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("almostCookThreshold") private var threshold = 0.7
    @AppStorage("cloudStorageProvider") private var cloudStorageProvider = "Local only"
    @AppStorage("expirationReminderDays") private var expirationReminderDays = 3
    @State private var householdName = HouseholdSessionStore.householdName
    @State private var householdRole = HouseholdSessionStore.householdRole
    @State private var inviteCode = ""
    @State private var joinCode = ""
    @State private var householdStatus = ""
    @State private var isHouseholdBusy = false

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

                Section(L.text("Family kitchen", language: appLanguage)) {
                    LabeledContent(L.text("Current household", language: appLanguage)) {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(householdName)
                            Text(householdRole)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Button {
                        Task { await syncHouseholdInventory() }
                    } label: {
                        Label(L.text("Sync family inventory", language: appLanguage), systemImage: "arrow.triangle.2.circlepath")
                    }
                    .disabled(isHouseholdBusy)

                    Button {
                        Task { await createHouseholdInvite() }
                    } label: {
                        Label(L.text("Create invite code", language: appLanguage), systemImage: "person.badge.plus")
                    }
                    .disabled(isHouseholdBusy)

                    if !inviteCode.isEmpty {
                        LabeledContent(L.text("Invite code", language: appLanguage)) {
                            Text(inviteCode)
                                .font(.headline.monospaced())
                                .textSelection(.enabled)
                        }
                    }

                    HStack {
                        TextField(L.text("Enter invite code", language: appLanguage), text: $joinCode)
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                        Button(L.text("Join", language: appLanguage)) {
                            Task { await joinHousehold() }
                        }
                        .disabled(joinCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isHouseholdBusy)
                    }

                    if !householdStatus.isEmpty {
                        Text(householdStatus)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Section(L.text("AI extraction", language: appLanguage)) {
                    Text(L.text("AI extraction will call your backend, not OpenAI directly from the app.", language: appLanguage))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle(L.text("Settings", language: appLanguage))
            .task {
                await refreshHouseholdSession()
            }
        }
    }

    private func refreshHouseholdSession() async {
        do {
            let session = try await HouseholdSyncService().bootstrapIfNeeded()
            householdName = session.household.name
            householdRole = session.role
            householdStatus = L.text("Family inventory is ready.", language: appLanguage)
        } catch {
            householdStatus = error.localizedDescription
        }
    }

    private func syncHouseholdInventory() async {
        isHouseholdBusy = true
        defer { isHouseholdBusy = false }
        do {
            let items = try await HouseholdSyncService().syncInventory(modelContext: modelContext)
            householdName = HouseholdSessionStore.householdName
            householdRole = HouseholdSessionStore.householdRole
            householdStatus = "\(L.text("Family inventory synced.", language: appLanguage)) \(items.count) \(appLanguage == AppLanguage.chinese.rawValue ? "种食材" : "item(s)")"
        } catch {
            householdStatus = error.localizedDescription
        }
    }

    private func createHouseholdInvite() async {
        isHouseholdBusy = true
        defer { isHouseholdBusy = false }
        do {
            let invite = try await HouseholdSyncService().createInvite()
            inviteCode = invite.code
            householdStatus = L.text("Share this code with a family member.", language: appLanguage)
        } catch {
            householdStatus = error.localizedDescription
        }
    }

    private func joinHousehold() async {
        isHouseholdBusy = true
        defer { isHouseholdBusy = false }
        do {
            let session = try await HouseholdSyncService().joinHousehold(code: joinCode)
            householdName = session.household.name
            householdRole = session.role
            joinCode = ""
            _ = try? await HouseholdSyncService().syncInventory(modelContext: modelContext)
            householdStatus = L.text("Joined family kitchen.", language: appLanguage)
        } catch {
            householdStatus = error.localizedDescription
        }
    }
}
