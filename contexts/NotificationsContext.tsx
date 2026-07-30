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
  listNotificationsGrouped,
  markAsRead as svcMarkRead,
  markAllAsRead as svcMarkAll,
  unreadCount as svcUnread,
  createNotification as svcCreate,
  hydrateNotifications,
  subscribeNotifications,
  CreateNotificationArgs,
  NotificationPriority,
  getNotificationPriority,
} from '@/services/notificationService';

export interface NotificationsGrouped {
  requires_action: Notification[];
  important: Notification[];
  info: Notification[];
}

export interface NotificationsContextType {
  notifications: Notification[];
  grouped: NotificationsGrouped;
  unreadCount: number;
  requiresActionCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  create: (args: Omit<CreateNotificationArgs, 'userId'>) => void;
  refresh: () => void;
  priorityOf: (n: Notification) => NotificationPriority;
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

  const grouped = useMemo<NotificationsGrouped>(() => {
    if (!userId) return { requires_action: [], important: [], info: [] };
    void tick;
    return listNotificationsGrouped(userId);
  }, [userId, tick]);

  const unread = useMemo<number>(() => {
    if (!userId) return 0;
    void tick;
    return svcUnread(userId);
  }, [userId, tick]);

  const requiresActionCount = useMemo<number>(() => {
    if (!userId) return 0;
    void tick;
    return grouped.requires_action.filter((n) => !n.read).length;
  }, [userId, tick, grouped]);

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
      grouped,
      unreadCount: unread,
      requiresActionCount,
      markAsRead,
      markAllAsRead,
      create,
      refresh,
      priorityOf: (n: Notification) => getNotificationPriority(n.type),
    }),
    [
      notifications,
      grouped,
      unread,
      requiresActionCount,
      markAsRead,
      markAllAsRead,
      create,
      refresh,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
