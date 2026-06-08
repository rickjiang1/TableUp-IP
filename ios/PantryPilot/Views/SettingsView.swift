import SwiftUI

struct SettingsView: View {
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
                Section("Recipe matching") {
                    VStack(alignment: .leading) {
                        Text("Almost cook threshold: \(Int(threshold * 100))%")
                        Slider(value: $threshold, in: 0.5...0.95, step: 0.05)
                    }
                }

                Section("Storage") {
                    Stepper(value: $expirationReminderDays, in: 0...30) {
                        LabeledContent("Expire reminder") {
                            Text("\(expirationReminderDays) days")
                        }
                    }

                    Picker("Cloud storage", selection: $cloudStorageProvider) {
                        ForEach(cloudOptions, id: \.self) { option in
                            Text(option).tag(option)
                        }
                    }
                    Text("Local only is the default. Cloud sync can be added after the local app is stable.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("AI extraction") {
                    Text("AI extraction will call your backend, not OpenAI directly from the app.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
        }
    }
}
