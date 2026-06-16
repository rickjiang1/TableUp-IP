import SwiftData
import SwiftUI
import UIKit

enum TableUpTheme {
    static let background = Color(red: 0.071, green: 0.071, blue: 0.071)
    static let backgroundLift = Color(red: 0.086, green: 0.086, blue: 0.086)
    static let surface = Color(red: 0.105, green: 0.105, blue: 0.105)
    static let card = Color.white.opacity(0.075)
    static let cardStroke = Color.white.opacity(0.08)
    static let orange = Color(red: 0.96, green: 0.56, blue: 0.25)
    static let softOrange = Color(red: 1.0, green: 0.68, blue: 0.42)
    static let jade = Color(red: 0.42, green: 0.72, blue: 0.50)
    static let inkText = Color(red: 0.96, green: 0.92, blue: 0.85)
    static let mutedText = Color(red: 0.72, green: 0.68, blue: 0.61)
}

struct YouliaoView: View {
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("expirationReminderDays") private var expirationReminderDays = 3
    @Query(sort: \StoredIngredient.categoryRaw) private var ingredients: [StoredIngredient]
    @State private var showingAddFood = false
    @State private var locationFilter: YouliaoLocationFilter = .all
    
    private var expiringSoonCount: Int {
        ingredients.filter { ingredient in
            let days = Calendar.current.dateComponents(
                [.day],
                from: Calendar.current.startOfDay(for: .now),
                to: Calendar.current.startOfDay(for: ingredient.expireDate)
            ).day ?? 0
            return days >= 0 && days <= expirationReminderDays
        }.count
    }
    
    private var filteredIngredients: [StoredIngredient] {
        ingredients
            .filter { locationFilter.includes($0.location) }
            .sorted(by: pantrySort)
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                TableUpTheme.background.ignoresSafeArea()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        hero
                        locationPicker
                        inventoryList
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 14)
                    .padding(.bottom, 150)
                }
                .scrollIndicators(.hidden)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $showingAddFood) {
                ScanView()
            }
        }
    }
    
    private var hero: some View {
        ZStack(alignment: .bottom) {
            Image("TableUpPantryBackground")
                .resizable()
                .scaledToFill()
                .overlay(
                    LinearGradient(
                        colors: [
                            Color.black.opacity(0.10),
                            Color.black.opacity(0.20),
                            Color.black.opacity(0.48)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .overlay(
                    LinearGradient(
                        colors: [Color.black.opacity(0.22), Color.clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
            
            VStack(spacing: 18) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(titleText)
                            .font(.system(size: 66, weight: .semibold, design: .serif))
                            .foregroundStyle(TableUpTheme.inkText)
                        
                        Text(subtitleText)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(TableUpTheme.mutedText)
                            .tracking(3)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "bell")
                        .font(.title3)
                        .foregroundStyle(TableUpTheme.inkText.opacity(0.82))
                        .frame(width: 42, height: 42)
                        .background(Color.black.opacity(0.22))
                        .clipShape(Circle())
                }
                
                Spacer()
                
                Button {
                    showingAddFood = true
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "plus")
                            .font(.headline)
                        Text(addFoodText)
                            .font(.headline.weight(.semibold))
                    }
                    .foregroundStyle(.white)
                    .frame(width: 230)
                    .padding(.vertical, 15)
                    .background(
                        LinearGradient(
                            colors: [TableUpTheme.softOrange, TableUpTheme.orange],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .clipShape(Capsule())
                    .shadow(color: TableUpTheme.orange.opacity(0.28), radius: 22, y: 10)
                }
                .buttonStyle(.plain)
                
                overview
            }
            .padding(24)
            .padding(.top, 42)
        }
        .frame(height: 500)
        .clipped()
    }
    
    private var overview: some View {
        VStack(spacing: 18) {
            HStack(spacing: 14) {
                overviewMetric(value: "\(ingredients.count)", label: "食材总数")
                Divider().overlay(Color.white.opacity(0.12))
                overviewMetric(value: "\(expiringSoonCount)", label: "即将过期")
            }
            .frame(height: 74)
            
            HStack(spacing: 10) {
                locationMiniMetric(.fridge)
                locationMiniMetric(.freezer)
                locationMiniMetric(.room)
            }
        }
        .padding(18)
        .background(Color.black.opacity(0.38))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(TableUpTheme.cardStroke, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.22), radius: 18, y: 12)
    }
    
    private func overviewMetric(value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.caption)
                .foregroundStyle(TableUpTheme.mutedText)
            Text(value)
                .font(.system(size: 34, weight: .semibold, design: .rounded))
                .foregroundStyle(TableUpTheme.inkText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    private func locationMiniMetric(_ filter: YouliaoLocationFilter) -> some View {
        VStack(spacing: 6) {
            Image(systemName: filter.icon)
                .font(.headline)
                .foregroundStyle(TableUpTheme.softOrange)
            Text(filter.shortTitle(language: appLanguage))
                .font(.caption2)
                .foregroundStyle(TableUpTheme.mutedText)
            Text("\(ingredients.filter { filter.includes($0.location) }.count)")
                .font(.caption.weight(.semibold))
                .foregroundStyle(TableUpTheme.inkText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.045))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
    
    private var locationPicker: some View {
        HStack(spacing: 8) {
            ForEach(YouliaoLocationFilter.allCases) { filter in
                Button {
                    locationFilter = filter
                } label: {
                    Text(filter.title(language: appLanguage))
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(locationFilter == filter ? TableUpTheme.background : TableUpTheme.mutedText)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(locationFilter == filter ? TableUpTheme.softOrange : Color.white.opacity(0.055))
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }

private struct YouliaoScene: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.045, green: 0.047, blue: 0.041),
                    Color(red: 0.12, green: 0.105, blue: 0.083),
                    Color(red: 0.055, green: 0.052, blue: 0.047)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: 1)
                .offset(y: 126)
            
            Rectangle()
                .fill(Color.black.opacity(0.24))
                .frame(height: 90)
                .offset(y: 186)
            
            SpotlightShape()
                .fill(
                    LinearGradient(
                        colors: [Color.white.opacity(0.18), Color.white.opacity(0.02)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: 250, height: 310)
                .rotationEffect(.degrees(-23))
                .offset(x: 90, y: -84)
            
            VStack(spacing: -4) {
                Image(systemName: "leaf.fill")
                    .rotationEffect(.degrees(-28))
                    .offset(x: -18)
                Image(systemName: "leaf.fill")
                    .rotationEffect(.degrees(22))
                    .offset(x: 16)
                Image(systemName: "leaf.fill")
                    .rotationEffect(.degrees(-8))
                    .offset(x: -4)
            }
            .font(.title2)
            .foregroundStyle(Color.green.opacity(0.28))
            .offset(x: -125, y: -70)
            
            HStack(spacing: 8) {
                Image(systemName: "circle.fill")
                Image(systemName: "circle.fill")
                Image(systemName: "circle.fill")
            }
            .font(.system(size: 28))
            .foregroundStyle(Color(red: 0.92, green: 0.84, blue: 0.72).opacity(0.55))
            .offset(x: 112, y: 34)
            
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Color(red: 0.45, green: 0.30, blue: 0.18).opacity(0.35))
                .frame(height: 16)
                .offset(y: 102)
        }
    }
}

private struct SpotlightShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX + rect.width * 0.18, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX * 0.72, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}
    
    @ViewBuilder
    private var inventoryList: some View {
        if filteredIngredients.isEmpty {
            VStack(spacing: 12) {
                Image(systemName: "takeoutbag.and.cup.and.straw")
                    .font(.largeTitle)
                    .foregroundStyle(TableUpTheme.mutedText)
                Text("还没有食材")
                    .font(.headline)
                    .foregroundStyle(TableUpTheme.inkText)
                Text("拍照或手动添加后会显示在这里")
                    .font(.footnote)
                    .foregroundStyle(TableUpTheme.mutedText)
            }
            .frame(maxWidth: .infinity)
            .padding(28)
            .background(TableUpTheme.card)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        } else {
            VStack(alignment: .leading, spacing: 12) {
                Text("库存")
                    .font(.headline)
                    .foregroundStyle(TableUpTheme.inkText)
                
                VStack(spacing: 10) {
                    ForEach(filteredIngredients) { ingredient in
                        NavigationLink {
                            IngredientDetailView(ingredient: ingredient)
                        } label: {
                            YouliaoIngredientRow(ingredient: ingredient)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
    
    private var titleText: String { "有料" }
    private var subtitleText: String { "知食材 · 善料理" }
    private var addFoodText: String { "添加食材" }
    
    private func text(_ zh: String, _ en: String) -> String {
        appLanguage == AppLanguage.chinese.rawValue ? zh : en
    }
    
    private func pantrySort(_ lhs: StoredIngredient, _ rhs: StoredIngredient) -> Bool {
        if lhs.locationRaw != rhs.locationRaw {
            return lhs.locationRaw.localizedStandardCompare(rhs.locationRaw) == .orderedAscending
        }
        if lhs.expireDate != rhs.expireDate {
            return lhs.expireDate < rhs.expireDate
        }
        return lhs.name.localizedStandardCompare(rhs.name) == .orderedAscending
    }
}

private struct YouliaoIngredientRow: View {
    let ingredient: StoredIngredient
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("expirationReminderDays") private var expirationReminderDays = 3
    
    private var expirationState: ExpirationState {
        ExpirationState(expireDate: ingredient.expireDate, reminderDays: expirationReminderDays)
    }
    
    var body: some View {
        HStack(spacing: 14) {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(iconBackground)
                .frame(width: 48, height: 48)
                .overlay(
                    Image(systemName: ingredient.location.icon)
                        .foregroundStyle(TableUpTheme.softOrange)
                )
            
            VStack(alignment: .leading, spacing: 5) {
                Text(ingredient.name)
                    .font(.headline)
                    .foregroundStyle(TableUpTheme.inkText)
                    .lineLimit(1)
                
                HStack(spacing: 8) {
                    Text(InventoryQuantityFormatter.primaryAmount(for: ingredient, language: appLanguage))
                    Text(ingredient.location.displayName(language: appLanguage))
                    Text(TableUpDateFormatter.date(ingredient.expireDate, language: appLanguage))
                }
                .font(.caption)
                .foregroundStyle(TableUpTheme.mutedText)
                .lineLimit(1)
            }
            
            Spacer()
            
            if let badge = expirationState.badgeText {
                Text(L.text(badge, language: appLanguage))
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(expirationState.foregroundColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(expirationState.backgroundColor)
                    .clipShape(Capsule())
            }
        }
        .padding(14)
        .background(TableUpTheme.card)
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(TableUpTheme.cardStroke, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
    
    private var iconBackground: Color {
        switch ingredient.location {
        case .fridge: return Color.blue.opacity(0.16)
        case .freezer: return Color.cyan.opacity(0.16)
        case .pantry, .counter: return Color.orange.opacity(0.15)
        }
    }
}

private enum YouliaoLocationFilter: String, CaseIterable, Identifiable {
    case all
    case fridge
    case freezer
    case room
    
    var id: String { rawValue }
    
    var icon: String {
        switch self {
        case .all: return "square.grid.2x2"
        case .fridge: return "refrigerator"
        case .freezer: return "snowflake"
        case .room: return "cabinet"
        }
    }
    
    func includes(_ location: StorageLocation) -> Bool {
        switch self {
        case .all:
            return true
        case .fridge:
            return location == .fridge
        case .freezer:
            return location == .freezer
        case .room:
            return location == .pantry || location == .counter
        }
    }
    
    func title(language: String) -> String {
        switch self {
        case .all: return "全部"
        case .fridge: return "冷藏"
        case .freezer: return "冷冻"
        case .room: return "常温"
        }
    }
    
    func shortTitle(language: String) -> String {
        title(language: language)
    }
}

struct KaifanView: View {
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("almostCookThreshold") private var threshold = 0.7
    @Query private var ingredients: [StoredIngredient]
    @Query(sort: \Recipe.createdAt, order: .reverse) private var recipes: [Recipe]
    @State private var selectedFilter: KaifanFilter = .recommended
    @State private var cloudMatches: [CloudRecipeMatch] = []
    @State private var isRefreshing = false
    @State private var hasMatched = false
    @State private var matchError: String?
    @State private var showingRecipes = false
    
    private var assessments: [CookAssessment] {
        recipes
            .map { RecipeMatcher.assess(recipe: $0, inventory: ingredients) }
            .sorted { lhs, rhs in
                if lhs.matchRatio != rhs.matchRatio {
                    return lhs.matchRatio > rhs.matchRatio
                }
                return (lhs.recipe.totalTimeMinutes, lhs.recipe.name) < (rhs.recipe.totalTimeMinutes, rhs.recipe.name)
            }
    }
    
    private var localFilteredAssessments: [CookAssessment] {
        switch selectedFilter {
        case .recommended:
            return hasMatched ? assessments.filter { $0.matchRatio >= 0.3 }.prefixArray(8) : []
        case .ready:
            return hasMatched ? assessments.filter { $0.matchRatio >= threshold } : []
        case .almost:
            return hasMatched ? assessments.filter { $0.matchRatio >= 0.3 && $0.matchRatio < threshold } : []
        case .all:
            return assessments
        case .favorite:
            return []
        }
    }
    
    private var cloudFilteredMatches: [CloudRecipeMatch] {
        let sorted = cloudMatches.sorted { $0.matchScorePercent > $1.matchScorePercent }
        switch selectedFilter {
        case .recommended:
            return hasMatched ? Array(sorted.filter { $0.matchRatio >= 0.3 }.prefix(8)) : []
        case .ready:
            return hasMatched ? sorted.filter { $0.matchRatio >= threshold } : []
        case .almost:
            return hasMatched ? sorted.filter { $0.matchRatio >= 0.3 && $0.matchRatio < threshold } : []
        case .all:
            return sorted
        case .favorite:
            return []
        }
    }
    
    private var useCloudMatches: Bool {
        hasMatched && !cloudMatches.isEmpty && selectedFilter != .all
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                KaifanPageBackground().ignoresSafeArea()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        hero
                        filterBar
                        content
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 14)
                    .padding(.bottom, 150)
                }
                .scrollIndicators(.hidden)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $showingRecipes) {
                RecipesView()
            }
        }
    }
    
    private var hero: some View {
        VStack(spacing: 16) {
            ZStack(alignment: .topLeading) {
                KaifanHeroScene(recipe: featuredRecipe)
                    .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
                
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("开饭")
                            .font(.system(size: 66, weight: .semibold, design: .serif))
                            .foregroundStyle(Color(red: 0.12, green: 0.105, blue: 0.09))
                        
                        Text("寻好味 · 开一席")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(Color.black.opacity(0.52))
                            .tracking(3)
                    }
                    
                    Spacer()
                    
                    Button {
                        showingRecipes = true
                    } label: {
                        Image(systemName: "magnifyingglass")
                            .font(.title3)
                            .foregroundStyle(Color.black.opacity(0.66))
                            .frame(width: 42, height: 42)
                            .background(Color.white.opacity(0.58))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("全部食谱")
                }
                .padding(.horizontal, 24)
                .padding(.top, 96)
                
                VStack {
                    Spacer()
                    HStack(spacing: 12) {
                        KaifanQuickStat(icon: "checkmark.seal.fill", value: "\(readyCount)", label: "可做")
                        KaifanQuickStat(icon: "sparkles", value: "\(almostCount)", label: "差一点")
                        KaifanQuickStat(icon: "leaf.fill", value: "\(expiringSoonCount)", label: "快过期")
                    }
                    .padding(14)
                    .background(Color.white.opacity(0.74))
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                    .shadow(color: .black.opacity(0.08), radius: 16, y: 8)
                    .padding(.horizontal, 18)
                    .offset(y: 44)
                }
            }
            .frame(height: 430)
            
            Button {
                Task { await refreshCloudMatches() }
            } label: {
                HStack(spacing: 10) {
                    if isRefreshing {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "wand.and.stars")
                    }
                    Text("匹配菜谱")
                        .font(.headline.weight(.semibold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(TableUpTheme.orange)
                .clipShape(Capsule())
                .shadow(color: TableUpTheme.orange.opacity(0.25), radius: 20, y: 9)
            }
            .buttonStyle(.plain)
            .disabled(isRefreshing)
            .padding(.top, 42)
        }
    }

    private var featuredRecipe: Recipe? {
        recipes.first { $0.imageThumbnailData != nil || $0.imageData != nil } ?? recipes.first
    }
    
    private var filterBar: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                ForEach(KaifanFilter.allCases) { filter in
                    Button {
                        selectedFilter = filter
                    } label: {
                        Text(filter.title(language: appLanguage))
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(selectedFilter == filter ? .white : Color.black.opacity(0.62))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(selectedFilter == filter ? TableUpTheme.orange : Color.white.opacity(0.58))
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .scrollIndicators(.hidden)
    }
    
    @ViewBuilder
    private var content: some View {
        if isRefreshing {
            ProgressView()
                .frame(maxWidth: .infinity)
                .padding(24)
        }
        
        if let matchError {
            Text(matchError)
                .font(.footnote)
                .foregroundStyle(Color.black.opacity(0.52))
                .padding(.horizontal, 4)
        }
        
        if useCloudMatches {
            if cloudFilteredMatches.isEmpty {
                emptyState
            } else {
                LazyVStack(spacing: 14) {
                    ForEach(cloudFilteredMatches, id: \.recipeID) { match in
                        cloudRecipeCard(match)
                    }
                }
            }
        } else if localFilteredAssessments.isEmpty {
            emptyState
        } else {
            LazyVStack(spacing: 14) {
                ForEach(localFilteredAssessments, id: \.recipe.id) { assessment in
                    NavigationLink {
                        RecipeDetailView(recipe: assessment.recipe, assessment: assessment)
                    } label: {
                        KaifanRecipeCard(
                            title: assessment.recipe.name,
                            imageData: assessment.recipe.imageThumbnailData ?? assessment.recipe.imageData,
                            matchPercent: Int((assessment.matchRatio * 100).rounded()),
                            totalTimeMinutes: assessment.recipe.totalTimeMinutes,
                            activeTimeMinutes: assessment.recipe.activeTimeMinutes,
                            difficulty: assessment.recipe.difficulty,
                            missing: assessment.missing.map(\.name),
                            fridgeRescueScore: FridgeRescueScorer.score(recipe: assessment.recipe, inventory: ingredients),
                            leftoverScore: assessment.recipe.leftoverScore
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: selectedFilter == .favorite ? "star" : "fork.knife")
                .font(.largeTitle)
                .foregroundStyle(Color.black.opacity(0.35))
            Text(emptyTitle)
                .font(.headline)
                .foregroundStyle(Color.black.opacity(0.72))
            Text(emptySubtitle)
                .font(.footnote)
                .foregroundStyle(Color.black.opacity(0.48))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(28)
        .background(Color.white.opacity(0.48))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
    
    private func cloudRecipeCard(_ match: CloudRecipeMatch) -> some View {
        let recipe = localRecipe(for: match)
        return Group {
            if let recipe {
                NavigationLink {
                    RecipeDetailView(recipe: recipe, cloudMatch: match)
                } label: {
                    KaifanRecipeCard(
                        title: match.recipeName,
                        imageData: recipe.imageThumbnailData ?? recipe.imageData,
                        matchPercent: Int(match.matchScorePercent.rounded()),
                        totalTimeMinutes: recipe.totalTimeMinutes,
                        activeTimeMinutes: recipe.activeTimeMinutes,
                        difficulty: recipe.difficulty,
                        missing: match.missingRequiredIngredients.map(\.recipeIngredient),
                        fridgeRescueScore: FridgeRescueScorer.score(recipe: recipe, inventory: ingredients),
                        leftoverScore: recipe.leftoverScore
                    )
                }
                .buttonStyle(.plain)
            } else {
                KaifanRecipeCard(
                    title: match.recipeName,
                    imageData: nil,
                    matchPercent: Int(match.matchScorePercent.rounded()),
                    totalTimeMinutes: nil,
                    activeTimeMinutes: nil,
                    difficulty: nil,
                    missing: match.missingRequiredIngredients.map(\.recipeIngredient),
                    fridgeRescueScore: nil,
                    leftoverScore: nil
                )
            }
        }
    }
    
    private var readyCount: Int {
        guard hasMatched else { return 0 }
        if !cloudMatches.isEmpty {
            return cloudMatches.filter { $0.matchRatio >= threshold }.count
        }
        return assessments.filter { $0.matchRatio >= threshold }.count
    }
    
    private var almostCount: Int {
        guard hasMatched else { return 0 }
        if !cloudMatches.isEmpty {
            return cloudMatches.filter { $0.matchRatio >= 0.3 && $0.matchRatio < threshold }.count
        }
        return assessments.filter { $0.matchRatio >= 0.3 && $0.matchRatio < threshold }.count
    }
    
    private var expiringSoonCount: Int {
        ingredients.filter {
            let days = Calendar.current.dateComponents(
                [.day],
                from: Calendar.current.startOfDay(for: .now),
                to: Calendar.current.startOfDay(for: $0.expireDate)
            ).day ?? 0
            return days >= 0 && days <= 3
        }.count
    }
    
    private var emptyTitle: String {
        if selectedFilter == .favorite {
            return "还没有收藏"
        }
        if hasMatched || selectedFilter == .all {
            return "暂时没有合适的菜"
        }
        return "先匹配一下"
    }
    
    private var emptySubtitle: String {
        if hasMatched || selectedFilter == .all || selectedFilter == .favorite {
            return "换个筛选，或者去食谱库添加更多菜谱。"
        }
        return "点击“匹配菜谱”，根据家里的食材找今天能做什么。"
    }
    
    private func localRecipe(for match: CloudRecipeMatch) -> Recipe? {
        if let recipe = recipes.first(where: { !$0.cloudId.isEmpty && $0.cloudId == match.recipeID }) {
            return recipe
        }
        
        let normalizedMatchName = IngredientNormalizer.normalizeName(match.recipeName)
        return recipes.first { IngredientNormalizer.normalizeName($0.name) == normalizedMatchName }
    }
    
    private func refreshCloudMatches() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        hasMatched = false
        cloudMatches = []
        matchError = nil
        defer { isRefreshing = false }
        
        do {
            let matches = try await CloudRecipeMatcher().matchRecipes(inventory: ingredients)
            cloudMatches = matches
            hasMatched = true
            matchError = nil
        } catch {
            cloudMatches = []
            hasMatched = true
            matchError = "云端匹配暂时不可用，正在使用本地匹配。"
        }
    }
    
    private func text(_ zh: String, _ en: String) -> String {
        appLanguage == AppLanguage.chinese.rawValue ? zh : en
    }
}

private struct KaifanQuickStat: View {
    let icon: String
    let value: String
    let label: String
    
    var body: some View {
        VStack(spacing: 7) {
            Image(systemName: icon)
                .foregroundStyle(TableUpTheme.orange)
            Text(value)
                .font(.headline.weight(.semibold))
                .foregroundStyle(Color.black.opacity(0.82))
            Text(label)
                .font(.caption2)
                .foregroundStyle(Color.black.opacity(0.48))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.white.opacity(0.52))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct KaifanPageBackground: View {
    var body: some View {
        Image("TableUpMealBackground")
            .resizable()
            .scaledToFill()
            .overlay(Color.white.opacity(0.52))
            .blur(radius: 18)
            .scaleEffect(1.08)
    }
}

private struct KaifanHeroScene: View {
    let recipe: Recipe?
    
    var body: some View {
        ZStack {
            Image("TableUpMealBackground")
                .resizable()
                .scaledToFill()
            
            LinearGradient(
                colors: [
                    Color.white.opacity(0.50),
                    Color.white.opacity(0.08),
                    Color.white.opacity(0.18)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}

private struct TableSceneFallback: View {
    var body: some View {
        ZStack {
            Rectangle()
                .fill(Color(red: 0.90, green: 0.80, blue: 0.66).opacity(0.25))
                .frame(height: 120)
                .offset(y: 126)
            
            HStack(spacing: 10) {
                Capsule()
                    .fill(Color(red: 0.45, green: 0.30, blue: 0.18).opacity(0.36))
                    .frame(width: 120, height: 18)
                Capsule()
                    .fill(Color(red: 0.45, green: 0.30, blue: 0.18).opacity(0.18))
                    .frame(width: 70, height: 12)
            }
            .rotationEffect(.degrees(-10))
            .offset(x: 98, y: 92)
            
            VStack(spacing: -5) {
                Image(systemName: "leaf.fill")
                    .rotationEffect(.degrees(-26))
                    .offset(x: -16)
                Image(systemName: "leaf.fill")
                    .rotationEffect(.degrees(24))
                    .offset(x: 17)
                Image(systemName: "leaf.fill")
                    .rotationEffect(.degrees(8))
            }
            .font(.title2)
            .foregroundStyle(TableUpTheme.jade.opacity(0.40))
            .offset(x: 126, y: -66)
        }
    }
}

private struct KaifanRecipeCard: View {
    let title: String
    let imageData: Data?
    let matchPercent: Int
    let totalTimeMinutes: Int?
    let activeTimeMinutes: Int?
    let difficulty: RecipeDifficulty?
    let missing: [String]
    let fridgeRescueScore: Int?
    let leftoverScore: Double?
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    
    var body: some View {
        HStack(spacing: 14) {
            RecipeThumbnail(imageData: imageData)
                .frame(width: 84, height: 84)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            
            VStack(alignment: .leading, spacing: 9) {
                HStack(alignment: .firstTextBaseline) {
                    Text(title)
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(Color.black.opacity(0.82))
                        .lineLimit(1)
                    
                    Spacer()
                    
                    Text("\(matchPercent)%")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(matchPercent >= 70 ? TableUpTheme.orange : Color.orange.opacity(0.7))
                        .clipShape(Capsule())
                }
                
                HStack(spacing: 8) {
                    if let totalTimeMinutes, totalTimeMinutes > 0 {
                        metric("clock", "\(totalTimeMinutes)m")
                    }
                    if let activeTimeMinutes, activeTimeMinutes > 0 {
                        metric("hand.raised", "\(activeTimeMinutes)m")
                    }
                    if let difficulty {
                        metric("flame", difficulty.displayName(language: appLanguage))
                    }
                }
                
                if !missing.isEmpty {
                    Text("\(text("缺少", "Missing")) \(missing.prefix(2).joined(separator: "、"))")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.red.opacity(0.75))
                        .lineLimit(1)
                } else {
                    Text(text("食材已满足", "Ingredients ready"))
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(TableUpTheme.jade)
                }
                
                HStack(spacing: 10) {
                    if let fridgeRescueScore {
                        metric("leaf.fill", "\(text("拯救", "Rescue")) \(fridgeRescueScore)")
                    }
                    if let leftoverScore {
                        metric("takeoutbag.and.cup.and.straw.fill", "\(text("剩菜", "Leftover")) \(Int(leftoverScore.rounded()))")
                    }
                }
            }
        }
        .padding(14)
        .background(Color.white.opacity(0.58))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.5), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.08), radius: 18, y: 8)
    }
    
    private func metric(_ icon: String, _ value: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
            Text(value)
        }
        .font(.caption2.weight(.semibold))
        .foregroundStyle(Color.black.opacity(0.52))
        .lineLimit(1)
    }
    
    private func text(_ zh: String, _ en: String) -> String {
        appLanguage == AppLanguage.chinese.rawValue ? zh : en
    }
}

private enum KaifanFilter: String, CaseIterable, Identifiable {
    case recommended
    case ready
    case almost
    case all
    case favorite
    
    var id: String { rawValue }
    
    func title(language: String) -> String {
        switch self {
        case .recommended: return "推荐"
        case .ready: return "可做"
        case .almost: return "差一点"
        case .all: return "全部"
        case .favorite: return "收藏"
        }
    }
}

private extension StorageLocation {
    var icon: String {
        switch self {
        case .fridge: return "refrigerator"
        case .freezer: return "snowflake"
        case .pantry: return "cabinet"
        case .counter: return "table.furniture"
        }
    }
}

private extension Array {
    func prefixArray(_ maxLength: Int) -> [Element] {
        Array(prefix(maxLength))
    }
}
