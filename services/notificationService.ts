// ============================================================================
// Wordlish · Notification service (Cloud real).
//
// Cache in-memory + suscripciones para el UI + persistencia async en
// `public.notifications` (Cloud). Sin dependencia de mockDb: en
// produccion todas las notificaciones viven en Cloud y RLS garantiza
// que cada usuario solo lea las propias.
//
// Contrato publico se mantiene identico a la version previa para no
// romper consumidores (BookingsContext, classService, payrollService,
// etc.):
//   · createNotification(args)   -> Notification (sincronico)
//   · listNotifications(userId)  -> Notification[]
//   · markAsRead(id)             -> void
//   · markAllAsRead(userId)      -> void
//   · unreadCount(userId)        -> number
//
// Anadido para la migracion:
//   · hydrateNotifications(userId, force?) -> Promise<Notification[]>
//   · subscribeNotifications(cb)           -> unsubscribe
//   · resetNotificationsCache()            -> void
// ============================================================================

import type {
  Notification,
  NotificationType,
  NotificationChannel,
} from '@/types';
import {
  notificationsCloudRepo,
  type NotificationCreateArgs as CloudNotificationCreateArgs,
} from '@/repositories/notifications';
import { pushService } from './pushService';

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(id: string | null | undefined): boolean {
  return typeof id === 'string' && UUID_RE.test(id);
}
function localId(): string {
  return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

type Tone = Notification['tone'];

// Templates centralizados (i18n-ready).
const TEMPLATES: Record<
  NotificationType,
  { title: string; tone: Tone; icon: string; channel: NotificationChannel }
> = {
  class_reminder_24h: { title: 'Clase mañana', tone: 'info', icon: 'time-outline', channel: 'push' },
  class_reminder_15m: { title: 'Clase en 15 minutos', tone: 'primary', icon: 'alarm', channel: 'push' },
  class_starting: { title: 'Tu clase está por comenzar', tone: 'primary', icon: 'videocam', channel: 'push' },
  new_report: { title: 'Nuevo reporte', tone: 'success', icon: 'document-text', channel: 'in_app' },
  new_material: { title: 'Nuevo material', tone: 'info', icon: 'folder-open', channel: 'in_app' },
  schedule_change: { title: 'Cambio de horario', tone: 'warning', icon: 'refresh', channel: 'push' },
  teacher_absent: { title: 'Profesor ausente', tone: 'danger', icon: 'person-remove', channel: 'push' },
  class_cancelled: { title: 'Clase cancelada', tone: 'danger', icon: 'close-circle', channel: 'push' },
  class_rescheduled: { title: 'Clase reprogramada', tone: 'info', icon: 'refresh', channel: 'push' },
  payment_pending: { title: 'Pago pendiente', tone: 'warning', icon: 'card-outline', channel: 'push' },
  payment_confirmed: { title: 'Pago confirmado', tone: 'success', icon: 'checkmark-circle', channel: 'push' },
  availability_pending: { title: 'Publica tu disponibilidad', tone: 'warning', icon: 'time-outline', channel: 'in_app' },
  booking_confirmed: { title: 'Reserva confirmada', tone: 'success', icon: 'checkmark-circle', channel: 'in_app' },
  payroll_ready: { title: 'Liquidación lista para revisión', tone: 'info', icon: 'calculator-outline', channel: 'in_app' },
  payroll_paid: { title: 'Pago de liquidación registrado', tone: 'success', icon: 'cash-outline', channel: 'in_app' },
  system: { title: 'Notificación del sistema', tone: 'info', icon: 'notifications', channel: 'in_app' },
};

// ---------------------------------------------------------------------------
// Contrato publico (identico al anterior).
// ---------------------------------------------------------------------------
export interface CreateNotificationArgs {
  userId: string;
  type: NotificationType;
  message: string;
  title?: string;
  actionRoute?: string;
  actionLabel?: string;
  refType?: Notification['refType'];
  refId?: string | null;
  scheduledFor?: string | null;
}

// ---------------------------------------------------------------------------
// Cache + subscripciones.
// ---------------------------------------------------------------------------
let cache: Notification[] = [];
const hydratedUsers = new Set<string>();
const inflightHydration = new Map<string, Promise<Notification[]>>();
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[notificationService] listener error', err);
    }
  });
}

export function subscribeNotifications(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getNotificationsVersion(): number {
  return version;
}

// Hidrata el buzon del usuario indicado desde Cloud. Reemplaza en
// cache las filas propias de ese userId. Es idempotente y deduplica
// llamadas concurrentes.
export function hydrateNotifications(
  userId: string,
  force = false,
): Promise<Notification[]> {
  if (!userId) return Promise.resolve([]);
  // Solo hidrata contra Cloud si el userId es un UUID real. En modo
  // mock (ids 'u-admin', 'u-s1', ...) no hay filas en Cloud y no
  // queremos limpiar el cache local.
  if (!isUuid(userId)) return Promise.resolve(listNotifications(userId));
  if (hydratedUsers.has(userId) && !force) {
    return Promise.resolve(listNotifications(userId));
  }
  const existing = inflightHydration.get(userId);
  if (existing) return existing;
  const p = (async () => {
    const rows = await notificationsCloudRepo.listForUser(userId);
    // Reemplaza las notificaciones de ese usuario en el cache; deja
    // el resto (otros usuarios) intactas para no romper vistas admin.
    cache = [...cache.filter((n) => n.userId !== userId), ...rows];
    hydratedUsers.add(userId);
    inflightHydration.delete(userId);
    notify();
    return rows;
  })();
  inflightHydration.set(userId, p);
  return p;
}

// ---------------------------------------------------------------------------
// Reads sincronicos sobre el cache.
// ---------------------------------------------------------------------------
export function listNotifications(userId: string): Notification[] {
  return cache
    .filter((n) => n.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function unreadCount(userId: string): number {
  return cache.filter((n) => n.userId === userId && !n.read).length;
}

// ---------------------------------------------------------------------------
// Mutaciones (optimistic + fire-and-forget Cloud).
// ---------------------------------------------------------------------------
export function createNotification(args: CreateNotificationArgs): Notification {
  const template = TEMPLATES[args.type];
  const nowIso = new Date().toISOString();
  const n: Notification = {
    id: localId(),
    userId: args.userId,
    type: args.type,
    title: args.title ?? template.title,
    message: args.message,
    channel: template.channel,
    deliveryStatus: args.scheduledFor ? 'queued' : 'delivered',
    read: false,
    readAt: null,
    actionRoute: args.actionRoute ?? null,
    actionLabel: args.actionLabel ?? null,
    refType: args.refType ?? null,
    refId: args.refId ?? null,
    scheduledFor: args.scheduledFor ?? null,
    tone: template.tone,
    icon: template.icon,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  cache = [n, ...cache];
  notify();

  // Persistir en Cloud solo si el destinatario es un usuario real.
  // En modo mock (auth mock) los IDs no son UUID y la fila fallaria
  // por la FK a auth.users. En Cloud real user_id es UUID y RLS
  // garantiza aislamiento por auth.uid().
  if (isUuid(args.userId)) {
    const cloudArgs: CloudNotificationCreateArgs = {
      userId: args.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      channel: n.channel,
      deliveryStatus: n.deliveryStatus,
      actionRoute: n.actionRoute,
      actionLabel: n.actionLabel,
      refType: n.refType,
      // ref_id es uuid en la DB. Solo enviamos si es UUID valido.
      refId: isUuid(n.refId) ? n.refId : null,
      scheduledFor: n.scheduledFor,
      tone: n.tone,
      icon: n.icon,
    };
    notificationsCloudRepo
      .insert(cloudArgs)
      .then(({ notification, error }) => {
        if (error || !notification) {
          console.warn('[notificationService.createNotification] Cloud fallo:', error);
          return;
        }
        cache = cache.map((x) => (x.id === n.id ? notification : x));
        notify();
      })
      .catch((err) =>
        console.warn('[notificationService.createNotification] excepcion:', err),
      );
  }

  // Push channel (stub Fase 1)
  if (template.channel === 'push' && !args.scheduledFor) {
    pushService.send(args.userId, args.type, { title: n.title, body: n.message });
  }
  return n;
}

export function markAsRead(id: string): void {
  const target = cache.find((x) => x.id === id);
  if (!target) return;
  const nowIso = new Date().toISOString();
  cache = cache.map((x) =>
    x.id === id
      ? {
          ...x,
          read: true,
          readAt: nowIso,
          deliveryStatus: 'read',
          updatedAt: nowIso,
        }
      : x,
  );
  notify();
  if (isUuid(id)) {
    notificationsCloudRepo.markRead(id).catch((err) =>
      console.warn('[notificationService.markAsRead] Cloud fallo:', err),
    );
  }
}

export function markAllAsRead(userId: string): void {
  const nowIso = new Date().toISOString();
  cache = cache.map((x) =>
    x.userId === userId && !x.read
      ? {
          ...x,
          read: true,
          readAt: nowIso,
          deliveryStatus: 'read',
          updatedAt: nowIso,
        }
      : x,
  );
  notify();
  if (isUuid(userId)) {
    notificationsCloudRepo.markAllReadForUser(userId).catch((err) =>
      console.warn('[notificationService.markAllAsRead] Cloud fallo:', err),
    );
  }
}

// Uso interno para logout / cambio de sesion.
export function resetNotificationsCache(): void {
  cache = [];
  hydratedUsers.clear();
  inflightHydration.clear();
  notify();
}
