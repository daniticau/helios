import SwiftUI
import WidgetKit

struct WidgetViewSmall: View {
    let entry: LiveEntry

    private var accent: Color { Color(hex: entry.color_hex) }

    // Actions where the user is earning by pushing to the grid. For these
    // the hero rate is the export rate — the $/kWh they're selling at.
    // Everything else leads with retail because the user is either saving
    // retail (self-consume, discharge-to-house) or spending retail to
    // charge off-peak. HOLD falls out of the switch and renders the
    // side-by-side pair via `ratePair` below.
    private static let exportActions: Set<String> = [
        "EXPORT_SOLAR",
        "DISCHARGE_BATTERY_TO_GRID",
    ]

    private var heroLeadsExport: Bool {
        Self.exportActions.contains(entry.action)
    }

    private var heroRate: Double {
        heroLeadsExport ? entry.export_rate_now : entry.retail_rate_now
    }

    private var compareRate: Double {
        heroLeadsExport ? entry.retail_rate_now : entry.export_rate_now
    }

    private var heroRateString: String {
        String(format: "$%.2f", heroRate)
    }

    // "↗ vs retail +$0.04" / "↘ vs retail −$0.04". Nil when we don't
    // have a meaningful comparator (e.g. one of the rates is zero from a
    // degraded fetch).
    private var deltaLine: String? {
        // HOLD and placeholder rows show the side-by-side pair instead.
        if entry.action == "HOLD" || entry.isPlaceholder { return nil }
        guard heroRate > 0, compareRate > 0 else { return nil }
        let delta = heroRate - compareRate
        let arrow = delta >= 0 ? "↗" : "↘"
        let sign = delta >= 0 ? "+" : "−"
        let compareLabel = heroLeadsExport ? "retail" : "export"
        return String(
            format: "%@ %@$%.2f vs %@",
            arrow, sign, abs(delta), compareLabel
        )
    }

    private var ratePair: String {
        String(
            format: "Retail $%.2f · Export $%.2f",
            entry.retail_rate_now, entry.export_rate_now
        )
    }

    // "Peak in 2h 15m". Nil when there's no scheduled peak, or the peak
    // is already underway, or we can't parse the ISO string.
    private var peakCountdown: String? {
        guard let iso = entry.peak_window_start_iso, !iso.isEmpty else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var peak = formatter.date(from: iso)
        if peak == nil {
            formatter.formatOptions = [.withInternetDateTime]
            peak = formatter.date(from: iso)
        }
        guard let peakDate = peak else { return nil }
        let delta = peakDate.timeIntervalSince(entry.date)
        guard delta > 60 else { return nil }  // Within a minute = treat as "now"
        let totalMinutes = Int(delta / 60)
        let hours = totalMinutes / 60
        let minutes = totalMinutes % 60
        if hours > 0 {
            return "Peak in \(hours)h \(minutes)m"
        }
        return "Peak in \(minutes)m"
    }

    private var socText: String? {
        guard let soc = entry.battery_soc_pct else { return nil }
        return "Battery \(soc)%"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(spacing: 6) {
                Circle()
                    .fill(accent)
                    .frame(width: 8, height: 8)
                Text("HELIOS")
                    .font(.system(size: 11, weight: .semibold))
                    .kerning(0.5)
                    .foregroundColor(Color(hex: "#aaaaaa"))
                Spacer()
            }

            Spacer(minLength: 6)

            // Body
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.verb)
                    .font(.system(size: 12, weight: .bold))
                    .kerning(0.2)
                    .foregroundColor(accent)
                    .lineLimit(1)
                if entry.isPlaceholder {
                    // First-install: no live data yet. Verb already reads
                    // "Open Helios to sync" — suppress the rate line to
                    // avoid implying a real recommendation.
                    Text("—")
                        .font(.system(size: 22, weight: .heavy))
                        .foregroundColor(Color(hex: "#666666"))
                } else if entry.action == "HOLD" {
                    // HOLD: show both rates side-by-side, no single hero.
                    Text(ratePair)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(2)
                } else {
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text(heroRateString)
                            .font(.system(size: 28, weight: .heavy))
                            .kerning(-0.5)
                            .foregroundColor(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                        Text("/kWh")
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "#aaaaaa"))
                    }
                    if let delta = deltaLine {
                        Text(delta)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(Color(hex: "#aaaaaa"))
                            .lineLimit(1)
                            .padding(.top, 1)
                    }
                }
            }

            Spacer(minLength: 4)

            // Footer: SoC + peak countdown lead when we have them. If
            // neither is present (we didn't receive soc or peak from
            // the phone) fall back to the expected /hr gain — still
            // useful as "earning right now" context.
            if let soc = socText, let countdown = peakCountdown {
                Text("\(soc) · \(countdown)")
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "#666666"))
                    .lineLimit(1)
            } else if let soc = socText {
                Text(soc)
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "#666666"))
                    .lineLimit(1)
            } else if let countdown = peakCountdown {
                Text(countdown)
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "#666666"))
                    .lineLimit(1)
            } else if !entry.isPlaceholder {
                let hrSign = entry.expected_hourly_gain_usd >= 0 ? "+" : "−"
                Text(String(
                    format: "%@$%.2f /hr",
                    hrSign, abs(entry.expected_hourly_gain_usd)
                ))
                .font(.system(size: 10))
                .foregroundColor(Color(hex: "#666666"))
                .lineLimit(1)
            }
        }
        .padding(14)
    }
}

// MARK: - Hex color helper

extension Color {
    init(hex: String) {
        let trimmed = hex.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")
        var int: UInt64 = 0
        Scanner(string: trimmed).scanHexInt64(&int)
        let r, g, b, a: UInt64
        switch trimmed.count {
        case 6:
            (r, g, b, a) = ((int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff, 255)
        case 8:
            (r, g, b, a) = ((int >> 24) & 0xff, (int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff)
        default:
            (r, g, b, a) = (107, 114, 128, 255) // fallback = gray
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview(as: .systemSmall) {
    HeliosWidget()
} timeline: {
    LiveEntry.sample
    LiveEntry.placeholder
}
