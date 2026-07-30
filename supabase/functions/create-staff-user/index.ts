// ============================================================================
// Edge Function · create-staff-user
//
// Acciones soportadas via payload.action:
//   · 'create'         → Crea un usuario (supervisor/teacher/student/guardian)
//                        con rol UNICO. Inserta filas en tablas especificas
//                        (staff, teachers) y envia invitacion por correo
//                        para que el usuario establezca su contrasena.
//   · 'resend_invite'  → Reenvia el enlace/OTP para establecer contrasena.
//
// Solo el admin puede invocar esta funcion. La autorizacion cruza JWT del
// llamante + verificacion contra user_profiles.role='admin'.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface Payload {
  action?: 'create' | 'resend_invite';
  email?: string;
  fullName?: string;
  firstName?: string;
  phone?: string | null;
  role?: 'supervisor' | 'teacher' | 'student' | 'guardian';
  subjects?: string[];
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

async function assertAdmin(
  supabaseUrl: string,
  anonKey: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  authHeader: string,
): Promise<{ ok: true; callerId: string } | { ok: false; status: number; error: string }> {
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return { ok: false, status: 401, error: 'missing_token' };

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
  if (userErr || !userData?.user) return { ok: false, status: 401, error: 'invalid_token' };
  const callerId = userData.user.id;

  const { data: callerProfile, error: profErr } = await supabaseAdmin
    .from('user_profiles')
    .select('role, active')
    .eq('id', callerId)
    .maybeSingle();
  if (profErr || !callerProfile) return { ok: false, status: 403, error: 'forbidden' };
  if (callerProfile.role !== 'admin' || callerProfile.active === false) {
    return { ok: false, status: 403, error: 'forbidden_not_admin' };
  }
  return { ok: true, callerId };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error('[create-staff-user] missing env vars');
    return json(500, { error: 'server_misconfigured' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const authHeader = req.headers.get('Authorization') ?? '';
  const guard = await assertAdmin(supabaseUrl, anonKey, supabaseAdmin, authHeader);
  if (!guard.ok) return json(guard.status, { error: guard.error });

  let payload: Payload = {};
  try { payload = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }

  const action = payload.action ?? 'create';

  // ─── Accion: reenviar invitacion ─────────────────────────────────────────
  if (action === 'resend_invite') {
    const email = String(payload.email ?? '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { error: 'invalid_email' });
    }
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, active')
      .ilike('email', email)
      .maybeSingle();
    if (!profile) return json(404, { error: 'user_not_found' });
    if (profile.active === false) return json(409, { error: 'user_inactive' });

    // Dispara el flujo OTP/enlace de recuperacion. Si SMTP esta configurado,
    // el usuario recibira un correo con el codigo/enlace.
    const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(email);
    if (resetErr) {
      console.warn('[create-staff-user] resend invite error', resetErr.message);
      return json(500, { error: 'invite_send_failed', message: resetErr.message });
    }
    return json(200, { ok: true, invitationSent: true });
  }

  // ─── Accion: crear usuario ───────────────────────────────────────────────
  const email = String(payload.email ?? '').trim().toLowerCase();
  const fullName = String(payload.fullName ?? '').trim();
  const firstName = String(payload.firstName ?? '').trim() || fullName.split(' ')[0] || fullName;
  const phone = typeof payload.phone === 'string' && payload.phone.trim().length > 0
    ? payload.phone.trim() : null;
  const role = payload.role;
  const subjects = Array.isArray(payload.subjects)
    ? payload.subjects.map((s) => String(s).trim()).filter(Boolean)
    : [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'invalid_email' });
  if (!fullName || fullName.length < 2) return json(400, { error: 'invalid_full_name' });
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return json(400, { error: 'invalid_role', message: 'Solo supervisor, teacher, student o guardian.' });
  }

  // Duplicado por email
  const { data: existing } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  if (existing) return json(409, { error: 'email_already_exists' });

  const password = payload.password && payload.password.length >= 8
    ? payload.password
    : genTempPassword();

  const accountType = role === 'supervisor' || role === 'teacher' ? 'staff' : 'student_guardian';

  // 1) Crear usuario en auth.users. app_metadata.admin_created habilita al
  // trigger a asignar el rol solicitado.
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, first_name: firstName, role, account_type: accountType },
    app_metadata: { admin_created: true },
  });

  if (createErr || !created?.user) {
    const msg = createErr?.message ?? 'unknown_error';
    console.error('[create-staff-user] createUser error', msg);
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
      return json(409, { error: 'email_already_exists' });
    }
    return json(500, { error: 'create_failed', message: msg });
  }

  const newUserId = created.user.id;

  // 2) Actualizar phone (el trigger no lo copia).
  if (phone) {
    await supabaseAdmin.from('user_profiles').update({ phone }).eq('id', newUserId).then(({ error }) => {
      if (error) console.warn('[create-staff-user] phone update warn', error.message);
    });
  }

  // 3) Insertar filas en tablas especificas segun el rol. Si falla, revertir.
  let staffId: string | null = null;
  try {
    if (role === 'supervisor' || role === 'teacher') {
      const { data: staffRow, error: staffErr } = await supabaseAdmin
        .from('staff')
        .insert({
          user_id: newUserId,
          full_name: fullName,
          first_name: firstName,
          email,
          phone,
          role,
          active: true,
        })
        .select('id')
        .single();
      if (staffErr || !staffRow) throw new Error(`staff_insert_failed: ${staffErr?.message ?? 'unknown'}`);
      staffId = staffRow.id;

      if (role === 'teacher') {
        const { error: teacherErr } = await supabaseAdmin
          .from('teachers')
          .insert({
            staff_id: staffId,
            user_id: newUserId,
            tier: 'essentials',
            subjects,
            grades: [],
            hourly_rate: 0,
            stats: {},
          });
        if (teacherErr) throw new Error(`teacher_insert_failed: ${teacherErr.message}`);
      }
    } else if (role === 'guardian') {
      const { error: gErr } = await supabaseAdmin
        .from('guardians')
        .insert({
          user_id: newUserId,
          full_name: fullName,
          first_name: firstName,
          email,
          phone: phone ?? '',
        });
      if (gErr) throw new Error(`guardian_insert_failed: ${gErr.message}`);
    }
    // Para 'student' no insertamos aqui: requiere grado/acudiente que el
    // admin registra desde el detalle del estudiante mas adelante.
  } catch (err: any) {
    console.error('[create-staff-user] role-specific insert failed', err?.message);
    // Rollback: elimina el usuario recien creado (cascada limpia user_profiles).
    await supabaseAdmin.auth.admin.deleteUser(newUserId).catch((e) =>
      console.warn('[create-staff-user] rollback deleteUser warn', e?.message),
    );
    return json(500, {
      error: 'profile_insert_failed',
      message: err?.message ?? 'No se pudo crear el perfil especifico del rol.',
    });
  }

  // 4) Enviar invitacion (OTP/enlace) para establecer contrasena. Fallo aqui
  // NO revierte la creacion; el admin puede reenviar desde la UI.
  let invitationSent = false;
  try {
    const { error: inviteErr } = await supabaseAdmin.auth.resetPasswordForEmail(email);
    if (inviteErr) console.warn('[create-staff-user] invitation send warn', inviteErr.message);
    else invitationSent = true;
  } catch (e: any) {
    console.warn('[create-staff-user] invitation exception', e?.message);
  }

  // 5) Devolver perfil final
  const { data: finalProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, full_name, first_name, role, account_type, active, phone, avatar_url, is_primary_admin, created_at, updated_at')
    .eq('id', newUserId)
    .maybeSingle();

  return json(200, {
    ok: true,
    user: finalProfile ?? { id: newUserId, email, full_name: fullName, role },
    temporaryPassword: payload.password ? undefined : password,
    invitationSent,
  });
});
