import AVFoundation
import Speech
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
    static let warningRed = Color(red: 0.93, green: 0.30, blue: 0.22)
    static let inkText = Color(red: 0.96, green: 0.92, blue: 0.85)
    static let mutedText = Color(red: 0.72, green: 0.68, blue: 0.61)
}

struct YouliaoView: View {
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @AppStorage("expirationReminderDays") private var expirationReminderDays = 3
    @Query(sort: \StoredIngredient.categoryRaw) private var ingredients: [StoredIngredient]
    @Binding private var isFloatingPanelOpen: Bool
    @State private var activeFoodEntryMode: FoodEntryMode?
    @State private var showingBasketMenu = false
    @State private var showingIngredientMatcher = false
    @State private var showingClearConfirmation = false
    @State private var cabinetOpen = false
    @State private var locationFilter: YouliaoLocationFilter = .all

    init(isFloatingPanelOpen: Binding<Bool> = .constant(false)) {
        _isFloatingPanelOpen = isFloatingPanelOpen
    }
    
    private var expiringSoonCount: Int {
        ingredients.filter(isExpiringSoon).count
    }
    
    private var filteredIngredients: [StoredIngredient] {
        ingredients
            .filter { ingredient in
                switch locationFilter {
                case .expiringSoon:
                    return isExpiringSoon(ingredient)
                default:
                    return locationFilter.includes(ingredient.location)
                }
            }
            .sorted(by: pantrySort)
    }

    private var unmatchedInventoryCount: Int {
        ingredients.filter {
            $0.canonicalIngredientId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }.count
    }
    
    var body: some View {
        GeometryReader { proxy in
            NavigationStack {
                let width = proxy.size.width
                let height = proxy.size.height
                
                ZStack(alignment: .top) {
                    Image("TableUpYouliaoMockBackground")
                        .resizable()
                        .scaledToFill()
                        .frame(width: width, height: height)
                        .clipped()
                        .allowsHitTesting(false)
                    
                    VStack {
                        Spacer()
                        LinearGradient(
                            colors: [
                                Color.clear,
                                TableUpTheme.background.opacity(0.86),
                                TableUpTheme.background
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        .frame(height: 190)
                    }
                    .allowsHitTesting(false)
                    
                    if cabinetOpen || showingBasketMenu {
                        Button {
                            closeFloatingPanels()
                        } label: {
                            Rectangle()
                                .fill(Color.black.opacity(showingBasketMenu ? 0.18 : 0.001))
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .ignoresSafeArea()
                        .zIndex(3)
                    }
                    
                    Button {
                        withAnimation(.easeInOut(duration: 0.18)) {
                            cabinetOpen = false
                            showingBasketMenu = true
                        }
                    } label: {
                        Rectangle()
                            .fill(Color.white.opacity(0.001))
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .frame(width: width * 0.88, height: height * 0.27)
                    .position(x: width * 0.43, y: height * 0.43)
                    .zIndex(2)
                    .accessibilityLabel("添加食材")
                    
                    Button {
                        withAnimation(.easeInOut(duration: 0.18)) {
                            showingBasketMenu = false
                            cabinetOpen.toggle()
                        }
                    } label: {
                        Rectangle()
                            .fill(Color.white.opacity(0.001))
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .frame(width: width * 0.88, height: height * 0.26)
                    .position(x: width * 0.45, y: height * 0.70)
                    .zIndex(2)
                    .accessibilityLabel("查看库存")

                    if cabinetOpen {
                        VStack(alignment: .leading, spacing: 14) {
                            overview
                            inventorySectionHeader
                            locationPicker
                            
                            inventoryList
                        }
                        .padding(16)
                        .frame(height: height * 0.78)
                        .background(Color.black.opacity(0.78))
                        .overlay(
                            RoundedRectangle(cornerRadius: 24, style: .continuous)
                                .stroke(TableUpTheme.cardStroke, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                        .padding(.horizontal, 18)
                        .padding(.top, max(58, height * 0.14))
                        .padding(.bottom, 72)
                        .zIndex(4)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                        
                        Button {
                            showingIngredientMatcher = true
                        } label: {
                            matchBellButton
                        }
                        .buttonStyle(.plain)
                        .position(x: width - 48, y: max(132, height * 0.22))
                        .zIndex(5)
                        .accessibilityLabel(L.text("Match ingredient library", language: appLanguage))
                    }
                    
                    if showingBasketMenu {
                        basketMenu
                            .padding(.horizontal, 34)
                            .padding(.top, height * 0.33)
                            .zIndex(5)
                            .transition(.opacity.combined(with: .scale(scale: 0.96, anchor: .top)))
                    }
                    
                }
                .frame(width: width, height: height, alignment: .top)
                .clipped()
                .ignoresSafeArea()
                .navigationBarTitleDisplayMode(.inline)
                .toolbar(.hidden, for: .navigationBar)
                .toolbarBackground(.hidden, for: .navigationBar)
                .navigationBarHidden(true)
                .sheet(item: $activeFoodEntryMode) { mode in
                    switch mode {
                    case .camera:
                        PhotoIngredientCaptureSheet(launchMode: .camera)
                    case .photoLibrary:
                        PhotoIngredientCaptureSheet(launchMode: .photoLibrary)
                    case .manual:
                        ManualIngredientEntrySheet()
                            .presentationDetents([.medium, .large])
                            .presentationDragIndicator(.visible)
                    case .voice:
                        VoiceIngredientEntrySheet()
                            .presentationDetents([.medium, .large])
                            .presentationDragIndicator(.visible)
                    }
                }
                .sheet(isPresented: $showingIngredientMatcher) {
                    StorageView(initialTab: .unmatched, showsTabPicker: false)
                }
                .confirmationDialog(
                    L.text("Clear all storage?", language: appLanguage),
                    isPresented: $showingClearConfirmation,
                    titleVisibility: .visible
                ) {
                    Button(L.text("Clear All", language: appLanguage), role: .destructive) {
                        clearAllIngredients()
                    }
                    Button(L.text("Cancel", language: appLanguage), role: .cancel) {}
                } message: {
                    Text(L.text("This will remove every saved ingredient.", language: appLanguage))
                }
            }
            .frame(width: proxy.size.width, height: proxy.size.height, alignment: .topLeading)
            .ignoresSafeArea()
            .onAppear {
                syncFloatingPanelState()
            }
            .onDisappear {
                isFloatingPanelOpen = false
            }
            .onChange(of: cabinetOpen) { _, _ in
                syncFloatingPanelState()
            }
            .onChange(of: showingBasketMenu) { _, _ in
                syncFloatingPanelState()
            }
        }
    }
    
    private func closeFloatingPanels() {
        withAnimation(.easeInOut(duration: 0.18)) {
            showingBasketMenu = false
            cabinetOpen = false
        }
    }

    private func syncFloatingPanelState() {
        isFloatingPanelOpen = cabinetOpen || showingBasketMenu
    }

    private var matchBellButton: some View {
        ZStack(alignment: .topTrailing) {
            Image("TableUpMatchBell")
                .resizable()
                .scaledToFill()
                .frame(width: 62, height: 62)
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(unmatchedInventoryCount > 0 ? TableUpTheme.warningRed.opacity(0.74) : Color.white.opacity(0.20), lineWidth: unmatchedInventoryCount > 0 ? 2 : 1)
                )
                .shadow(
                    color: unmatchedInventoryCount > 0 ? TableUpTheme.warningRed.opacity(0.50) : TableUpTheme.orange.opacity(0.30),
                    radius: unmatchedInventoryCount > 0 ? 24 : 16,
                    y: 7
                )
                .contentShape(Circle())
            
            if unmatchedInventoryCount > 0 {
                Text("\(min(unmatchedInventoryCount, 99))")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.white)
                    .monospacedDigit()
                    .frame(minWidth: 20, minHeight: 20)
                    .padding(.horizontal, unmatchedInventoryCount > 9 ? 4 : 0)
                    .background(TableUpTheme.warningRed)
                    .clipShape(Capsule())
                    .overlay(
                        Capsule()
                            .stroke(Color.white.opacity(0.72), lineWidth: 1)
                    )
                    .offset(x: 4, y: -4)
            }
        }
    }
    
    private var basketMenu: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("收纳食材")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(TableUpTheme.inkText)
                    Text("选择一种方式添加")
                        .font(.footnote)
                        .foregroundStyle(TableUpTheme.mutedText)
                }
                
                Spacer()
                
                Button {
                    withAnimation(.easeInOut(duration: 0.18)) {
                        showingBasketMenu = false
                    }
                } label: {
                    Image(systemName: "xmark")
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(TableUpTheme.inkText.opacity(0.84))
                        .frame(width: 30, height: 30)
                        .background(Color.white.opacity(0.08))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
            .padding(.bottom, 18)
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                basketMenuButton(title: "拍照识别", subtitle: "打开相机识别", icon: "camera.fill", mode: .camera)
                basketMenuButton(title: "相册自选", subtitle: "从照片选择", icon: "photo.on.rectangle", mode: .photoLibrary)
                basketMenuButton(title: "手动录入", subtitle: "直接填写保存", icon: "pencil", mode: .manual)
                basketMenuButton(title: "语音输入", subtitle: "听写食材名称", icon: "mic.fill", mode: .voice)
            }
        }
        .padding(18)
        .background(.ultraThinMaterial.opacity(0.92))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.18), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.34), radius: 22, y: 14)
    }
    
    private func basketMenuButton(title: String, subtitle: String, icon: String, mode: FoodEntryMode) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.18)) {
                showingBasketMenu = false
            }
            activeFoodEntryMode = mode
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: icon)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(TableUpTheme.softOrange)
                    .frame(width: 38, height: 38)
                    .background(TableUpTheme.softOrange.opacity(0.14))
                    .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(TableUpTheme.inkText)
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(TableUpTheme.mutedText)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 116, alignment: .topLeading)
            .padding(14)
            .background(Color.black.opacity(0.18))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
    }
    
    private var overview: some View {
        VStack(spacing: 12) {
            HStack(spacing: 14) {
                overviewMetric(value: "\(ingredients.count)", label: "食材总数")
                Divider().overlay(Color.white.opacity(0.12))
                overviewMetric(value: "\(expiringSoonCount)", label: "即将过期")
            }
            .frame(height: 58)
            
            HStack(spacing: 10) {
                locationMiniMetric(.fridge)
                locationMiniMetric(.freezer)
                locationMiniMetric(.room)
            }
            .frame(height: 62)
        }
        .padding(14)
        .background(Color.black.opacity(0.46))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(TableUpTheme.cardStroke, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.22), radius: 18, y: 12)
    }
    
    private func overviewMetric(value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundStyle(TableUpTheme.mutedText)
            Text(value)
                .font(.system(size: 30, weight: .semibold, design: .rounded))
                .foregroundStyle(TableUpTheme.inkText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    private func locationMiniMetric(_ filter: YouliaoLocationFilter) -> some View {
        VStack(spacing: 4) {
            Image(systemName: filter.icon)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(TableUpTheme.softOrange)
            Text(filter.shortTitle(language: appLanguage))
                .font(.caption2)
                .foregroundStyle(TableUpTheme.mutedText)
            Text("\(ingredients.filter { filter.includes($0.location) }.count)")
                .font(.caption.weight(.semibold))
                .foregroundStyle(TableUpTheme.inkText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
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
    
    private var inventorySectionHeader: some View {
        HStack {
            Text("库存")
                .font(.title3.weight(.semibold))
                .foregroundStyle(TableUpTheme.inkText)
            Spacer()
            Button(role: .destructive) {
                showingClearConfirmation = true
            } label: {
                Label(L.text("Clear All", language: appLanguage), systemImage: "trash")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(TableUpTheme.warningRed)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 6)
                    .background(TableUpTheme.warningRed.opacity(0.14))
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .disabled(ingredients.isEmpty)
            .accessibilityLabel(L.text("Clear All", language: appLanguage))

            Text("\(filteredIngredients.count) 种")
                .font(.caption.weight(.semibold))
                .foregroundStyle(TableUpTheme.softOrange)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(TableUpTheme.softOrange.opacity(0.14))
                .clipShape(Capsule())
        }
        .padding(.top, 4)
    }

    @ViewBuilder
    private var inventoryList: some View {
        if filteredIngredients.isEmpty {
            List {
                HStack(spacing: 12) {
                    Image(systemName: "takeoutbag.and.cup.and.straw")
                        .font(.title2)
                        .foregroundStyle(TableUpTheme.mutedText)
                        .frame(width: 42, height: 42)
                        .background(Color.white.opacity(0.055))
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("还没有食材")
                            .font(.headline)
                            .foregroundStyle(TableUpTheme.inkText)
                        Text("拍照或手动添加后会显示在这里")
                            .font(.footnote)
                            .foregroundStyle(TableUpTheme.mutedText)
                    }
                    
                    Spacer()
                }
                .frame(maxWidth: .infinity)
                .padding(14)
                .background(TableUpTheme.card)
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .scrollIndicators(.hidden)
            .background(Color.clear)
        } else {
            List {
                ForEach(filteredIngredients) { ingredient in
                    NavigationLink {
                        IngredientDetailView(ingredient: ingredient)
                    } label: {
                        YouliaoIngredientRow(ingredient: ingredient)
                    }
                    .buttonStyle(.plain)
                    .listRowInsets(EdgeInsets(top: 5, leading: 0, bottom: 5, trailing: 0))
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            deleteIngredient(ingredient)
                        } label: {
                            Label(L.text("Delete", language: appLanguage), systemImage: "trash")
                        }
                    }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .scrollIndicators(.hidden)
            .background(Color.clear)
        }
    }
    
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

    private func deleteIngredient(_ ingredient: StoredIngredient) {
        withAnimation(.easeInOut(duration: 0.18)) {
            modelContext.delete(ingredient)
            try? modelContext.save()
        }
    }

    private func clearAllIngredients() {
        withAnimation(.easeInOut(duration: 0.18)) {
            ingredients.forEach(modelContext.delete)
            try? modelContext.save()
        }
    }

    private func isExpiringSoon(_ ingredient: StoredIngredient) -> Bool {
        let days = Calendar.current.dateComponents(
            [.day],
            from: Calendar.current.startOfDay(for: .now),
            to: Calendar.current.startOfDay(for: ingredient.expireDate)
        ).day ?? 0
        return days >= 0 && days <= expirationReminderDays
    }
}

private enum FoodEntryMode: String, Identifiable {
    case camera
    case photoLibrary
    case manual
    case voice

    var id: String { rawValue }
}

private struct PhotoIngredientCaptureSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    let launchMode: ScanLaunchMode
    @State private var capturedImageData: Data?
    @State private var detectedItems: [DetectedIngredient] = []
    @State private var showingCamera = false
    @State private var showingPhotoLibrary = false
    @State private var showingDetectedItems = false
    @State private var isExtracting = false
    @State private var didLaunchPicker = false
    @State private var alert: ScanAlertMessage?

    var body: some View {
        ZStack {
            TableUpTheme.background.ignoresSafeArea()

            VStack(spacing: 12) {
                ProgressView()
                    .tint(TableUpTheme.softOrange)
                Text(isExtracting ? "正在识别食材" : "正在打开")
                    .font(.headline)
                    .foregroundStyle(TableUpTheme.inkText)
                Text(launchMode == .camera ? "相机" : "相册")
                    .font(.footnote)
                    .foregroundStyle(TableUpTheme.mutedText)
            }
        }
        .onAppear {
            launchPickerIfNeeded()
        }
        .sheet(isPresented: $showingCamera, onDismiss: handlePickerDismiss) {
            ImagePicker(sourceType: .camera, imageData: $capturedImageData)
                .ignoresSafeArea()
        }
        .sheet(isPresented: $showingPhotoLibrary, onDismiss: handlePickerDismiss) {
            ImagePicker(sourceType: .photoLibrary, imageData: $capturedImageData)
                .ignoresSafeArea()
        }
        .sheet(isPresented: $showingDetectedItems) {
            DetectedItemsReviewView(items: $detectedItems) {
                let result = await saveDetectedItems()
                if result.didSave {
                    showingDetectedItems = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                        alert = result.alert
                    }
                } else {
                    alert = result.alert
                }
            }
        }
        .alert(item: $alert) { alert in
            Alert(
                title: Text(L.text(alert.title, language: appLanguage)),
                message: Text(alert.message),
                dismissButton: .default(Text(L.text("OK", language: appLanguage))) {
                    if alert.title == "Saved" {
                        dismiss()
                    }
                }
            )
        }
        .onChange(of: capturedImageData) { _, newValue in
            guard let newValue else { return }
            Task {
                await extract(imageData: newValue)
            }
        }
    }

    private func launchPickerIfNeeded() {
        guard !didLaunchPicker else { return }
        didLaunchPicker = true
        DispatchQueue.main.async {
            switch launchMode {
            case .standard:
                showingPhotoLibrary = true
            case .camera:
                if UIImagePickerController.isSourceTypeAvailable(.camera) {
                    showingCamera = true
                } else {
                    showingPhotoLibrary = true
                }
            case .photoLibrary:
                showingPhotoLibrary = true
            }
        }
    }

    private func handlePickerDismiss() {
        guard capturedImageData == nil, !isExtracting, detectedItems.isEmpty else { return }
        dismiss()
    }

    private func extract(imageData: Data) async {
        isExtracting = true
        do {
            let response = try await GroceryPhotoExtractor().extract(from: [imageData], language: appLanguage)
            detectedItems = response.items.map(\.detectedIngredient)
            if detectedItems.isEmpty {
                alert = ScanAlertMessage(title: "Extraction failed", message: "No ingredients found. Try another photo.")
            } else {
                showingDetectedItems = true
            }
        } catch {
            alert = ScanAlertMessage(title: "Extraction failed", message: error.localizedDescription)
        }
        isExtracting = false
    }

    private func saveDetectedItems() async -> ReviewSaveResult {
        do {
            let result = try await InventoryStore.save(detectedItems.map(\.ingredientInput), sourceContext: modelContext)
            detectedItems = []
            capturedImageData = nil
            return ReviewSaveResult(
                didSave: true,
                alert: ScanAlertMessage(
                    title: "Saved",
                    message: SaveConfirmation(
                        items: result.savedNames,
                        inventoryCount: result.inventoryCount,
                        language: appLanguage
                    ).message
                )
            )
        } catch {
            return ReviewSaveResult(
                didSave: false,
                alert: ScanAlertMessage(title: "Save failed", message: error.localizedDescription)
            )
        }
    }
}

private struct ManualIngredientEntrySheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @State private var alert: ScanAlertMessage?

    var body: some View {
        NavigationStack {
            ScrollView {
                ManualIngredientForm { input in
                    await save(input)
                }
                .padding()
            }
            .scrollDismissesKeyboard(.interactively)
            .dismissKeyboardOnTap()
            .navigationTitle("手动录入")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L.text("Cancel", language: appLanguage)) {
                        dismiss()
                    }
                }
            }
            .alert(item: $alert) { alert in
                Alert(
                    title: Text(L.text(alert.title, language: appLanguage)),
                    message: Text(alert.message),
                    dismissButton: .default(Text(L.text("OK", language: appLanguage)))
                )
            }
        }
    }

    private func save(_ input: IngredientInput) async -> Bool {
        do {
            let result = try await InventoryStore.save([input], sourceContext: modelContext)
            alert = ScanAlertMessage(
                title: "Saved",
                message: SaveConfirmation(
                    items: result.savedNames,
                    inventoryCount: result.inventoryCount,
                    language: appLanguage
                ).message
            )
            return true
        } catch {
            alert = ScanAlertMessage(title: "Save failed", message: error.localizedDescription)
            return false
        }
    }
}

private struct VoiceIngredientEntrySheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.english.rawValue
    @StateObject private var speechRecognizer = VoiceIngredientRecognizer()
    @FocusState private var isInputFocused: Bool
    @State private var transcript = ""
    @State private var isSaving = false
    @State private var alert: ScanAlertMessage?

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("说出食材")
                        .font(.title3.weight(.semibold))
                    Text("点击录音后说出食材，可以用逗号、顿号或停顿分开多个食材。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Button {
                    toggleRecording()
                } label: {
                    Label(
                        speechRecognizer.isRecording ? "停止录音" : "开始录音",
                        systemImage: speechRecognizer.isRecording ? "stop.circle.fill" : "mic.circle.fill"
                    )
                    .font(.headline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(speechRecognizer.isRecording ? .red : .orange)

                if !speechRecognizer.statusMessage.isEmpty {
                    Text(speechRecognizer.statusMessage)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                TextEditor(text: $transcript)
                    .focused($isInputFocused)
                    .frame(minHeight: 180)
                    .padding(10)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(Color.secondary.opacity(0.16), lineWidth: 1)
                    )

                Button {
                    Task { await saveTranscript() }
                } label: {
                    Label(isSaving ? L.text("Saving...", language: appLanguage) : L.text("Save item", language: appLanguage), systemImage: "mic.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
                .disabled(isSaving || parsedIngredientNames.isEmpty)

                Spacer()
            }
            .padding()
            .navigationTitle("语音输入")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L.text("Cancel", language: appLanguage)) {
                        dismiss()
                    }
                }
            }
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                    isInputFocused = true
                }
            }
            .onDisappear {
                speechRecognizer.stopRecording()
            }
            .onChange(of: speechRecognizer.transcript) { _, newValue in
                guard !newValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
                transcript = newValue
            }
            .alert(item: $alert) { alert in
                Alert(
                    title: Text(L.text(alert.title, language: appLanguage)),
                    message: Text(alert.message),
                    dismissButton: .default(Text(L.text("OK", language: appLanguage)))
                )
            }
        }
    }

    private func toggleRecording() {
        if speechRecognizer.isRecording {
            speechRecognizer.stopRecording()
        } else {
            isInputFocused = false
            speechRecognizer.startRecording(language: appLanguage)
        }
    }

    private var parsedIngredientNames: [String] {
        transcript
            .components(separatedBy: CharacterSet(charactersIn: ",，、\n"))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    private func saveTranscript() async {
        let inputs = parsedIngredientNames.map {
            IngredientInput(
                name: $0,
                quantity: 1,
                unit: "piece",
                category: .other,
                location: .fridge
            )
        }
        guard !inputs.isEmpty else { return }

        isSaving = true
        defer { isSaving = false }

        do {
            let result = try await InventoryStore.save(inputs, sourceContext: modelContext)
            transcript = ""
            speechRecognizer.transcript = ""
            alert = ScanAlertMessage(
                title: "Saved",
                message: SaveConfirmation(
                    items: result.savedNames,
                    inventoryCount: result.inventoryCount,
                    language: appLanguage
                ).message
            )
        } catch {
            alert = ScanAlertMessage(title: "Save failed", message: error.localizedDescription)
        }
    }
}

final class VoiceIngredientRecognizer: NSObject, ObservableObject {
    @Published var transcript = ""
    @Published var isRecording = false
    @Published var statusMessage = ""

    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var speechRecognizer: SFSpeechRecognizer?

    func startRecording(language: String) {
        if isRecording {
            stopRecording()
            return
        }

        let localeIdentifier = language == AppLanguage.chinese.rawValue ? "zh-CN" : "en-US"
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier))
        guard let speechRecognizer, speechRecognizer.isAvailable else {
            statusMessage = "语音识别暂时不可用"
            return
        }

        SFSpeechRecognizer.requestAuthorization { [weak self] speechStatus in
            let handleMicrophonePermission: (Bool) -> Void = { microphoneAllowed in
                DispatchQueue.main.async {
                    guard let self else { return }
                    guard speechStatus == .authorized, microphoneAllowed else {
                        self.statusMessage = "请在系统设置里允许语音识别和麦克风权限"
                        return
                    }
                    self.beginRecognition(with: speechRecognizer)
                }
            }

            if #available(iOS 17.0, *) {
                AVAudioApplication.requestRecordPermission(completionHandler: handleMicrophonePermission)
            } else {
                AVAudioSession.sharedInstance().requestRecordPermission(handleMicrophonePermission)
            }
        }
    }

    func stopRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
        isRecording = false
        statusMessage = transcript.isEmpty ? "" : "识别完成，可编辑后保存"
    }

    private func beginRecognition(with speechRecognizer: SFSpeechRecognizer) {
        recognitionTask?.cancel()
        recognitionTask = nil

        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            statusMessage = "无法启动麦克风：\(error.localizedDescription)"
            return
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        recognitionRequest = request

        let inputNode = audioEngine.inputNode
        inputNode.removeTap(onBus: 0)

        recognitionTask = speechRecognizer.recognitionTask(with: request) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self else { return }
                if let result {
                    self.transcript = result.bestTranscription.formattedString
                    self.statusMessage = result.isFinal ? "识别完成，可编辑后保存" : "正在识别..."
                }

                if let error {
                    self.statusMessage = "识别停止：\(error.localizedDescription)"
                    self.stopRecording()
                }
            }
        }

        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            request.append(buffer)
        }

        do {
            audioEngine.prepare()
            try audioEngine.start()
            isRecording = true
            statusMessage = "正在听..."
        } catch {
            statusMessage = "录音启动失败：\(error.localizedDescription)"
            stopRecording()
        }
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
                    .foregroundStyle(isUnmatched ? TableUpTheme.warningRed : TableUpTheme.inkText)
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

    private var isUnmatched: Bool {
        ingredient.canonicalIngredientId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}

private enum YouliaoLocationFilter: String, CaseIterable, Identifiable {
    case all
    case expiringSoon
    case fridge
    case freezer
    case room
    
    var id: String { rawValue }
    
    var icon: String {
        switch self {
        case .all: return "square.grid.2x2"
        case .expiringSoon: return "clock.badge.exclamationmark"
        case .fridge: return "refrigerator"
        case .freezer: return "snowflake"
        case .room: return "cabinet"
        }
    }
    
    func includes(_ location: StorageLocation) -> Bool {
        switch self {
        case .all:
            return true
        case .expiringSoon:
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
        case .expiringSoon: return "快过期"
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
    @State private var showingCookPanel = false
    
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
        GeometryReader { proxy in
            NavigationStack {
                let width = proxy.size.width
                let height = proxy.size.height
                
                ZStack(alignment: .top) {
                    Image("TableUpKaifanSceneBackground")
                        .resizable()
                        .scaledToFill()
                        .frame(width: width, height: height)
                        .clipped()
                        .overlay(
                            LinearGradient(
                                colors: [
                                    Color.clear,
                                    Color.clear,
                                    Color.black.opacity(0.10)
                                ],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .allowsHitTesting(false)
                    
                    Button {
                        showingRecipes = true
                    } label: {
                        Rectangle()
                            .fill(Color.white.opacity(0.001))
                            .contentShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .frame(width: width * 0.48, height: height * 0.22)
                    .position(x: width * 0.26, y: height * 0.71)
                    .zIndex(3)
                    .accessibilityLabel("食谱")
                    
                    Button {
                        withAnimation(.easeInOut(duration: 0.18)) {
                            showingCookPanel.toggle()
                        }
                    } label: {
                        Rectangle()
                            .fill(Color.white.opacity(0.001))
                            .contentShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .frame(width: width * 0.60, height: height * 0.20)
                    .position(x: width * 0.67, y: height * 0.84)
                    .zIndex(3)
                    .accessibilityLabel("可制作")
                }
                .frame(width: width, height: height, alignment: .top)
                .clipped()
                .ignoresSafeArea()
                .navigationBarTitleDisplayMode(.inline)
                .navigationBarHidden(true)
                .toolbar(.hidden, for: .navigationBar)
                .sheet(isPresented: $showingRecipes) {
                    RecipesView()
                }
                .sheet(isPresented: $showingCookPanel) {
                    NavigationStack {
                        GeometryReader { sheetProxy in
                            cookRecommendationsOverlay(width: sheetProxy.size.width, height: sheetProxy.size.height)
                        }
                    }
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
                }
            }
            .frame(width: proxy.size.width, height: proxy.size.height, alignment: .topLeading)
            .ignoresSafeArea()
            .toolbar(.hidden, for: .navigationBar)
            .toolbarBackground(.hidden, for: .navigationBar)
            .navigationBarHidden(true)
        }
    }

    private func cookRecommendationsOverlay(width: CGFloat, height: CGFloat) -> some View {
        ZStack(alignment: .top) {
            Color(red: 0.22, green: 0.13, blue: 0.06)
                .ignoresSafeArea()

            Image("TableUpCanCookSceneBackground")
                .resizable()
                .scaledToFill()
                .frame(width: width, height: height + 96, alignment: .top)
                .offset(y: -48)
                .clipped()
                .overlay(
                    LinearGradient(
                        colors: [
                            Color.black.opacity(0.12),
                            Color.black.opacity(0.02),
                            Color(red: 0.48, green: 0.25, blue: 0.09).opacity(0.70)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: width, height: height, alignment: .top)
                .allowsHitTesting(false)

            ScrollView {
                VStack(spacing: 0) {
                    cookHero(width: width, height: height)
                    cookFilterShelf
                        .padding(.horizontal, 24)
                        .padding(.top, -28)
                    recommendationPaper
                        .padding(.horizontal, 18)
                        .padding(.top, 12)
                }
                .padding(.bottom, 28)
            }
            .scrollIndicators(.hidden)

        }
        .frame(width: width, height: height)
        .ignoresSafeArea()
    }

    private func cookHero(width: CGFloat, height: CGFloat) -> some View {
        Spacer(minLength: 0)
        .frame(width: width, height: min(height * 0.47, 430), alignment: .topLeading)
    }

    private func heroCircleButton(icon: String) -> some View {
        Button {
        } label: {
            Image(systemName: icon)
                .font(.title3.weight(.semibold))
                .foregroundStyle(Color.black.opacity(0.78))
                .frame(width: 52, height: 52)
                .background(Color(red: 0.98, green: 0.91, blue: 0.80).opacity(0.92))
                .clipShape(Circle())
                .shadow(color: .black.opacity(0.18), radius: 14, y: 8)
        }
        .buttonStyle(.plain)
    }

    private var cookFilterShelf: some View {
        HStack(spacing: 0) {
            cookFilterButton(.ready, icon: "checkmark.circle.fill", value: readyCount)
            Divider()
                .frame(height: 54)
                .overlay(Color.black.opacity(0.08))
            cookFilterButton(.almost, icon: "basket.fill", value: almostCount)
            Divider()
                .frame(height: 54)
                .overlay(Color.black.opacity(0.08))
            cookFilterButton(.favorite, icon: "star.fill", value: 0)

            Button {
                selectedFilter = .recommended
                Task { await refreshCloudMatches() }
            } label: {
                VStack(spacing: 6) {
                    if isRefreshing {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "bowl.fill")
                            .font(.title2.weight(.semibold))
                    }
                    Text("今日推荐")
                        .font(.headline.weight(.semibold))
                }
                .foregroundStyle(.white)
                .frame(width: 118, height: 92)
                .background(
                    LinearGradient(
                        colors: [TableUpTheme.softOrange, TableUpTheme.orange],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                .shadow(color: TableUpTheme.orange.opacity(0.28), radius: 18, y: 8)
            }
            .buttonStyle(.plain)
            .disabled(isRefreshing)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(Color(red: 1.0, green: 0.94, blue: 0.84).opacity(0.94))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(Color.white.opacity(0.58), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.18), radius: 24, y: 12)
    }

    private func cookFilterButton(_ filter: KaifanFilter, icon: String, value: Int) -> some View {
        Button {
            selectedFilter = filter
        } label: {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(selectedFilter == filter ? TableUpTheme.orange : Color(red: 0.31, green: 0.21, blue: 0.12))
                Text(filter.title(language: appLanguage))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color(red: 0.22, green: 0.15, blue: 0.09))
                HStack(spacing: 2) {
                    Text("\(value)")
                        .foregroundStyle(value == 0 ? Color.black.opacity(0.38) : TableUpTheme.orange)
                    Text("道")
                        .foregroundStyle(Color.black.opacity(0.34))
                }
                .font(.footnote.weight(.medium))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 90)
        }
        .buttonStyle(.plain)
    }

    private var recommendationPaper: some View {
        VStack(alignment: .leading, spacing: 18) {
            if isRefreshing {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }

            if let matchError {
                Text(matchError)
                    .font(.footnote)
                    .foregroundStyle(Color(red: 0.50, green: 0.25, blue: 0.12))
            }

            if let featured = featuredRecommendation {
                featuredRecommendationCard(featured)
            } else {
                emptyState
            }

            HStack {
                Text("为你推荐")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Color(red: 0.20, green: 0.13, blue: 0.08))
                Spacer()
                Button {
                    Task { await refreshCloudMatches() }
                } label: {
                    HStack(spacing: 6) {
                        Text("换一换")
                        Image(systemName: "arrow.clockwise")
                    }
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(Color.black.opacity(0.48))
                }
                .buttonStyle(.plain)
                .disabled(isRefreshing)
            }

            recommendationRows
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(Color(red: 1.0, green: 0.94, blue: 0.83).opacity(0.96))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .stroke(Color.white.opacity(0.48), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.20), radius: 24, y: 14)
    }

    private var recommendationRows: some View {
        LazyVStack(spacing: 12) {
            if useCloudMatches {
                ForEach(Array(cloudFilteredMatches.dropFirst()), id: \.recipeID) { match in
                    cloudRecommendationRow(match)
                }
            } else {
                ForEach(Array(localFilteredAssessments.dropFirst()), id: \.recipe.id) { assessment in
                    NavigationLink {
                        RecipeDetailView(recipe: assessment.recipe, assessment: assessment)
                    } label: {
                        recommendationRow(
                            title: assessment.recipe.name,
                            imageData: assessment.recipe.imageThumbnailData ?? assessment.recipe.imageData,
                            matchPercent: Int((assessment.matchRatio * 100).rounded()),
                            time: assessment.recipe.totalTimeMinutes,
                            missing: assessment.missing.map(\.name),
                            isReady: assessment.matchRatio >= threshold,
                            ingredientNames: assessment.recipe.ingredients.map(\.name)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func cloudRecommendationRow(_ match: CloudRecipeMatch) -> some View {
        let recipe = localRecipe(for: match)
        return Group {
            if let recipe {
                NavigationLink {
                    RecipeDetailView(recipe: recipe, cloudMatch: match)
                } label: {
                    recommendationRow(
                        title: match.recipeName,
                        imageData: recipe.imageThumbnailData ?? recipe.imageData,
                        matchPercent: Int(match.matchScorePercent.rounded()),
                        time: recipe.totalTimeMinutes,
                        missing: match.missingRequiredIngredients.map(\.recipeIngredient),
                        isReady: match.matchRatio >= threshold,
                        ingredientNames: recipe.ingredients.map(\.name)
                    )
                }
                .buttonStyle(.plain)
            } else {
                NavigationLink {
                    CloudOnlyRecipeMatchDetailView(match: match)
                } label: {
                    recommendationRow(
                        title: match.recipeName,
                        imageData: nil,
                        matchPercent: Int(match.matchScorePercent.rounded()),
                        time: nil,
                        missing: match.missingRequiredIngredients.map(\.recipeIngredient),
                        isReady: match.matchRatio >= threshold,
                        ingredientNames: match.matchedIngredients.map(\.recipeIngredient)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var featuredRecommendation: KaifanRecommendationItem? {
        if useCloudMatches, let match = cloudFilteredMatches.first {
            let recipe = localRecipe(for: match)
            return KaifanRecommendationItem(
                title: match.recipeName,
                imageData: recipe?.imageThumbnailData ?? recipe?.imageData,
                matchPercent: Int(match.matchScorePercent.rounded()),
                totalTimeMinutes: recipe?.totalTimeMinutes,
                difficulty: recipe?.difficulty,
                missing: match.missingRequiredIngredients.map(\.recipeIngredient),
                ingredientNames: recipe?.ingredients.map(\.name) ?? match.matchedIngredients.map(\.recipeIngredient),
                recipe: recipe,
                cloudMatch: match
            )
        }

        guard let assessment = localFilteredAssessments.first else { return nil }
        return KaifanRecommendationItem(
            title: assessment.recipe.name,
            imageData: assessment.recipe.imageThumbnailData ?? assessment.recipe.imageData,
            matchPercent: Int((assessment.matchRatio * 100).rounded()),
            totalTimeMinutes: assessment.recipe.totalTimeMinutes,
            difficulty: assessment.recipe.difficulty,
            missing: assessment.missing.map(\.name),
            ingredientNames: assessment.recipe.ingredients.map(\.name),
            recipe: assessment.recipe,
            assessment: assessment
        )
    }

    private func featuredRecommendationCard(_ item: KaifanRecommendationItem) -> some View {
        Group {
            if let recipe = item.recipe, let cloudMatch = item.cloudMatch {
                NavigationLink {
                    RecipeDetailView(recipe: recipe, cloudMatch: cloudMatch)
                } label: {
                    featuredRecommendationContent(item)
                }
                .buttonStyle(.plain)
            } else if let recipe = item.recipe, let assessment = item.assessment {
                NavigationLink {
                    RecipeDetailView(recipe: recipe, assessment: assessment)
                } label: {
                    featuredRecommendationContent(item)
                }
                .buttonStyle(.plain)
            } else if let cloudMatch = item.cloudMatch {
                NavigationLink {
                    CloudOnlyRecipeMatchDetailView(match: cloudMatch)
                } label: {
                    featuredRecommendationContent(item)
                }
                .buttonStyle(.plain)
            } else {
                featuredRecommendationContent(item)
            }
        }
    }

    private func featuredRecommendationContent(_ item: KaifanRecommendationItem) -> some View {
        HStack(alignment: .top, spacing: 16) {
            kaifanFoodImage(imageData: item.imageData, width: 154, height: 128, cornerRadius: 18)

            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(item.title)
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(Color(red: 0.19, green: 0.12, blue: 0.08))
                        .lineLimit(2)

                    Text(item.missing.isEmpty ? "可做" : "差一点")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(item.missing.isEmpty ? Color(red: 0.30, green: 0.50, blue: 0.12) : TableUpTheme.orange)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 5)
                        .background((item.missing.isEmpty ? Color.green : Color.orange).opacity(0.12))
                        .clipShape(Capsule())
                }

                HStack(spacing: 10) {
                    if let totalTimeMinutes = item.totalTimeMinutes, totalTimeMinutes > 0 {
                        Label("\(totalTimeMinutes) 分钟", systemImage: "clock")
                    }
                    if let difficulty = item.difficulty {
                        Text(difficulty.displayName(language: appLanguage))
                    }
                    Text("\(item.matchPercent)%")
                }
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Color.black.opacity(0.48))

                Text(item.missing.isEmpty ? "家里食材已经满足，今天可以直接开做。" : "还缺 \(item.missing.prefix(2).joined(separator: "、"))，补一点就能开做。")
                    .font(.subheadline)
                    .foregroundStyle(Color.black.opacity(0.60))
                    .lineLimit(2)

                ingredientBubbleRow(item.ingredientNames)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(14)
        .background(Color.white.opacity(0.34))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private func recommendationRow(
        title: String,
        imageData: Data?,
        matchPercent: Int,
        time: Int?,
        missing: [String],
        isReady: Bool,
        ingredientNames: [String]
    ) -> some View {
        HStack(spacing: 14) {
            kaifanFoodImage(imageData: imageData, width: 112, height: 86, cornerRadius: 16)

            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(Color(red: 0.19, green: 0.12, blue: 0.08))
                    .lineLimit(1)

                HStack(spacing: 8) {
                    if let time, time > 0 {
                        Text("\(time) 分钟")
                    }
                    Text("\(matchPercent)%")
                    if !missing.isEmpty {
                        Text("缺 \(missing.prefix(1).joined())")
                    }
                }
                .font(.subheadline)
                .foregroundStyle(Color.black.opacity(0.50))

                ingredientBubbleRow(ingredientNames)
            }

            Spacer(minLength: 6)

            VStack(spacing: 10) {
                Text(isReady ? "✓ 可做" : "差一点")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(isReady ? Color(red: 0.30, green: 0.50, blue: 0.12) : TableUpTheme.orange)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background((isReady ? Color.green : Color.orange).opacity(0.14))
                    .clipShape(Capsule())

                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Color.black.opacity(0.30))
            }
        }
        .padding(12)
        .background(Color.white.opacity(0.24))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(Color.black.opacity(0.05), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private func kaifanFoodImage(imageData: Data?, width: CGFloat, height: CGFloat, cornerRadius: CGFloat) -> some View {
        Group {
            if let imageData, let image = UIImage(data: imageData) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                ZStack {
                    Color(red: 0.91, green: 0.76, blue: 0.55)
                    Image(systemName: "fork.knife")
                        .font(.title2)
                        .foregroundStyle(Color.white.opacity(0.86))
                }
            }
        }
        .frame(width: width, height: height)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }

    private func ingredientBubbleRow(_ names: [String]) -> some View {
        HStack(spacing: 7) {
            ForEach(Array(names.prefix(3).enumerated()), id: \.offset) { _, name in
                Text(String(name.prefix(1)))
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color(red: 0.36, green: 0.22, blue: 0.10))
                    .frame(width: 28, height: 28)
                    .background(Color(red: 0.92, green: 0.82, blue: 0.66).opacity(0.72))
                    .clipShape(Circle())
            }

            if names.count > 3 {
                Text("...")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.black.opacity(0.48))
                    .frame(width: 28, height: 28)
                    .background(Color.black.opacity(0.06))
                    .clipShape(Circle())
            }
        }
    }

    private var cookBoardPanel: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("菜板")
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(Color.black.opacity(0.82))
                    Text("按家里的食材，看看今天能做什么")
                        .font(.footnote)
                        .foregroundStyle(Color.black.opacity(0.48))
                }
                
                Spacer()
                
                Button {
                    withAnimation(.easeInOut(duration: 0.18)) {
                        showingCookPanel = false
                    }
                } label: {
                    Image(systemName: "xmark")
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(Color.black.opacity(0.62))
                        .frame(width: 30, height: 30)
                        .background(Color.black.opacity(0.06))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
            
            matchRecipeButton
            
            kaifanFilterPanel
            
            matchHeader
            
            ScrollView {
                content
                    .padding(.bottom, 18)
            }
            .frame(maxHeight: 420)
            .scrollIndicators(.hidden)
        }
        .padding(18)
        .background(.ultraThinMaterial.opacity(0.94))
        .overlay(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(Color.white.opacity(0.62), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
        .shadow(color: .black.opacity(0.18), radius: 24, y: 12)
    }
    
    private func kaifanFullBleedBackground(width: CGFloat, height: CGFloat) -> some View {
        let imageHeight = min(670, height * 0.72)
        
        return ZStack {
            Color(red: 0.96, green: 0.93, blue: 0.88)
                .ignoresSafeArea()
            
            Image("TableUpMealBackground")
                .resizable()
                .scaledToFill()
                .frame(width: width, height: imageHeight)
                .clipped()
                .frame(width: width, height: height, alignment: .top)
            
            LinearGradient(
                colors: [
                    Color.white.opacity(0.20),
                    Color.white.opacity(0.00),
                    Color.white.opacity(0.16)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            LinearGradient(
                colors: [
                    Color.clear,
                    Color.clear,
                    Color(red: 0.96, green: 0.93, blue: 0.88).opacity(0.62)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        }
        .frame(width: width, height: height)
    }

    private var featuredRecipe: Recipe? {
        recipes.first { $0.imageThumbnailData != nil || $0.imageData != nil } ?? recipes.first
    }
    
    private var kaifanTitle: some View {
        HStack(alignment: .top, spacing: 22) {
            Text("开\n饭")
                .font(.system(size: 62, weight: .regular, design: .serif))
                .foregroundStyle(Color(red: 0.10, green: 0.09, blue: 0.075))
                .lineSpacing(2)
                .fixedSize()
            
            Text("寻\n好\n味\n·\n开\n一\n席")
                .font(.system(size: 16, weight: .regular, design: .serif))
                .foregroundStyle(Color.black.opacity(0.58))
                .lineSpacing(7)
                .fixedSize()
        }
    }
    
    private var kaifanFilterPanel: some View {
        HStack(spacing: 0) {
            kaifanFilterButton(.ready, icon: "camera.viewfinder", value: readyCount)
            kaifanFilterButton(.almost, icon: "sparkles", value: almostCount)
            kaifanFilterButton(.all, icon: "square.grid.2x2", value: recipes.count)
            kaifanFilterButton(.favorite, icon: "star", value: 0)
        }
        .padding(.vertical, 18)
        .padding(.horizontal, 10)
        .background(.ultraThinMaterial)
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(Color.white.opacity(0.65), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .shadow(color: .black.opacity(0.14), radius: 18, y: 10)
    }

    private func kaifanFilterButton(_ filter: KaifanFilter, icon: String, value: Int) -> some View {
        Button {
            selectedFilter = filter
        } label: {
            VStack(spacing: 7) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(selectedFilter == filter ? TableUpTheme.orange : Color.black.opacity(0.70))
                    .frame(width: 42, height: 42)
                    .background(
                        Circle()
                            .fill(selectedFilter == filter ? TableUpTheme.orange.opacity(0.13) : Color.white.opacity(0.26))
                    )
                
                Text(filter.title(language: appLanguage))
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.black.opacity(0.76))
                
                HStack(spacing: 2) {
                    Text("\(value)")
                        .foregroundStyle(TableUpTheme.orange)
                    Text("道")
                        .foregroundStyle(Color.black.opacity(0.38))
                }
                .font(.caption2.weight(.medium))
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }

    private var matchHeader: some View {
        HStack(spacing: 12) {
            Text("今日推荐")
                .font(.title3.weight(.semibold))
                .foregroundStyle(Color.black.opacity(0.78))
            
            Spacer()
            
            Button {
                Task { await refreshCloudMatches() }
            } label: {
                HStack(spacing: 6) {
                    if isRefreshing {
                        ProgressView()
                            .controlSize(.small)
                            .tint(Color.black.opacity(0.36))
                    } else {
                        Image(systemName: "arrow.clockwise")
                    }
                    Text("换一换")
                }
                .font(.footnote.weight(.medium))
                .foregroundStyle(Color.black.opacity(0.32))
            }
            .buttonStyle(.plain)
            .disabled(isRefreshing)
        }
    }
    
    private var matchRecipeButton: some View {
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
            .padding(.vertical, 13)
            .background(
                LinearGradient(
                    colors: [TableUpTheme.softOrange, TableUpTheme.orange],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(Capsule())
            .shadow(color: TableUpTheme.orange.opacity(0.22), radius: 18, y: 8)
        }
        .buttonStyle(.plain)
        .disabled(isRefreshing)
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

private struct KaifanRecommendationItem {
    let title: String
    let imageData: Data?
    let matchPercent: Int
    let totalTimeMinutes: Int?
    let difficulty: RecipeDifficulty?
    let missing: [String]
    let ingredientNames: [String]
    let recipe: Recipe?
    var assessment: CookAssessment?
    var cloudMatch: CloudRecipeMatch?
}

private struct CloudOnlyRecipeMatchDetailView: View {
    let match: CloudRecipeMatch
    @AppStorage("appLanguage") private var appLanguage = AppLanguage.chinese.rawValue

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 10) {
                    Text(match.recipeName)
                        .font(.largeTitle.weight(.semibold))
                        .foregroundStyle(Color(red: 0.20, green: 0.13, blue: 0.08))

                    Text("\(Int(match.matchScorePercent.rounded()))%")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .background(TableUpTheme.orange)
                        .clipShape(Capsule())
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.bottom, 4)

                cloudMatchSection(
                    title: text("已匹配", "Matched"),
                    items: match.matchedIngredients,
                    icon: "checkmark.circle.fill",
                    color: Color(red: 0.32, green: 0.55, blue: 0.16)
                )

                if !match.highConfidenceSubstitutedIngredients.isEmpty {
                    cloudMatchSection(
                        title: text("替代食材", "Substitutes"),
                        items: match.highConfidenceSubstitutedIngredients,
                        icon: "arrow.triangle.2.circlepath",
                        color: TableUpTheme.orange,
                        showsInventoryName: true
                    )
                }

                if !match.missingRequiredIngredients.isEmpty {
                    cloudMatchSection(
                        title: text("缺少主要食材", "Missing required"),
                        items: match.missingRequiredIngredients,
                        icon: "exclamationmark.circle.fill",
                        color: Color(red: 0.72, green: 0.16, blue: 0.12)
                    )
                }

                if !match.missingOptionalIngredients.isEmpty {
                    cloudMatchSection(
                        title: text("缺少次要食材", "Missing optional"),
                        items: match.missingOptionalIngredients,
                        icon: "minus.circle.fill",
                        color: Color.black.opacity(0.42)
                    )
                }

                if !match.pantryMissing.isEmpty {
                    cloudMatchSection(
                        title: text("缺少调料", "Missing pantry"),
                        items: match.pantryMissing,
                        icon: "leaf.circle.fill",
                        color: Color.black.opacity(0.36)
                    )
                }
            }
            .padding(22)
        }
        .background(Color(red: 0.98, green: 0.93, blue: 0.84))
        .navigationTitle(text("匹配详情", "Match detail"))
        .navigationBarTitleDisplayMode(.inline)
    }

    private func cloudMatchSection(
        title: String,
        items: [CloudRecipeMatchIngredient],
        icon: String,
        color: Color,
        showsInventoryName: Bool = false
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline.weight(.semibold))
                .foregroundStyle(Color(red: 0.20, green: 0.13, blue: 0.08))

            ForEach(items) { item in
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: icon)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(color)
                        .frame(width: 22)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.recipeIngredient)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color(red: 0.22, green: 0.15, blue: 0.10))

                        if showsInventoryName, !item.userInventoryIngredient.isEmpty {
                            Text("\(text("使用", "Use")) \(item.userInventoryIngredient)")
                                .font(.caption)
                                .foregroundStyle(Color.black.opacity(0.52))
                        }

                        if item.matchType == "substitute" {
                            Text("\(text("替代分数", "Substitute score")) \(Int((item.matchScore * 100).rounded()))%")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(TableUpTheme.orange)
                        }
                    }
                }
                .padding(12)
                .background(Color.white.opacity(0.42))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
        }
        .padding(14)
        .background(Color.white.opacity(0.30))
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private func text(_ zh: String, _ en: String) -> String {
        appLanguage == AppLanguage.chinese.rawValue ? zh : en
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
