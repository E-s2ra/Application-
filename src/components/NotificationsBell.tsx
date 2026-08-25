import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, CheckCheck, PackageOpen, MessageSquare, AtSign, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { AppNotification, useNotifications } from '@/hooks/useNotifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch (_e) {
    return '';
  }
}

export function NotificationsBell() {
  const router = useRouter();
  const themeColors = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const { notifications, unreadCount, isLoading, error, refresh, markRead, markAllRead } = useNotifications();

  const open = () => {
    setVisible(true);
    void refresh();
  };

  const openNotification = async (notification: AppNotification) => {
    if (!notification.read_at) await markRead(notification.id);
    setVisible(false);

    if (notification.resource_type === 'anime') {
      router.push({ pathname: '/watch', params: { id: notification.resource_id } });
    } else if (notification.resource_type === 'comment') {
      const targetMovieId = (notification.metadata as any)?.movie_id || notification.resource_id;
      if (targetMovieId) {
        router.push({ pathname: '/watch', params: { id: targetMovieId } });
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type === 'user_mention') {
      return <AtSign color="#fff" size={18} />;
    }
    if (type === 'comment_reply') {
      return <MessageSquare color="#fff" size={18} />;
    }
    return <PackageOpen color="#fff" size={18} />;
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
        style={styles.bellButton}
        onPress={open}
      >
        <Bell color={themeColors.text} size={22} />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: themeColors.backgroundElement,
                borderColor: themeColors.border,
                paddingBottom: Math.max(insets.bottom, 14),
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.title, { color: themeColors.text }]}>Notifications</Text>
                <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                  {unreadCount ? `${unreadCount} unread` : 'You are all caught up'}
                </Text>
              </View>
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Mark all notifications as read"
                    onPress={() => void markAllRead()}
                    style={styles.iconButton}
                  >
                    <CheckCheck color={themeColors.primary} size={21} />
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close notifications"
                  onPress={() => setVisible(false)}
                  style={styles.iconButton}
                >
                  <X color={themeColors.text} size={22} />
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {isLoading && notifications.length === 0 ? (
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Loading notificationsâ€¦</Text>
              ) : error && notifications.length === 0 ? (
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                  Notifications are temporarily unavailable. Pull down and try again later.
                </Text>
              ) : notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <PackageOpen color={themeColors.textSecondary} size={32} />
                  <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                    New releases and community activity will appear here.
                  </Text>
                </View>
              ) : (
                notifications.map((notification) => (
                  <Pressable
                    key={notification.id}
                    accessibilityRole="button"
                    onPress={() => void openNotification(notification)}
                    style={[
                      styles.notification,
                      {
                        borderColor: themeColors.border,
                        backgroundColor: notification.read_at
                          ? themeColors.backgroundCard
                          : `${themeColors.primary}1A`,
                      },
                    ]}
                  >
                    <View style={[styles.notificationIcon, { backgroundColor: themeColors.primary }]}>
                      {getNotificationIcon(notification.type)}
                    </View>
                    <View style={styles.notificationCopy}>
                      <View style={styles.notificationHeaderRow}>
                        <Text style={[styles.notificationTitle, { color: themeColors.text }]} numberOfLines={1}>
                          {notification.title}
                        </Text>
                        <Text style={[styles.timestampText, { color: themeColors.textMuted }]}>
                          {formatRelativeTime(notification.created_at)}
                        </Text>
                      </View>
                      <Text style={[styles.notificationBody, { color: themeColors.textSecondary }]} numberOfLines={2}>
                        {notification.body}
                      </Text>
                    </View>
                    {!notification.read_at && (
                      <View style={[styles.unreadDot, { backgroundColor: themeColors.primary }]} />
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  badge: {
    position: 'absolute',
    top: 5,
    right: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  sheet: { width: '100%', maxHeight: '78%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  list: { paddingHorizontal: 16, paddingBottom: 10, gap: 10 },
  notification: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  notificationIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  notificationTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
  timestampText: { fontSize: 11, fontWeight: '600' },
  notificationBody: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  emptyState: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 42, gap: 12 },
  emptyText: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
});
