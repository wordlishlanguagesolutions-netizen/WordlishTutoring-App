import type { UserRole } from '@/constants/roles';
import type { AccountType } from '@/types';
import { getSupabaseClient } from '@/template';

// ============================================================================
// authService · Fase 3A
//
// Servicio dual controlado por `EXPO_PUBLIC_AUTH_MODE`:
//   - 'mock' (default) → comportamiento original en memoria (5 correos de
//     prueba con contraseña maestra 123456). Ideal para desarrollo local
//     mientras no existan cuentas reales.
//   - 'real' → autenticación real contra OnSpace Cloud (Supabase Auth) con
//     sesión persistente, sincronizada con la tabla `public.user_profiles`.
//
// La forma de retorno (`MockUser`, `SignInResult`) NO cambia, para que
// AuthContext, login.tsx y el resto de la app funcionen sin modificaciones.
// ============================================================================

export interface MockUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  accountType: AccountType;
  avatar?: string;
}

export interface SignInResult {
  user?: MockUser;
  error?: string;
}

export interface ResetPasswordResult {
  ok: boolean;
  error?: string;
}

export interface SignUpResult {
  user?: MockUser;
  error?: string;
  needsEmailConfirmation?: boolean;
}

export interface SignUpArgs {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

type AuthMode = 'mock' | 'real';

function resolveAuthMode(): AuthMode {
  const raw = (process.env.EXPO_PUBLIC_AUTH_MODE || '').trim().toLowerCase();
  // Preparación para lanzamiento web: por defecto usamos autenticación
  // real contra OnSpace Cloud. Solo cuando `EXPO_PUBLIC_AUTH_MODE=mock`
  // esté explícito volvemos a la rama mock (para desarrollo local sin
  // cuentas reales). Cualquier otro valor (incluido vacío) = real.
  if (raw === 'mock') return 'mock';
  return 'real';
}

// ----------------------------------------------------------------------------
// Rama MOCK · idéntica a la versión anterior
// ----------------------------------------------------------------------------
const MOCK_NAMES: Record<UserRole, string> = {
  admin: 'Ana Administradora',
  supervisor: 'Sofía Supervisora',
  teacher: 'Prof. Carlos Ríos',
  student: 'Lucía Estudiante',
  guardian: 'Marta Acudiente',
};

const MOCK_AVATARS: Record<UserRole, string> = {
  admin: 'https://i.pravatar.cc/150?img=5',
  supervisor: 'https://i.pravatar.cc/150?img=20',
  teacher: 'https://i.pravatar.cc/150?img=68',
  student: 'https://i.pravatar.cc/150?img=47',
  guardian: 'https://i.pravatar.cc/150?img=32',
};

const MOCK_EMAIL_TO_ROLE: Record<string, UserRole> = {
  'admin@wordlish.com': 'admin',
  'supervisor@wordlish.com': 'supervisor',
  'profesor@wordlish.com': 'teacher',
  'estudiante@wordlish.com': 'student',
  'acudiente@wordlish.com': 'guardian',
};

const ROLE_TO_ACCOUNT: Record<UserRole, AccountType> = {
  admin: 'staff',
  supervisor: 'staff',
  teacher: 'staff',
  student: 'student_guardian',
  guardian: 'student_guardian',
};

const MOCK_MASTER_PASSWORD = '123456';

let mockCurrent: MockUser | null = null;

async function mockGetCurrentUser(): Promise<MockUser | null> {
  return mockCurrent;
}

async function mockSignIn(
  email: string,
  password: string,
  expectedAccountType?: AccountType,
): Promise<SignInResult> {
  const normalized = email.trim().toLowerCase();
  const role = MOCK_EMAIL_TO_ROLE[normalized];
  if (!role) return { error: 'Correo no reconocido en el sistema.' };
  if (password !== MOCK_MASTER_PASSWORD) return { error: 'Contraseña incorrecta.' };

  const accountType = ROLE_TO_ACCOUNT[role];
  if (expectedAccountType && accountType !== expectedAccountType) {
    return {
      error:
        expectedAccountType === 'staff'
          ? 'Esta cuenta no pertenece al staff.'
          : 'Esta cuenta pertenece al staff. Elige la opción correspondiente.',
    };
  }

  const user: MockUser = {
    id: `mock-${role}`,
    fullName: MOCK_NAMES[role],
    email: normalized,
    role,
    accountType,
    avatar: MOCK_AVATARS[role],
  };
  mockCurrent = user;
  return { user };
}

async function mockLoginAs(role: UserRole): Promise<MockUser> {
  const user: MockUser = {
    id: `mock-${role}-${Date.now()}`,
    fullName: MOCK_NAMES[role],
    email: `${role}@wordlish.com`,
    role,
    accountType: ROLE_TO_ACCOUNT[role],
    avatar: MOCK_AVATARS[role],
  };
  mockCurrent = user;
  return user;
}

async function mockLogout(): Promise<void> {
  mockCurrent = null;
}

function mockGetRoleForEmail(email: string): UserRole | null {
  return MOCK_EMAIL_TO_ROLE[email.trim().toLowerCase()] ?? null;
}

function mockGetTestAccounts(accountType?: AccountType) {
  const all = Object.entries(MOCK_EMAIL_TO_ROLE).map(([email, role]) => ({
    email,
    role,
    accountType: ROLE_TO_ACCOUNT[role],
    name: MOCK_NAMES[role],
    avatar: MOCK_AVATARS[role],
  }));
  if (!accountType) return all;
  return all.filter((a) => a.accountType === accountType);
}

// ----------------------------------------------------------------------------
// Rama REAL · Supabase Auth + user_profiles
// ----------------------------------------------------------------------------

function isValidRole(v: unknown): v is UserRole {
  return v === 'admin' || v === 'supervisor' || v === 'teacher' || v === 'student' || v === 'guardian';
}

function isValidAccountType(v: unknown): v is AccountType {
  return v === 'staff' || v === 'student_guardian';
}

async function realFetchProfile(userId: string, email: string): Promise<{ profile: MockUser | null; inactive?: boolean }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, first_name, avatar_url, role, account_type, active')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    // Log discreto y no bloquea: si RLS bloquea o hay 500, dejamos que la UI
    // reporte el error de sesión con el mensaje devuelto en signIn.
    console.warn('[authService][realFetchProfile] error', error.message);
    return { profile: null };
  }
  if (!data) return { profile: null };
  if (!isValidRole(data.role)) return { profile: null };
  // Bloqueo de cuentas desactivadas: el registro existe pero el admin
  // marco `active=false`. Devolvemos flag para que signIn cierre la
  // sesion recien creada y muestre un error claro al usuario.
  if (data.active === false) return { profile: null, inactive: true };

  const accountType: AccountType = isValidAccountType(data.account_type)
    ? data.account_type
    : (data.role === 'admin' || data.role === 'supervisor' || data.role === 'teacher'
        ? 'staff'
        : 'student_guardian');

  return {
    profile: {
      id: data.id,
      fullName: data.full_name || email,
      email: data.email || email,
      role: data.role,
      accountType,
      avatar: data.avatar_url || undefined,
    },
  };
}

async function realGetCurrentUser(): Promise<MockUser | null> {
  const supabase = getSupabaseClient();
  const { data: sessionRes, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('[authService][realGetCurrentUser] getSession error', error.message);
    return null;
  }
  const session = sessionRes?.session;
  if (!session?.user) return null;
  const res = await realFetchProfile(session.user.id, session.user.email || '');
  if (res.inactive) {
    // Sesion residual de una cuenta desactivada: la cerramos para
    // que el usuario vuelva al login y no vea shells vacios.
    await supabase.auth.signOut().catch(() => undefined);
    return null;
  }
  return res.profile;
}

async function realSignIn(
  email: string,
  password: string,
  expectedAccountType?: AccountType,
): Promise<SignInResult> {
  const supabase = getSupabaseClient();
  const normalized = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });
  if (error) {
    // Traducción mínima de los mensajes más frecuentes de Supabase.
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('invalid login credentials')) {
      return { error: 'Correo o contraseña incorrectos.' };
    }
    if (msg.includes('email not confirmed')) {
      return { error: 'Debes confirmar tu correo antes de ingresar.' };
    }
    return { error: error.message || 'No se pudo iniciar sesión.' };
  }
  if (!data.user) return { error: 'No se pudo iniciar sesión.' };

  const res = await realFetchProfile(data.user.id, data.user.email || normalized);
  if (res.inactive) {
    await supabase.auth.signOut().catch(() => undefined);
    return { error: 'Esta cuenta esta desactivada. Contacta al administrador.' };
  }
  const profile = res.profile;
  if (!profile) {
    // Cierra la sesión para no dejar al usuario "logueado sin rol".
    await supabase.auth.signOut().catch(() => undefined);
    return { error: 'Tu cuenta aún no tiene un rol asignado. Contacta al administrador.' };
  }

  if (expectedAccountType && profile.accountType !== expectedAccountType) {
    await supabase.auth.signOut().catch(() => undefined);
    return {
      error:
        expectedAccountType === 'staff'
          ? 'Esta cuenta no pertenece al staff.'
          : 'Esta cuenta pertenece al staff. Elige la opción correspondiente.',
    };
  }

  return { user: profile };
}

async function realLogout(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

async function realResetPassword(email: string): Promise<ResetPasswordResult> {
  const supabase = getSupabaseClient();
  const normalized = email.trim().toLowerCase();
  // OnSpace Auth envia un codigo OTP (no un magic link). El usuario lo
  // introduce en /reset-password. Por eso NO enviamos redirectTo.
  const { error } = await supabase.auth.resetPasswordForEmail(normalized);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function realVerifySignupOtp(email: string, token: string): Promise<SignUpResult> {
  const supabase = getSupabaseClient();
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalized,
    token: token.trim(),
    type: 'signup',
  });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('expired')) return { error: 'El codigo expiro. Solicita uno nuevo.' };
    if (msg.includes('invalid') || msg.includes('token')) return { error: 'Codigo invalido. Verifica los digitos.' };
    return { error: error.message || 'No se pudo verificar el codigo.' };
  }
  if (!data.user) return { error: 'No se pudo verificar la cuenta.' };
  const res = await realFetchProfile(data.user.id, data.user.email || normalized);
  return { user: res.profile ?? undefined };
}

async function realVerifyRecoveryOtp(email: string, token: string): Promise<ResetPasswordResult> {
  const supabase = getSupabaseClient();
  const normalized = email.trim().toLowerCase();
  const { error } = await supabase.auth.verifyOtp({
    email: normalized,
    token: token.trim(),
    type: 'recovery',
  });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('expired')) return { ok: false, error: 'El codigo expiro. Solicita uno nuevo.' };
    if (msg.includes('invalid') || msg.includes('token')) return { ok: false, error: 'Codigo invalido. Verifica los digitos.' };
    return { ok: false, error: error.message || 'No se pudo verificar el codigo.' };
  }
  return { ok: true };
}

async function realResendSignupOtp(email: string): Promise<ResetPasswordResult> {
  const supabase = getSupabaseClient();
  const normalized = email.trim().toLowerCase();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: normalized,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function realSignUp(args: SignUpArgs): Promise<SignUpResult> {
  const supabase = getSupabaseClient();
  const email = args.email.trim().toLowerCase();
  const firstName = args.firstName.trim();
  const lastName = args.lastName.trim();
  const fullName = `${firstName} ${lastName}`.trim() || email;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: args.password,
    options: {
      data: {
        first_name: firstName,
        full_name: fullName,
        // No enviamos role/account_type: el trigger handle_new_user asigna
        // 'student' por defecto. El registro publico nunca crea staff.
      },
    },
  });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('already registered') || msg.includes('already been')) {
      return { error: 'Ya existe una cuenta con este correo.' };
    }
    if (msg.includes('password')) {
      return { error: 'La contrasena no cumple los requisitos minimos.' };
    }
    return { error: error.message || 'No se pudo crear la cuenta.' };
  }
  if (!data.user) return { error: 'No se pudo crear la cuenta.' };

  // Si la sesion viene inmediata (confirmacion de email desactivada),
  // resolvemos el perfil. Si el proyecto exige confirmar, avisamos al usuario.
  if (data.session) {
    const res = await realFetchProfile(data.user.id, email);
    return { user: res.profile ?? undefined };
  }
  return { needsEmailConfirmation: true };
}

// ----------------------------------------------------------------------------
// Fachada pública (misma API para toda la app)
// ----------------------------------------------------------------------------
export const authService = {
  mode: (): AuthMode => resolveAuthMode(),

  isReal: (): boolean => resolveAuthMode() === 'real',

  async getCurrentUser(): Promise<MockUser | null> {
    return resolveAuthMode() === 'real' ? realGetCurrentUser() : mockGetCurrentUser();
  },

  async signIn(
    email: string,
    password: string,
    expectedAccountType?: AccountType,
  ): Promise<SignInResult> {
    return resolveAuthMode() === 'real'
      ? realSignIn(email, password, expectedAccountType)
      : mockSignIn(email, password, expectedAccountType);
  },

  async loginAs(role: UserRole): Promise<MockUser> {
    // `loginAs` es una utilidad de desarrollo exclusiva del modo mock.
    // En modo real no permitimos escalar roles desde el cliente.
    if (resolveAuthMode() === 'real') {
      throw new Error('loginAs solo está disponible en modo mock.');
    }
    return mockLoginAs(role);
  },

  async logout(): Promise<void> {
    return resolveAuthMode() === 'real' ? realLogout() : mockLogout();
  },

  async resetPassword(email: string): Promise<ResetPasswordResult> {
    if (resolveAuthMode() !== 'real') {
      return { ok: false, error: 'Recuperacion disponible solo en modo real.' };
    }
    return realResetPassword(email);
  },

  async signUp(args: SignUpArgs): Promise<SignUpResult> {
    if (resolveAuthMode() !== 'real') {
      return { error: 'El registro publico solo esta disponible en modo real.' };
    }
    return realSignUp(args);
  },

  async updatePassword(newPassword: string): Promise<ResetPasswordResult> {
    if (resolveAuthMode() !== 'real') {
      return { ok: false, error: 'Solo disponible en modo real.' };
    }
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  async verifySignupOtp(email: string, token: string): Promise<SignUpResult> {
    if (resolveAuthMode() !== 'real') {
      return { error: 'Solo disponible en modo real.' };
    }
    return realVerifySignupOtp(email, token);
  },

  async verifyRecoveryOtp(email: string, token: string): Promise<ResetPasswordResult> {
    if (resolveAuthMode() !== 'real') {
      return { ok: false, error: 'Solo disponible en modo real.' };
    }
    return realVerifyRecoveryOtp(email, token);
  },

  async resendSignupOtp(email: string): Promise<ResetPasswordResult> {
    if (resolveAuthMode() !== 'real') {
      return { ok: false, error: 'Solo disponible en modo real.' };
    }
    return realResendSignupOtp(email);
  },

  getRoleForEmail(email: string): UserRole | null {
    // Solo tiene sentido en modo mock (autocompletado de la pantalla de login).
    if (resolveAuthMode() === 'real') return null;
    return mockGetRoleForEmail(email);
  },

  getTestAccounts(accountType?: AccountType) {
    // En modo real no exponemos ninguna cuenta preconfigurada.
    if (resolveAuthMode() === 'real') return [];
    return mockGetTestAccounts(accountType);
  },
};
