// ============================================================================
// Wordlish · Repositorio de configuración global (Cloud real).
//
// Lee y escribe en `public.app_settings`. Toda la app consume estas claves
// a través de `services/appSettingsService.ts` (que añade caché,
// hidratación idempotente y suscripciones).
//
// RLS activo:
//   - admin_all_app_settings
//   - authenticated_select_public_settings (para claves `is_public=true`)
// ============================================================================
import { getSupabaseClient } from '@/template';

export interface AppSetting {
  key: string;
  value: unknown;
  description?: string;
  isPublic: boolean;
}

interface DbRow {
  key: string;
  value: unknown;
  description: string | null;
  is_public: boolean;
}

function toModel(r: DbRow): AppSetting {
  return {
    key: r.key,
    value: r.value,
    description: r.description ?? undefined,
    isPublic: r.is_public,
  };
}

export const appSettingsRepo = {
  async list(): Promise<AppSetting[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('app_settings').select('*');
      if (error) {
        console.warn('[appSettingsRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as DbRow));
    } catch (err) {
      console.warn('[appSettingsRepo.list] exception', err);
      return [];
    }
  },

  async upsert(key: string, value: unknown): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      // Intentamos update primero (la clave existe en el seed). Si no existe,
      // hacemos insert. Evitamos `upsert()` para no requerir permisos extra.
      const { data, error } = await supabase
        .from('app_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key)
        .select('key');
      if (error) {
        console.warn('[appSettingsRepo.upsert.update] error', error.message);
        return false;
      }
      if (data && data.length > 0) return true;

      const { error: insErr } = await supabase
        .from('app_settings')
        .insert({ key, value, is_public: true });
      if (insErr) {
        console.warn('[appSettingsRepo.upsert.insert] error', insErr.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[appSettingsRepo.upsert] exception', err);
      return false;
    }
  },
};
