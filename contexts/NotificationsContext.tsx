import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
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

  // -------------------------------------------------------------------------
  // Auto-refresh mientras la sesion este abierta (estrategia hibrida web).
  //
  // OnSpace Cloud no expone Realtime, por lo que hacemos polling ligero cada
  // 30 s contra `hydrateNotifications` (SELECT filtrado por RLS al user
  // actual). Solo aplica si el userId es UUID real; los IDs mock no tienen
  // filas en Cloud. Esto alimenta el HUD/campana + toast sin necesidad de
  // recargar la pagina.
  // -------------------------------------------------------------------------
  const pollBusyRef = useRef<boolean>(false);
  useEffect(() => {
    if (!userId) return;
    const isRealUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId,
      );
    if (!isRealUuid) return;
    const interval = setInterval(() => {
      if (pollBusyRef.current) return;
      pollBusyRef.current = true;
      hydrateNotifications(userId, true)
        .catch(() => undefined)
        .finally(() => {
          pollBusyRef.current = false;
        });
    }, 30_000);
    return () => clearInterval(interval);
  }, [userId]);

  // -------------------------------------------------------------------------
  // Web: refresco inmediato al volver la pestana a foreground. Cubre el caso
  // clasico de "regreso al navegador y no me entere de nada".
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (Platform.OS !== 'web' || !userId) return;
    const isRealUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId,
      );
    if (!isRealUuid) return;
    const doc: any = typeof document !== 'undefined' ? document : null;
    if (!doc || typeof doc.addEventListener !== 'function') return;
    const handler = () => {
      if (doc.visibilityState === 'visible') {
        hydrateNotifications(userId, true).catch(() => undefined);
      }
    };
    doc.addEventListener('visibilitychange', handler);
    // Focus del window: algunos navegadores no disparan visibilitychange en
    // tabs recien enfocadas.
    const w: any = typeof window !== 'undefined' ? window : null;
    const focusHandler = () =>
      hydrateNotifications(userId, true).catch(() => undefined);
    if (w && typeof w.addEventListener === 'function') {
      w.addEventListener('focus', focusHandler);
    }
    return () => {
      doc.removeEventListener('visibilitychange', handler);
      if (w && typeof w.removeEventListener === 'function') {
        w.removeEventListener('focus', focusHandler);
      }
    };
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
