// ============================================================================
// Wordlish · Push Notification Service (Android · FCM V1 · MVP).
//
// - Solo Android. iOS/APNs queda desactivado a proposito.
// - Reutiliza Notifications Cloud (public.notifications) y el Centro
//   de Actividad existente. El push complementa al canal in_app.
// - Registro seguro del Expo Push Token en public.push_tokens
//   (policy `user_manage_own_push_tokens`).
// - Envio delegado a la Edge Function `send-push` (service role) para
//   que RLS no bloquee la lectura de tokens de otros usuarios y para
//   limpiar tokens invalidos (DeviceNotRegistered).
// - Tap: al tocar la notificacion se navega al `actionRoute` recibido
//   en el payload data.
//
// Tipos con push habilitado (los demas quedan solo in_app):
//   class_reminder_15m, class_starting, payment_confirmed,
//   payment_pending (rechazo/pendiente), new_report, new_material,
//   system (usado para "horas bajas" y otros avisos criticos).
// ============================================================================

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import type { NotificationType } from '@/types';
import { getSupabaseClient } from '@/template';
import { pushTokensRepo } from '@/repositories/pushTokens';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(id: string | null | undefined): boolean {
  return typeof id === 'string' && UUID_RE.test(id);
}

const PUSH_ENABLED_TYPES: Set<NotificationType> = new Set([
  'class_reminder_15m',
  'class_starting',
  'payment_confirmed',
  'payment_pending',
  'new_report',
  'new_material',
  'system',
]);

export function isPushEnabledType(type: NotificationType): boolean {
  return PUSH_ENABLED_TYPES.has(type);
}

// Estado local (por proceso). El token real persiste en Cloud.
let currentToken: string | null = null;
let currentUserId: string | null = null;
let handlerReady = false;
let responseSub: Notifications.Subscription | null = null;
let tapHandler: ((route: string | null) => void) | null = null;

// ---------------------------------------------------------------------------
// Runtime setup del comportamiento en foreground y del canal Android.
// Idempotente: se llama al montar PushBootstrap.
// ---------------------------------------------------------------------------
async function ensureHandler(): Promise<void> {
  if (handlerReady) return;
  handlerReady = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      } as any),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Wordlish',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }
  } catch (err) {
    console.warn('[pushService.ensureHandler] error', err);
  }
}

// ---------------------------------------------------------------------------
// Instala el listener de tap y procesa la ultima interaccion (cold start).
// ---------------------------------------------------------------------------
export async function setup(
  onTapRoute: (route: string | null) => void,
): Promise<void> {
  if (Platform.OS !== 'android') return;
  tapHandler = onTapRoute;
  await ensureHandler();

  if (responseSub) {
    try {
      responseSub.remove();
    } catch {
      // no-op
    }
    responseSub = null;
  }
  try {
    responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response?.notification?.request?.content?.data ?? {};
        const route =
          typeof (data as any).actionRoute === 'string'
            ? ((data as any).actionRoute as string)
            : null;
        tapHandler?.(route);
      },
    );
    // Cold start: si la app se abrio desde una notificacion.
    const last = await Notifications.getLastNotificationResponseAsync();
    if (last) {
      const data = last.notification.request.content.data ?? {};
      const route =
        typeof (data as any).actionRoute === 'string'
          ? ((data as any).actionRoute as string)
          : null;
      if (route) {
        // Retraso pequeno para dar tiempo a que el router monte.
        setTimeout(() => tapHandler?.(route), 300);
      }
    }
  } catch (err) {
    console.warn('[pushService.setup] error', err);
  }
}

function resolveProjectId(): string | undefined {
  const fromExtra =
    (Constants.expoConfig as any)?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;
  return typeof fromExtra === 'string' && fromExtra.length > 0
    ? fromExtra
    : undefined;
}

// ---------------------------------------------------------------------------
// Registra el dispositivo para el usuario indicado. Idempotente.
// Solo procede si:
//   · Platform === 'android'
//   · userId es UUID real (no mock)
//   · el usuario acepta el permiso
// ---------------------------------------------------------------------------
export async function registerForUser(
  userId: string,
): Promise<{ ok: boolean; token?: string; error?: string }> {
  if (Platform.OS !== 'android') {
    return { ok: false, error: 'not_android' };
  }
  if (!isUuid(userId)) {
    return { ok: false, error: 'not_real_user' };
  }
  try {
    await ensureHandler();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') {
      return { ok: false, error: 'permission_denied' };
    }

    const projectId = resolveProjectId();
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResp?.data;
    if (!token) {
      return { ok: false, error: 'no_token' };
    }

    // Si el mismo dispositivo cambio de usuario en esta sesion, limpia
    // el token anterior antes de registrar el nuevo (solo puede borrar
    // filas propias por RLS; suficiente para el flujo login/logout).
    if (currentToken && currentUserId && currentUserId !== userId) {
      await pushTokensRepo.remove({ token: currentToken });
    }

    const up = await pushTokensRepo.upsert({
      userId,
      platform: 'android',
      token,
    });
    if (!up.ok) {
      return { ok: false, error: up.error ?? 'upsert_failed' };
    }
    currentToken = token;
    currentUserId = userId;
    return { ok: true, token };
  } catch (err: any) {
    console.warn('[pushService.registerForUser] exception', err);
    return { ok: false, error: err?.message ?? 'exception' };
  }
}

// ---------------------------------------------------------------------------
// Desregistra el dispositivo actual (logout).
// ---------------------------------------------------------------------------
export async function unregisterCurrentDevice(): Promise<void> {
  if (!currentToken) return;
  await pushTokensRepo.remove({ token: currentToken });
  currentToken = null;
  currentUserId = null;
}

// ---------------------------------------------------------------------------
// Envio de push. Delega a la Edge Function `send-push` con service role.
// Fire-and-forget: no bloquea la creacion de la notificacion in_app.
// ---------------------------------------------------------------------------
interface SendPayload {
  title: string;
  body: string;
  actionRoute?: string | null;
  refType?: string | null;
  refId?: string | null;
}

async function invokeSendPush(
  userId: string,
  type: NotificationType,
  payload: SendPayload,
): Promise<void> {
  try {
    const sb = getSupabaseClient();
    await sb.functions.invoke('send-push', {
      body: {
        userId,
        type,
        title: payload.title,
        body: payload.body,
        data: {
          actionRoute: payload.actionRoute ?? null,
          refType: payload.refType ?? null,
          refId: payload.refId ?? null,
          type,
        },
      },
    });
  } catch (err) {
    console.warn('[pushService.invokeSendPush] error', err);
  }
}

export const pushService = {
  /**
   * Compat con la firma historica (userId, type, payload). Solo dispara
   * push cuando el tipo esta habilitado y el destinatario es un UUID
   * real. El resto se queda como notificacion in_app.
   */
  send(
    userId: string,
    type: NotificationType,
    payload: SendPayload,
  ): { ok: boolean; queued: boolean } {
    if (!isUuid(userId)) return { ok: true, queued: false };
    if (!isPushEnabledType(type)) return { ok: true, queued: false };
    // No await: el emisor no debe bloquearse por la latencia de la
    // Edge Function ni por errores de red.
    void invokeSendPush(userId, type, payload);
    return { ok: true, queued: true };
  },

  registerForUser,
  unregisterCurrentDevice,
  setup,
  isPushEnabledType,
};
