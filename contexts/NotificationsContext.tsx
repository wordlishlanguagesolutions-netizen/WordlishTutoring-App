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
  hydrateNotifications,
  subscribeNotifications,
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

// Resolucion de userId para el buzon.
// En Cloud real (Auth real) el user.id ya es UUID y coincide 1:1 con
// notifications.user_id, por lo que RLS entrega solo las suyas. En
// modo mock (auth mock) mapeamos a los slots canonicos del seed.
function userIdFromAuth(
  user: { id?: string; role?: string } | null | undefined,
): string | null {
  if (!user) return null;
  const id = user.id ?? '';
  if (id && !id.startsWith('mock-')) return id;
  switch (user.role) {
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
  const userId = userIdFromAuth(user);

  // Tick reactivo: se incrementa cada vez que el cache del service
  // notifica (create / markRead / hydrate). Fuerza a los useMemo a
  // recomputar sin polling.
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    if (userId) {
      hydrateNotifications(userId).catch(() => undefined);
    }
    const unsub = subscribeNotifications(() => setTick((t) => t + 1));
    return unsub;
  }, [userId]);

  const notifications = useMemo<Notification[]>(() => {
    if (!userId) return [];
    void tick;
    return listNotifications(userId);
  }, [userId, tick]);

  const unread = useMemo<number>(() => {
    if (!userId) return 0;
    void tick;
    return svcUnread(userId);
  }, [userId, tick]);

  const refresh = useCallback(() => {
    if (!userId) return;
    hydrateNotifications(userId, true).catch(() => undefined);
  }, [userId]);

  const markAsRead = useCallback((id: string) => {
    svcMarkRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    if (!userId) return;
    svcMarkAll(userId);
  }, [userId]);

  const create = useCallback(
    (args: Omit<CreateNotificationArgs, 'userId'>) => {
      if (!userId) return;
      svcCreate({ ...args, userId });
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
