// expo-notifications wrapper. Per HELIOS.md §12 scope cuts, "schedule a
// single faked notif for the demo" is the realistic scope — we don't need
// server push. Tapping the notif deep-links to /hourly-plan via expo-linking.

import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';

let handlerRegistered = false;
let tapListener: Notifications.Subscription | null = null;

// In-app deep-link target when the notif is tapped. We don't have a real
// deep-link URL scheme configured for the hackathon, so we use a callback
// registered by App.tsx (or here, for our internal navigation).
type TapHandler = (route: string) => void;
let tapHandler: TapHandler | null = null;

export function registerNotificationTapHandler(fn: TapHandler) {
  tapHandler = fn;
}

function ensureHandler() {
  if (handlerRegistered) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      // RN 0.76 / expo-notifications 0.29 added these two fields.
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerRegistered = true;

  // Tap listener — deep-link into the hourly plan.
  if (!tapListener) {
    tapListener = Notifications.addNotificationResponseReceivedListener(
      (resp: NotificationResponse) => {
        const data = resp.notification.request.content.data as Record<string, unknown>;
        const route = typeof data?.route === 'string' ? data.route : 'hourly-plan';
        tapHandler?.(route);
      },
    );
  }
}

async function ensurePermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Schedule a local notification that fires in ~10 seconds, simulating a
 * peak-export-window-opening alert. Used for demos and rehearsal.
 */
export async function scheduleFakePeakNotif(): Promise<string> {
  ensureHandler();
  const granted = await ensurePermission();
  if (!granted) throw new Error('Notification permission denied.');

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Peak export window opening at 5:00 PM',
      body: 'Battery at 87%. Expected earnings $18.40 over next 4 hours.',
      data: { route: 'hourly-plan' },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      repeats: false,
    },
  });
}

export async function cancelAllScheduled() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
