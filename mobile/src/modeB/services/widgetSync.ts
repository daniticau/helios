// iOS WidgetKit bridge. Writes the latest LiveRecommendation into the shared
// App Group (group.com.helios.app) UserDefaults and reloads the widget
// timeline. On Android and web the ExtensionStorage module is a no-op.

import { ExtensionStorage } from '@bacons/apple-targets';

import type { LiveRecommendation } from '@/shared/types';

import { ACTION_META } from '../constants';

const APP_GROUP = 'group.com.helios.app.shared';
const KEY = 'live.latest.v1';

const storage = new ExtensionStorage(APP_GROUP);

export function pushWidgetUpdate(rec: LiveRecommendation): void {
  const meta = ACTION_META[rec.action];
  const payload = {
    action: rec.action,
    verb: meta.verb,
    color_hex: meta.color,
    expected_hourly_gain_usd: Number(rec.expected_hourly_gain_usd.toFixed(2)),
    retail_rate_now: Number(rec.retail_rate_now.toFixed(4)),
    export_rate_now: Number(rec.export_rate_now.toFixed(4)),
    updated_at_iso: new Date().toISOString(),
  };
  storage.set(KEY, JSON.stringify(payload));
  ExtensionStorage.reloadWidget('HeliosWidget');
}
