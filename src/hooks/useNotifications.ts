import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_STORAGE_KEY = '@aniflix_notifications_v1';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'release' | 'system' | 'vip';
  read: boolean;
  createdAt: string;
  mediaId?: string;
}

const DEFAULT_INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'New 4K Release: Solo Leveling S2',
    message: 'Stream all new episodes in Ultra HD with Kurdish Dubbed audio now live on AniFlix!',
    type: 'release',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    title: 'AniFlix VIP Sovereign Upgrade',
    message: 'Get ad-free 4K cinema streaming and exclusive episodes.',
    type: 'vip',
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        setNotifications(DEFAULT_INITIAL_NOTIFICATIONS);
        await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_NOTIFICATIONS));
      }
    } catch (e) {
      console.warn('[useNotifications] Error loading notifications:', e);
      setNotifications(DEFAULT_INITIAL_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const addNotification = useCallback(async (notif: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications((prev) => {
      const updated = [newNotif, ...prev];
      AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    addNotification,
    markAsRead,
    markAllAsRead,
  };
}
