import SwiftUI
import WidgetKit

struct HeliosWidget: Widget {
    let kind: String = "HeliosWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HeliosProvider()) { entry in
            WidgetViewSmall(entry: entry)
                .containerBackground(Color(hex: "#0f0f0f"), for: .widget)
        }
        .configurationDisplayName("Helios Live")
        .description("Current action and hourly $ from your solar + battery.")
        .supportedFamilies([.systemSmall])
    }
}
