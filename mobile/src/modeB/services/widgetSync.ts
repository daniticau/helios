// iOS WidgetKit bridge. Writes the latest LiveRecommendation + household
// state into the shared App Group (group.com.helios.app.shared) UserDefaults
// and reloads the widget timeline. On Android and web the ExtensionStorage
// module is a no-op.

import { ExtensionStorage } from '@bacons/apple-targets';

import type { HouseholdState, LiveRecommendation } from '@/shared/types';

import { ACTION_META } from '../constants';

const APP_GROUP = 'group.com.helios.app.shared';
const KEY = 'live.latest.v1';

const storage = new ExtensionStorage(APP_GROUP);

export function pushWidgetUpdate(
  rec: LiveRecommendation,
  state: HouseholdState
): void {
  const meta = ACTION_META[rec.action];
  const payload = {
    action: rec.action,
    verb: meta.verb,
    color_hex: meta.color,
    expected_hourly_gain_usd: Number(rec.expected_hourly_gain_usd.toFixed(2)),
    retail_rate_now: Number(rec.retail_rate_now.toFixed(4)),
    export_rate_now: Number(rec.export_rate_now.toFixed(4)),
    // Percent as 0-100, rounded to integer. The widget shows "Battery 62%".
    battery_soc_pct: Math.round(state.battery_soc_pct),
    // ISO timestamp for the next peak window; widget derives a countdown
    // ("Peak in 2h 15m") from this + the entry's own reference time.
    peak_window_start_iso: rec.next_peak_window?.start_iso ?? null,
    updated_at_iso: new Date().toISOString(),
  };
  storage.set(KEY, JSON.stringify(payload));
  ExtensionStorage.reloadWidget('HeliosWidget');
}
