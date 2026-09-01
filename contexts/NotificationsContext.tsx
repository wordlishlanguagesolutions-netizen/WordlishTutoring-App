import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import type { Notification } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import {
  listNotifications,
  markAsRead as svcMarkRead,
  markAllAsRead as svcMarkAll,
  unreadCount as svcUnread,
  createNotification as svcCreate,
  CreateNotificationArgs,
} from '@/services/notificationService';

export interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  create: (args: Omit<CreateNotificationArgs, 'userId'>) => void;
  refresh: () => void;
}

export const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

// Mapa role → userId en mockDb (auth mock)
function userIdFromRole(role: string | undefined): string | null {
  switch (role) {
    case 'admin':
      return 'u-admin';
    case 'supervisor':
      return 'u-sup';
    case 'teacher':
      return 'u-t1';
    case 'student':
      return 'u-s1';
    case 'guardian':
      return 'u-g1';
    default:
      return null;
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = userIdFromRole(user?.role);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState<number>(0);
  const [tick, setTick] = useState<number>(0);

  const refresh = useCallback(() => {
    if (!userId) {
      setNotifications([]);
      setUnread(0);
      return;
    }
    setNotifications(listNotifications(userId));
    setUnread(svcUnread(userId));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh, tick]);

  const markAsRead = useCallback((id: string) => {
    svcMarkRead(id);
    setTick((t) => t + 1);
  }, []);

  const markAllAsRead = useCallback(() => {
    if (!userId) return;
    svcMarkAll(userId);
    setTick((t) => t + 1);
  }, [userId]);

  const create = useCallback(
    (args: Omit<CreateNotificationArgs, 'userId'>) => {
      if (!userId) return;
      svcCreate({ ...args, userId });
      setTick((t) => t + 1);
    },
    [userId],
  );

  const value = useMemo<NotificationsContextType>(
    () => ({
      notifications,
      unreadCount: unread,
      markAsRead,
      markAllAsRead,
      create,
      refresh,
    }),
    [notifications, unread, markAsRead, markAllAsRead, create, refresh],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
