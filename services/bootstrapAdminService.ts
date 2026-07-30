// ============================================================================
// Wordlish · Bootstrap Admin (primer administrador principal)
//
// Invoca la RPC `bootstrap_primary_admin(p_email)` que:
//   - Falla si ya existe un admin principal (idempotente, seguro).
//   - Promueve la cuenta indicada a role='admin' + is_primary_admin=true.
//
// Este servicio NO establece contrasenas. Tras el bootstrap, dispara el
// flujo de restablecimiento por correo (OTP/enlace de Supabase Auth) para
// que el usuario cree su propia contrasena sin exponerla en codigo.
// ============================================================================

import { getSupabaseClient } from '@/template';

export interface BootstrapAdminResult {
  ok: boolean;
  userId?: string;
  email?: string;
  message?: string;
  error?: string;
  passwordEmailSent?: boolean;
}

/**
 * Consulta rapida (RPC publica) para saber si ya existe un admin principal.
 * Se usa para ocultar la opcion de bootstrap en la UI cuando ya esta hecha.
 */
export async function primaryAdminExists(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('primary_admin_exists');
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

function translate(code: string, fallback?: string): string {
  switch (code) {
    case 'invalid_email':          return 'El correo no es valido.';
    case 'primary_admin_exists':   return 'Ya existe un administrador principal. Solicita una transferencia oficial.';
    case 'user_not_found':         return 'No existe una cuenta con ese correo. Registrate primero y luego reintenta.';
    default:                       return fallback ?? 'No se pudo completar el bootstrap.';
  }
}

/**
 * Ejecuta el bootstrap del administrador principal.
 * Si tiene exito, dispara automaticamente el envio del correo de
 * restablecimiento de contrasena para que el usuario la establezca de
 * forma segura via el flujo oficial de Supabase.
 */
export async function bootstrapPrimaryAdmin(email: string): Promise<BootstrapAdminResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, error: 'El correo no es valido.' };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('bootstrap_primary_admin', { p_email: normalized });
  if (error) {
    return { ok: false, error: error.message || 'No se pudo ejecutar el bootstrap.' };
  }
  const payload = (data as any) ?? {};
  if (!payload.ok) {
    return {
      ok: false,
      error: translate(payload.error ?? 'unknown', payload.message),
    };
  }

  // Bootstrap correcto. Enviar correo para establecer contrasena segura.
  // Timeout defensivo: si el proveedor SMTP no responde, no bloqueamos la UI.
  let passwordEmailSent = false;
  try {
    const resetPromise = supabase.auth.resetPasswordForEmail(normalized);
    const timeout = new Promise<{ error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ error: { message: 'timeout' } }), 8000),
    );
    const res: any = await Promise.race([resetPromise, timeout]);
    if (res && !res.error) passwordEmailSent = true;
    else if (res?.error?.message) console.warn('[bootstrapAdminService] reset email warn', res.error.message);
  } catch (e: any) {
    console.warn('[bootstrapAdminService] reset email exception', e?.message);
  }

  return {
    ok: true,
    userId: payload.user_id,
    email: normalized,
    message: payload.message,
    passwordEmailSent,
  };
}
