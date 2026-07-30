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

// Resolucion de userId para el buzon de notificaciones.
// QA fix (Production): en modo real el user.id es el UUID de
// auth.users. Si venimos de auth mock (id 'mock-<role>') mapeamos al
// slot canonico usado por el seed. Priorizamos el UUID real para que
// las notificaciones creadas por otros usuarios (dirigidas a un
// userId concreto) lleguen a su destinatario legitimo.
function userIdFromAuth(
  user: { id?: string; role?: string } | null | undefined,
): string | null {
  if (!user) return null;
  const id = user.id ?? '';
  if (id && !id.startsWith('mock-')) return id; // UUID real
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
