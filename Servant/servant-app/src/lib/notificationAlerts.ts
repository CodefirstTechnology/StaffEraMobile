import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { localizeNotification, type NotificationPayload } from '@/lib/i18n/notifications';

const BOOKING_REQUEST_CHANNEL = 'booking-requests';

let initialized = false;
let notificationsModule: typeof import('expo-notifications') | null = null;

async function getNotifications() {
  if (Platform.OS === 'web') return null;

  if (!notificationsModule) {
    try {
      notificationsModule = await import('expo-notifications');
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (e) {
      console.warn('Could not load expo-notifications module:', e);
      return null;
    }
  }

  return notificationsModule;
}

export const BOOKING_REQUEST_TYPES = new Set(['BOOKING_OPEN', 'BOOKING_CREATED']);

export async function initNotificationAlerts(): Promise<boolean> {
  if (initialized) return true;
  initialized = true;

  if (Platform.OS === 'web') return false;

  const Notifications = await getNotifications();
  if (!Notifications) return false;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(BOOKING_REQUEST_CHANNEL, {
        name: 'Booking Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        sound: 'default',
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Failed to initialize system notifications:', err);
    return false;
  }
}

/** Post a local push notification directly to the phone's status bar / notification panel. */
export async function postSystemNotification(
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // Haptics unavailable on some devices
  }

  try {
    Vibration.vibrate([0, 400, 200, 400]);
  } catch {
    // Ignore
  }

  const Notifications = await getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data,
        ...(Platform.OS === 'android' ? { channelId: BOOKING_REQUEST_CHANNEL } : {}),
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Failed to display system notification:', err);
  }
}

export async function alertBookingRequest(notification: NotificationPayload): Promise<void> {
  const { title, body } = localizeNotification(notification);
  await postSystemNotification(title, body, notification.data ?? {});
}
