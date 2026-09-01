// Wordlish · Push notification service (stub)
// Fase 1: sin conexión real. Prepara la interfaz.
// Fase 2: se conecta con expo-notifications + Supabase Edge Functions
// para persistir tokens y despachar payloads.

import type { NotificationType } from '@/types';

export interface PushToken {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  registeredAt: string;
}

const tokens: PushToken[] = [];

export const pushService = {
  async registerDevice(userId: string, platform: PushToken['platform']): Promise<PushToken> {
    // Fase 2: solicitar permiso, obtener Expo Push Token,
    // persistir en tabla push_tokens de Supabase.
    const existing = tokens.find((t) => t.userId === userId && t.platform === platform);
    if (existing) return existing;
    const token: PushToken = {
      userId,
      token: `stub-${userId}-${Date.now()}`,
      platform,
      registeredAt: new Date().toISOString(),
    };
    tokens.push(token);
    return token;
  },

  async unregisterDevice(userId: string): Promise<void> {
    const idx = tokens.findIndex((t) => t.userId === userId);
    if (idx >= 0) tokens.splice(idx, 1);
  },

  async send(
    _userId: string,
    _type: NotificationType,
    _payload: Record<string, unknown>,
  ): Promise<{ ok: boolean; queued: boolean }> {
    // Fase 2: invocar Edge Function que despache push real (FCM / APNs)
    return { ok: true, queued: true };
  },

  getTokens(userId: string): PushToken[] {
    return tokens.filter((t) => t.userId === userId);
  },
};
