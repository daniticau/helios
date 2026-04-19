import WidgetKit
import Foundation

// MARK: - Shared constants

enum SharedStore {
    static let appGroup = "group.com.helios.app.shared"
    static let key = "live.latest.v1"

    static func load() -> LiveEntry? {
        let defaults = UserDefaults(suiteName: appGroup)
        // ExtensionStorage stores values as strings by default; we serialize as JSON.
        guard let raw = defaults?.string(forKey: key),
              let data = raw.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(LiveEntry.self, from: data)
    }
}

// MARK: - Timeline entry

struct LiveEntry: TimelineEntry, Codable {
    var date: Date
    let action: String
    let verb: String
    let color_hex: String
    let expected_hourly_gain_usd: Double
    let retail_rate_now: Double
    let export_rate_now: Double
    let updated_at_iso: String?

    enum CodingKeys: String, CodingKey {
        case action, verb, color_hex, expected_hourly_gain_usd
        case retail_rate_now, export_rate_now, updated_at_iso
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.date = Date()
        self.action = try c.decodeIfPresent(String.self, forKey: .action) ?? "HOLD"
        self.verb = try c.decodeIfPresent(String.self, forKey: .verb) ?? "Holding"
        self.color_hex = try c.decodeIfPresent(String.self, forKey: .color_hex) ?? "#6b7280"
        self.expected_hourly_gain_usd = try c.decodeIfPresent(Double.self, forKey: .expected_hourly_gain_usd) ?? 0
        self.retail_rate_now = try c.decodeIfPresent(Double.self, forKey: .retail_rate_now) ?? 0
        self.export_rate_now = try c.decodeIfPresent(Double.self, forKey: .export_rate_now) ?? 0
        self.updated_at_iso = try c.decodeIfPresent(String.self, forKey: .updated_at_iso)
    }

    init(date: Date = Date(), action: String, verb: String, color_hex: String,
         gain: Double, retail: Double, export: Double, updatedAt: String? = nil) {
        self.date = date
        self.action = action
        self.verb = verb
        self.color_hex = color_hex
        self.expected_hourly_gain_usd = gain
        self.retail_rate_now = retail
        self.export_rate_now = export
        self.updated_at_iso = updatedAt
    }

    static let placeholder = LiveEntry(
        action: "HOLD", verb: "—", color_hex: "#6b7280",
        gain: 0, retail: 0, export: 0
    )

    static let sample = LiveEntry(
        action: "EXPORT_SOLAR", verb: "Exporting", color_hex: "#60a5fa",
        gain: 1.24, retail: 0.42, export: 0.38
    )
}

// MARK: - Timeline provider

struct HeliosProvider: TimelineProvider {
    func placeholder(in context: Context) -> LiveEntry {
        LiveEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (LiveEntry) -> Void) {
        completion(SharedStore.load() ?? LiveEntry.sample)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LiveEntry>) -> Void) {
        let entry = SharedStore.load() ?? LiveEntry.placeholder
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}
