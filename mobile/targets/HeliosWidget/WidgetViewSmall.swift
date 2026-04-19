import SwiftUI
import WidgetKit

struct WidgetViewSmall: View {
    let entry: LiveEntry

    private var accent: Color { Color(hex: entry.color_hex) }

    private var dollars: String {
        let sign = entry.expected_hourly_gain_usd >= 0 ? "+" : "-"
        return String(format: "%@$%.2f", sign, abs(entry.expected_hourly_gain_usd))
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
                    .font(.system(size: 13, weight: .bold))
                    .kerning(0.2)
                    .foregroundColor(accent)
                    .lineLimit(1)
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text(dollars)
                        .font(.system(size: 30, weight: .heavy))
                        .kerning(-0.5)
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text("/hr")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#aaaaaa"))
                }
            }

            Spacer(minLength: 4)

            // Footer
            Text(String(
                format: "Retail $%.2f · Exp $%.2f",
                entry.retail_rate_now, entry.export_rate_now
            ))
            .font(.system(size: 10))
            .foregroundColor(Color(hex: "#666666"))
            .lineLimit(1)
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
