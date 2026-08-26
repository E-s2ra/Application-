import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export type NotificationType = 'product_published' | 'user_mention' | 'comment_reply';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  resource_type: 'anime' | 'comment';
  resource_id: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (queryError) {
        setNotifications([]);
        setError(null);
      } else {
        setNotifications((data ?? []) as AppNotification[]);
        setError(null);
      }
    } catch {
      setNotifications([]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const markRead = useCallback(async (notificationId: string) => {
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) => (
      notification.id === notificationId ? { ...notification, read_at: readAt } : notification
    )));

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('id', notificationId)
      .is('read_at', null);

    if (updateError) {
      setError(updateError.message);
      void refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((notification) => !notification.read_at).map((notification) => notification.id);
    if (unreadIds.length === 0) return;

    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) => (
      notification.read_at ? notification : { ...notification, read_at: readAt }
    )));

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .in('id', unreadIds)
      .is('read_at', null);

    if (updateError) {
      setError(updateError.message);
      void refresh();
    }
  }, [notifications, refresh]);

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read_at).length,
    isLoading,
    error,
    refresh,
    markRead,
    markAllRead,
  }), [notifications, isLoading, error, refresh, markRead, markAllRead]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within NotificationsProvider');
  return context;
}
