// ============================================================================
// Wordlish · Repositorio de notificaciones (Cloud real).
//
// Capa async pura sobre `public.notifications`. Sin dependencia de
// mockDb: en produccion los datos viven en Cloud y RLS asegura que
// cada usuario solo lea sus propias filas
// (`user_manage_own_notifications` + `admin_all_notifications`).
//
// El facade sincronico + cache in-memory + suscripciones para el UI
// vive en `services/notificationService.ts` y comparte tipos con
// este modulo. Consumidores viejos deben migrar al service.
// ============================================================================

import { getSupabaseClient } from '@/template';
import type {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// Row mapping.
// ---------------------------------------------------------------------------
interface DbNotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  delivery_status: NotificationDeliveryStatus;
  read: boolean;
  read_at: string | null;
  action_route: string | null;
  action_label: string | null;
  ref_type: string | null;
  ref_id: string | null;
  scheduled_for: string | null;
  tone: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  'id, user_id, type, title, message, channel, delivery_status, read, read_at, action_route, action_label, ref_type, ref_id, scheduled_for, tone, icon, created_at, updated_at';

function toModel(row: DbNotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    channel: row.channel,
    deliveryStatus: row.delivery_status,
    read: !!row.read,
    readAt: row.read_at,
    actionRoute: row.action_route,
    actionLabel: row.action_label,
    refType: (row.ref_type as Notification['refType']) ?? null,
    refId: row.ref_id,
    scheduledFor: row.scheduled_for,
    tone: (row.tone as Notification['tone']) ?? 'info',
    icon: row.icon ?? 'notifications',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Args tipados.
// ---------------------------------------------------------------------------
export interface NotificationCreateArgs {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  deliveryStatus?: NotificationDeliveryStatus;
  actionRoute?: string | null;
  actionLabel?: string | null;
  refType?: string | null;
  refId?: string | null;
  scheduledFor?: string | null;
  tone?: string;
  icon?: string;
}

// ---------------------------------------------------------------------------
// Cloud API.
// ---------------------------------------------------------------------------
export const notificationsCloudRepo = {
  async listForUser(userId: string, limit = 100): Promise<Notification[]> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('notifications')
        .select(SELECT_COLS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) {
        console.warn('[notificationsCloudRepo.listForUser] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbNotificationRow));
    } catch (err) {
      console.warn('[notificationsCloudRepo.listForUser] exception', err);
      return [];
    }
  },

  async unreadCountForUser(userId: string): Promise<number> {
    try {
      const sb = getSupabaseClient();
      const { count, error } = await sb
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      if (error) {
        console.warn('[notificationsCloudRepo.unreadCountForUser] error', error.message);
        return 0;
      }
      return count ?? 0;
    } catch (err) {
      console.warn('[notificationsCloudRepo.unreadCountForUser] exception', err);
      return 0;
    }
  },

  async insert(
    args: NotificationCreateArgs,
  ): Promise<{ notification: Notification | null; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const payload: Record<string, unknown> = {
        user_id: args.userId,
        type: args.type,
        title: args.title,
        message: args.message,
        channel: args.channel,
        delivery_status: args.deliveryStatus ?? 'delivered',
        action_route: args.actionRoute ?? null,
        action_label: args.actionLabel ?? null,
        ref_type: args.refType ?? null,
        ref_id: args.refId ?? null,
        scheduled_for: args.scheduledFor ?? null,
        tone: args.tone ?? 'info',
        icon: args.icon ?? 'notifications',
      };
      const { data, error } = await sb
        .from('notifications')
        .insert(payload)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[notificationsCloudRepo.insert] error', error.message);
        return { notification: null, error: error.message };
      }
      return { notification: toModel(data as unknown as DbNotificationRow) };
    } catch (err: any) {
      console.warn('[notificationsCloudRepo.insert] exception', err);
      return { notification: null, error: err?.message ?? 'unknown_error' };
    }
  },

  async markRead(id: string): Promise<{ error?: string }> {
    try {
      const sb = getSupabaseClient();
      const nowIso = new Date().toISOString();
      const { error } = await sb
        .from('notifications')
        .update({
          read: true,
          read_at: nowIso,
          delivery_status: 'read',
          updated_at: nowIso,
        })
        .eq('id', id);
      if (error) {
        console.warn('[notificationsCloudRepo.markRead] error', error.message);
        return { error: error.message };
      }
      return {};
    } catch (err: any) {
      return { error: err?.message ?? 'unknown_error' };
    }
  },

  async markAllReadForUser(userId: string): Promise<{ error?: string }> {
    try {
      const sb = getSupabaseClient();
      const nowIso = new Date().toISOString();
      const { error } = await sb
        .from('notifications')
        .update({
          read: true,
          read_at: nowIso,
          delivery_status: 'read',
          updated_at: nowIso,
        })
        .eq('user_id', userId)
        .eq('read', false);
      if (error) {
        console.warn('[notificationsCloudRepo.markAllReadForUser] error', error.message);
        return { error: error.message };
      }
      return {};
    } catch (err: any) {
      return { error: err?.message ?? 'unknown_error' };
    }
  },
};

// Compat: mantenemos el nombre exportado histórico para el barrel.
export const notificationsRepo = notificationsCloudRepo;
