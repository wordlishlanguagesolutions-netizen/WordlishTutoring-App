// ============================================================================
// Wordlish · Notification preferences service.
//
// Preferencias por usuario para elegir por que canales desea recibir sus
// notificaciones. NO crea un segundo sistema: sigue reutilizando
// notificationService (in_app) y pushService (Android). Solo agrega una
// capa de gating antes de disparar cada canal.
//
// Persistencia:
//   · Web  -> localStorage (por navegador/usuario).
//   · Mobile -> memoria en proceso (per sesion). Sufre reset al reabrir.
//     Aceptable para v1: push_android esta ON por defecto y el usuario
//     rara vez lo cambia. Migracion futura a Cloud sin cambiar la UI.
//
// Canales soportados (preparado para escalar):
//   · in_app        · siempre activo, no editable (base del sistema)
//   · push_android  · toggle real (afecta pushService.registerForUser)
//   · sound_web     · toggle real (afecta NotificationsHUD.playBeep)
//   · email         · reservado ("Proximamente"), no editable
//   · whatsapp      · reservado ("Proximamente"), no editable
//   · push_ios      · reservado ("No disponible"), no editable
//
// Contrato publico:
//   getNotifPrefs(userId)                -> NotifPrefs
//   setNotifPref(userId, key, enabled)   -> void
//   subscribeNotifPrefs(cb)              -> unsubscribe
//   isChannelEditable(key)               -> boolean
//   channelStatus(key)                   -> 'available' | 'coming_soon' | 'unavailable'
// ============================================================================

import { Platform } from 'react-native';

export type NotifChannelKey =
  | 'in_app'
  | 'push_android'
  | 'sound_web'
  | 'email'
  | 'whatsapp'
  | 'push_ios';

export interface NotifPrefs {
  in_app: boolean;
  push_android: boolean;
  sound_web: boolean;
  email: boolean;
  whatsapp: boolean;
  push_ios: boolean;
}

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  in_app: true,
  push_android: true,
  sound_web: true,
  email: false,
  whatsapp: false,
  push_ios: false,
};

const STORAGE_KEY = 'wordlish.notif.prefs.v1';

let loaded = false;
let state: Record<string, NotifPrefs> = {};
const listeners = new Set<() => void>();

function safeStorage(): Storage | null {
  if (Platform.OS !== 'web') return null;
  try {
    const w: any = typeof window !== 'undefined' ? window : null;
    return w?.localStorage ?? null;
  } catch {
    return null;
  }
}

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  const ls = safeStorage();
  if (!ls) return;
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      state = parsed as Record<string, NotifPrefs>;
    }
  } catch {
    // no-op
  }
}

function persist(): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // no-op
  }
}

function notify(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[notificationPrefsService] listener error', err);
    }
  });
}

function merge(base: NotifPrefs, patch: Partial<NotifPrefs>): NotifPrefs {
  return { ...base, ...patch, in_app: true };
}

export function getNotifPrefs(userId: string | null | undefined): NotifPrefs {
  ensureLoaded();
  if (!userId) return { ...DEFAULT_NOTIF_PREFS };
  const cur = state[userId];
  if (!cur) return { ...DEFAULT_NOTIF_PREFS };
  return merge(DEFAULT_NOTIF_PREFS, cur);
}

export function setNotifPref(
  userId: string,
  key: NotifChannelKey,
  enabled: boolean,
): void {
  if (!userId) return;
  if (!isChannelEditable(key)) return;
  ensureLoaded();
  const cur = state[userId] ?? { ...DEFAULT_NOTIF_PREFS };
  const next = merge(cur, { [key]: enabled } as Partial<NotifPrefs>);
  state = { ...state, [userId]: next };
  persist();
  notify();
}

export function subscribeNotifPrefs(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function isChannelEditable(key: NotifChannelKey): boolean {
  return key === 'push_android' || key === 'sound_web';
}

export type ChannelStatus = 'available' | 'coming_soon' | 'unavailable';

export function channelStatus(key: NotifChannelKey): ChannelStatus {
  if (key === 'in_app' || key === 'push_android' || key === 'sound_web') {
    return 'available';
  }
  if (key === 'email' || key === 'whatsapp') return 'coming_soon';
  return 'unavailable';
}

// Helpers usados por pushService / HUD para gating.
export function isPushAndroidEnabled(userId: string | null | undefined): boolean {
  return getNotifPrefs(userId).push_android;
}

export function isSoundWebEnabled(userId: string | null | undefined): boolean {
  return getNotifPrefs(userId).sound_web;
}
