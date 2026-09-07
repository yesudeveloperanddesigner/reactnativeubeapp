import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHAT_CHANNEL_ID = 'chat';

let initialized = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChatChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const existing = await Notifications.getNotificationChannelAsync(CHAT_CHANNEL_ID);
  if (!existing) {
    await Notifications.setNotificationChannelAsync(CHAT_CHANNEL_ID, {
      name: 'Chat messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

export async function initNotifications(): Promise<void> {
  if (initialized) return;
  initialized = true;

  await ensureChatChannel();

  const existing = await Notifications.getPermissionsAsync();
  if (!existing.granted) {
    await Notifications.requestPermissionsAsync();
  }
}

export async function playMessageChime(
  title = 'New Message',
  body = 'You received a new message.',
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: CHAT_CHANNEL_ID } : {}),
      },
      trigger: null,
    });
  } catch {
    // Notifications are best-effort; never crash the app on failure.
  }
}