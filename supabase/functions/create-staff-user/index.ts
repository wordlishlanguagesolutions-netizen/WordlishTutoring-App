// ============================================================================
// Edge Function · create-staff-user
//
// Crea un usuario del staff (supervisor, teacher, student, guardian) con un
// unico rol asignado. Solo el rol admin puede invocarla.
//
// Pipeline:
//   1. Valida JWT y que el caller sea admin (via user_profiles).
//   2. Valida payload (email, role, fullName).
//   3. Verifica que no exista otro perfil con ese email (case-insensitive).
//   4. Crea el usuario via supabaseAdmin.auth.admin.createUser con
//      raw_app_meta_data.admin_created = true y raw_user_meta_data.role.
//   5. El trigger handle_new_user crea la fila en user_profiles con el rol
//      solicitado (permitido gracias al flag admin_created).
//
// Restricciones:
//   · No permite crear admin (solo transferencia oficial).
//   · Solo un rol por usuario (garantizado por el schema: role es un enum
//     unico en user_profiles).
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface Payload {
  email?: string;
  fullName?: string;
  firstName?: string;
  phone?: string | null;
  role?: 'supervisor' | 'teacher' | 'student' | 'guardian';
  password?: string;
}

const ALLOWED_ROLES = ['supervisor', 'teacher', 'student', 'guardian'] as const;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function genTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let out = '';
  for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error('[create-staff-user] missing env vars');
    return json(500, { error: 'server_misconfigured' });
  }

  // 1) Validar JWT y rol admin
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return json(401, { error: 'missing_token' });

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
  if (userErr || !userData?.user) {
    console.warn('[create-staff-user] invalid token', userErr?.message);
    return json(401, { error: 'invalid_token' });
  }
  const callerId = userData.user.id;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Verificar rol admin
  const { data: callerProfile, error: profErr } = await supabaseAdmin
    .from('user_profiles')
    .select('role, active')
    .eq('id', callerId)
    .maybeSingle();
  if (profErr || !callerProfile) {
    return json(403, { error: 'forbidden' });
  }
  if (callerProfile.role !== 'admin' || callerProfile.active === false) {
    return json(403, { error: 'forbidden_not_admin' });
  }

  // 2) Payload
  let payload: Payload = {};
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const email = String(payload.email ?? '').trim().toLowerCase();
  const fullName = String(payload.fullName ?? '').trim();
  const firstName = String(payload.firstName ?? '').trim() || fullName.split(' ')[0] || fullName;
  const phoneRaw = payload.phone;
  const phone = typeof phoneRaw === 'string' && phoneRaw.trim().length > 0 ? phoneRaw.trim() : null;
  const role = payload.role;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: 'invalid_email' });
  }
  if (!fullName || fullName.length < 2) {
    return json(400, { error: 'invalid_full_name' });
  }
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return json(400, { error: 'invalid_role', message: 'Solo supervisor, teacher, student o guardian.' });
  }

  // 3) Duplicado por email
  const { data: existing, error: existErr } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email')
    .ilike('email', email)
    .maybeSingle();
  if (existErr) {
    console.warn('[create-staff-user] existing check error', existErr.message);
  }
  if (existing) {
    return json(409, { error: 'email_already_exists', message: 'Ya existe un usuario con este correo.' });
  }

  // 4) Crear via Admin API. app_metadata.admin_created es leido por el
  // trigger handle_new_user para permitir asignar cualquier rol valido.
  const password = payload.password && payload.password.length >= 8
    ? payload.password
    : genTempPassword();

  const accountType = role === 'supervisor' || role === 'teacher' ? 'staff' : 'student_guardian';

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      first_name: firstName,
      role,
      account_type: accountType,
    },
    app_metadata: {
      admin_created: true,
    },
  });

  if (createErr || !created?.user) {
    const msg = createErr?.message ?? 'unknown_error';
    console.error('[create-staff-user] createUser error', msg);
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
      return json(409, { error: 'email_already_exists', message: 'Ya existe un usuario con este correo.' });
    }
    return json(500, { error: 'create_failed', message: msg });
  }

  const newUserId = created.user.id;

  // 5) Actualizar phone (el trigger no lo copia).
  if (phone) {
    const { error: updErr } = await supabaseAdmin
      .from('user_profiles')
      .update({ phone })
      .eq('id', newUserId);
    if (updErr) console.warn('[create-staff-user] phone update warn', updErr.message);
  }

  // 6) Devolver perfil final
  const { data: finalProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, full_name, first_name, role, account_type, active, phone, avatar_url, is_primary_admin, created_at, updated_at')
    .eq('id', newUserId)
    .maybeSingle();

  return json(200, {
    ok: true,
    user: finalProfile ?? { id: newUserId, email, full_name: fullName, role },
    temporaryPassword: payload.password ? undefined : password,
  });
});
