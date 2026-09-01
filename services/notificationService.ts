// Wordlish · Notification service
// Fase 1: entrega in_app únicamente.
// Preparado para despachar por push/whatsapp/email en Fase 2
// vía Supabase Edge Functions.

import type { Notification, NotificationType, NotificationChannel } from '@/types';
import { mockDb, makeId } from './mockDb';
import { pushService } from './pushService';

type Tone = Notification['tone'];

// Templates centralizados (i18n-ready)
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

export function createNotification(args: CreateNotificationArgs): Notification {
  const template = TEMPLATES[args.type];
  const nowIso = new Date().toISOString();
  const n: Notification = {
    id: makeId('n'),
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
  mockDb.notifications.unshift(n);

  // Encolar despacho por push (stub Fase 1)
  if (template.channel === 'push' && !args.scheduledFor) {
    pushService.send(args.userId, args.type, { title: n.title, body: n.message });
  }
  return n;
}

export function listNotifications(userId: string): Notification[] {
  return mockDb.notifications.filter((n) => n.userId === userId);
}

export function markAsRead(id: string): void {
  const n = mockDb.notifications.find((x) => x.id === id);
  if (!n) return;
  n.read = true;
  n.readAt = new Date().toISOString();
  n.deliveryStatus = 'read';
  n.updatedAt = n.readAt;
}

export function markAllAsRead(userId: string): void {
  const nowIso = new Date().toISOString();
  mockDb.notifications
    .filter((n) => n.userId === userId && !n.read)
    .forEach((n) => {
      n.read = true;
      n.readAt = nowIso;
      n.deliveryStatus = 'read';
      n.updatedAt = nowIso;
    });
}

export function unreadCount(userId: string): number {
  return mockDb.notifications.filter((n) => n.userId === userId && !n.read).length;
}

// Seed inicial mínimo (una por rol)
function seedInitialNotifications() {
  if (mockDb.notifications.length > 0) return;
  createNotification({
    userId: 'u-s1',
    type: 'class_reminder_24h',
    message: 'Inglés básico con Prof. Carlos mañana a las 10:00.',
    refType: 'booking',
    refId: 'bk1',
    actionRoute: '/(student)',
  });
  createNotification({
    userId: 'u-g1',
    type: 'payment_pending',
    message: 'Pago pendiente de Pablo (Paquete 4 horas).',
    refType: 'payment',
    actionRoute: '/(guardian)/payments',
  });
  createNotification({
    userId: 'u-t1',
    type: 'availability_pending',
    message: 'Publica tu disponibilidad antes del viernes.',
    actionRoute: '/(teacher)/agenda',
  });
  createNotification({
    userId: 'u-sup',
    type: 'teacher_absent',
    message: 'Prof. Ana Vega tardó 6 minutos en conectar.',
    actionRoute: '/(supervisor)/alerts',
  });
  createNotification({
    userId: 'u-admin',
    type: 'system',
    message: '2 incidencias activas en el día.',
    actionRoute: '/(admin)',
  });
}

seedInitialNotifications();
