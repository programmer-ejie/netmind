import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { io } from 'socket.io-client/dist/socket.io.js';

import {
  API_BASE,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerPushSubscription,
  type NetmindNotification,
} from '@/lib/api';

const SOCKET_BASE = (process.env.EXPO_PUBLIC_SOCKET_BASE || API_BASE.replace(/\/api$/, '')).replace(/\/$/, '');
export const NOTIFICATION_UNREAD_COUNT_EVENT = 'netmind:notification-unread-count';
const REALTIME_NOTIFICATION_CHANNEL_ID = 'realtime-notifications';
let notificationHandlerConfigured = false;

function configureNotificationSoundHandler() {
  if (notificationHandlerConfigured || Platform.OS === 'web') return;
  notificationHandlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

export function normalizeNotification(notification: NetmindNotification): NetmindNotification {
  return {
    ...notification,
    data: notification.data || {},
    is_read: Boolean(notification.is_read),
  };
}

export async function loadNotifications() {
  const response = await listNotifications();
  return response.data.map(normalizeNotification);
}

export async function markRead(id: number | string) {
  return normalizeNotification(await markNotificationRead(id));
}

export async function markAllRead() {
  return markAllNotificationsRead();
}

export async function registerForPushNotifications() {
  if (!Device.isDevice && Platform.OS !== 'web') return;
  configureNotificationSoundHandler();

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.status === 'granted'
    ? existing
    : await Notifications.requestPermissionsAsync();

  if (permission.status !== 'granted') return;

  const token = await Notifications.getExpoPushTokenAsync().catch(() => null);
  if (!token?.data) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REALTIME_NOTIFICATION_CHANNEL_ID, {
      name: 'Realtime notifications',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 160, 80, 160],
    }).catch(() => undefined);
  }

  await registerPushSubscription({
    push_token: token.data,
    platform: Platform.OS,
  }).catch(() => undefined);
}

export async function playRealtimeNotificationSound(notification: NetmindNotification) {
  if (Platform.OS === 'web') return;
  configureNotificationSoundHandler();

  const permission = await Notifications.getPermissionsAsync().catch(() => null);
  if (permission?.status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title || 'NetMind',
      body: notification.body || 'You have a new notification.',
      sound: 'default',
      data: notification.data || {},
      vibrate: [0, 160, 80, 160],
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null,
  }).catch(() => undefined);
}

export async function connectNotificationSocket(
  onNotification: (notification: NetmindNotification) => void,
) {
  const token = await AsyncStorage.getItem('netmind_token');
  if (!token) return null;

  const socket = io(SOCKET_BASE, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('notifications:new', (notification: NetmindNotification) => {
    onNotification(normalizeNotification(notification));
  });

  return socket;
}
