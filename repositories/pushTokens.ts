// ============================================================================
// Wordlish · Repositorio de push_tokens (Cloud real).
//
// Cliente RLS-safe: cada usuario solo administra sus propias filas
// (policy `user_manage_own_push_tokens`). Uso principal: registrar y
// desregistrar el Expo Push Token del dispositivo actual.
//
// La limpieza de tokens invalidos (DeviceNotRegistered) se hace en la
// Edge Function `send-push` con service role.
// ============================================================================

import { getSupabaseClient } from '@/template';

export type PushPlatform = 'ios' | 'android' | 'web';

export const pushTokensRepo = {
  /**
   * Upsert idempotente. Actualiza `last_seen_at` si ya existe la
   * tripleta (user_id, platform, token); inserta si no.
   */
  async upsert(args: {
    userId: string;
    platform: PushPlatform;
    token: string;
  }): Promise<{ ok: boolean; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const nowIso = new Date().toISOString();
      const { data: existing, error: selErr } = await sb
        .from('push_tokens')
        .select('id')
        .eq('user_id', args.userId)
        .eq('platform', args.platform)
        .eq('token', args.token)
        .maybeSingle();
      if (selErr) return { ok: false, error: selErr.message };
      if (existing?.id) {
        const { error } = await sb
          .from('push_tokens')
          .update({ last_seen_at: nowIso, updated_at: nowIso })
          .eq('id', existing.id);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }
      const { error } = await sb.from('push_tokens').insert({
        user_id: args.userId,
        platform: args.platform,
        token: args.token,
        last_seen_at: nowIso,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'unknown_error' };
    }
  },

  /**
   * Elimina el token del dispositivo actual (logout). Solo puede
   * borrar filas del propio usuario por RLS.
   */
  async remove(args: { token: string }): Promise<void> {
    try {
      const sb = getSupabaseClient();
      await sb.from('push_tokens').delete().eq('token', args.token);
    } catch {
      // no-op
    }
  },
};
