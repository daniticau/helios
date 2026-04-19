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
    let battery_soc_pct: Int?
    let peak_window_start_iso: String?
    let updated_at_iso: String?
    // True when this entry is the baked-in placeholder — not live data from
    // the phone. The view uses this to avoid rendering a misleading "$0.00"
    // before the main app has ever synced.
    let isPlaceholder: Bool

    enum CodingKeys: String, CodingKey {
        case action, verb, color_hex, expected_hourly_gain_usd
        case retail_rate_now, export_rate_now
        case battery_soc_pct, peak_window_start_iso, updated_at_iso
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
        self.battery_soc_pct = try c.decodeIfPresent(Int.self, forKey: .battery_soc_pct)
        self.peak_window_start_iso = try c.decodeIfPresent(String.self, forKey: .peak_window_start_iso)
        self.updated_at_iso = try c.decodeIfPresent(String.self, forKey: .updated_at_iso)
        self.isPlaceholder = false
    }

    init(date: Date = Date(), action: String, verb: String, color_hex: String,
         gain: Double, retail: Double, export: Double,
         soc: Int? = nil, peakStart: String? = nil,
         updatedAt: String? = nil, isPlaceholder: Bool = false) {
        self.date = date
        self.action = action
        self.verb = verb
        self.color_hex = color_hex
        self.expected_hourly_gain_usd = gain
        self.retail_rate_now = retail
        self.export_rate_now = export
        self.battery_soc_pct = soc
        self.peak_window_start_iso = peakStart
        self.updated_at_iso = updatedAt
        self.isPlaceholder = isPlaceholder
    }

    // First-install state: the main app has never synced, so UserDefaults
    // has no value. Show instructive copy instead of a fake $0.00.
    static let placeholder = LiveEntry(
        action: "HOLD", verb: "Open Helios to sync", color_hex: "#6b7280",
        gain: 0, retail: 0, export: 0, isPlaceholder: true
    )

    static let sample = LiveEntry(
        action: "EXPORT_SOLAR", verb: "Exporting", color_hex: "#60a5fa",
        gain: 1.24, retail: 0.42, export: 0.38,
        soc: 62, peakStart: nil
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
