import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useNetmindTheme } from '@/contexts/netmind-theme';
import type { NetmindNotification } from '@/lib/api';
import {
  connectNotificationSocket,
  loadNotifications,
  markAllRead,
  markRead,
  NOTIFICATION_UNREAD_COUNT_EVENT,
  registerForPushNotifications,
} from '@/lib/notifications';

function formatTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function NotificationsScreen() {
  const { colors } = useNetmindTheme();
  const [items, setItems] = useState<NetmindNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items],
  );

  useEffect(() => {
    DeviceEventEmitter.emit(NOTIFICATION_UNREAD_COUNT_EVENT, unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    let active = true;

    loadNotifications()
      .then((notifications) => {
        if (active) {
          setItems(notifications);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    registerForPushNotifications().catch(() => undefined);

    let socket: Awaited<ReturnType<typeof connectNotificationSocket>> = null;
    connectNotificationSocket((notification) => {
      setItems((current) => [notification, ...current]);
    }).then((nextSocket) => {
      socket = nextSocket;
    });

    return () => {
      active = false;
      socket?.disconnect();
    };
  }, []);

  const handleMarkRead = async (item: NetmindNotification) => {
    if (item.is_read) return;
    const updated = await markRead(item.id);
    setItems((current) => {
      const nextItems = current.map((candidate) => (
        candidate.id === updated.id ? updated : candidate
      ));
      DeviceEventEmitter.emit(
        NOTIFICATION_UNREAD_COUNT_EVENT,
        nextItems.filter((candidate) => !candidate.is_read).length,
      );
      return nextItems;
    });
  };

  const handleMarkAll = async () => {
    await markAllRead();
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    DeviceEventEmitter.emit(NOTIFICATION_UNREAD_COUNT_EVENT, 0);
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.wash }]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.kicker, { color: colors.court }]}>Player Updates</Text>
          <Text style={[styles.title, { color: colors.ink }]}>Notifications</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={!unreadCount}
          onPress={handleMarkAll}
          style={[
            styles.markAllButton,
            { backgroundColor: unreadCount ? colors.court : colors.line },
          ]}>
          <MaterialIcons name="done-all" size={18} color="#ffffff" />
          <Text style={styles.markAllText}>Read</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {loading ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={[styles.emptyIconShell, { backgroundColor: colors.courtSoft }]}>
              <MaterialIcons name="hourglass-empty" size={30} color={colors.court} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.ink }]}>Loading updates</Text>
            <Text style={[styles.emptyBody, { color: colors.muted }]}>Checking your latest team activity.</Text>
          </View>
        ) : items.length ? (
          items.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.id}
              onPress={() => handleMarkRead(item)}
              style={[
                styles.card,
                {
                  backgroundColor: item.is_read ? colors.surface : colors.courtSoft,
                  borderColor: item.is_read ? colors.line : colors.court,
                },
              ]}>
              <View style={[styles.iconBubble, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="notifications-none" size={22} color={colors.court} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>{item.title}</Text>
                <Text style={[styles.cardBody, { color: colors.muted }]}>{item.body}</Text>
                <Text style={[styles.cardTime, { color: colors.muted }]}>{formatTime(item.created_at)}</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.emptyAccentRow}>
              <View style={[styles.emptyAccentLine, { backgroundColor: colors.court }]} />
              <View style={[styles.emptyAccentDot, { backgroundColor: colors.gold }]} />
              <View style={[styles.emptyAccentLine, { backgroundColor: colors.court }]} />
            </View>
            <View style={[styles.emptyIconShell, { backgroundColor: colors.courtSoft }]}>
              <View style={[styles.emptyIconInner, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <MaterialIcons name="notifications-none" size={34} color={colors.court} />
              </View>
              <View style={[styles.emptyCheckBadge, { backgroundColor: colors.gold }]}>
                <MaterialIcons name="done" size={15} color="#10252c" />
              </View>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.ink }]}>No notifications yet</Text>
            <Text style={[styles.emptyBody, { color: colors.muted }]}>
              You&apos;re all caught up. New drills, matches, attendance, wellness, injury, account, and schedule updates will appear here.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 18,
    padding: 18,
    paddingBottom: 110,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  markAllButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  markAllText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  list: {
    gap: 10,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  iconBubble: {
    alignItems: 'center',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cardCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  cardBody: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  cardTime: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginTop: 24,
    minHeight: 260,
    overflow: 'hidden',
    paddingHorizontal: 26,
    paddingVertical: 30,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  emptyAccentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    opacity: 0.72,
  },
  emptyAccentLine: {
    borderRadius: 2,
    height: 3,
    opacity: 0.5,
    width: 34,
  },
  emptyAccentDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  emptyIconShell: {
    alignItems: 'center',
    borderRadius: 8,
    height: 96,
    justifyContent: 'center',
    position: 'relative',
    width: 96,
  },
  emptyIconInner: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  emptyCheckBadge: {
    alignItems: 'center',
    borderRadius: 8,
    bottom: 15,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: 13,
    width: 26,
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
    maxWidth: 292,
    textAlign: 'center',
  },
});
