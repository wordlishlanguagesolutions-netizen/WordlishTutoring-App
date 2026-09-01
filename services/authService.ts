import type { UserRole } from '@/constants/roles';
import type { AccountType } from '@/types';

export interface MockUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  accountType: AccountType;
  avatar?: string;
}

const NAMES: Record<UserRole, string> = {
  admin: 'Ana Administradora',
  supervisor: 'Sofía Supervisora',
  teacher: 'Prof. Carlos Ríos',
  student: 'Lucía Estudiante',
  guardian: 'Marta Acudiente',
};

const AVATARS: Record<UserRole, string> = {
  admin: 'https://i.pravatar.cc/150?img=5',
  supervisor: 'https://i.pravatar.cc/150?img=20',
  teacher: 'https://i.pravatar.cc/150?img=68',
  student: 'https://i.pravatar.cc/150?img=47',
  guardian: 'https://i.pravatar.cc/150?img=32',
};

// Mapa email → rol para auto-detección
const EMAIL_TO_ROLE: Record<string, UserRole> = {
  'admin@wordlish.com': 'admin',
  'supervisor@wordlish.com': 'supervisor',
  'profesor@wordlish.com': 'teacher',
  'estudiante@wordlish.com': 'student',
  'acudiente@wordlish.com': 'guardian',
};

// Mapa rol → tipo de cuenta (student_guardian vs staff)
const ROLE_TO_ACCOUNT: Record<UserRole, AccountType> = {
  admin: 'staff',
  supervisor: 'staff',
  teacher: 'staff',
  student: 'student_guardian',
  guardian: 'student_guardian',
};

const MASTER_PASSWORD = '123456';

// Almacenamiento en memoria (Fase 1). En Fase 2: Supabase Auth + secure store.
let currentUser: MockUser | null = null;

export interface SignInResult {
  user?: MockUser;
  error?: string;
}

export const authService = {
  async getCurrentUser(): Promise<MockUser | null> {
    return currentUser;
  },

  /**
   * Sign in con detección automática de rol.
   * Si `expectedAccountType` se pasa, valida que la cuenta pertenezca a ese tipo.
   * Después del login el rol específico (admin/supervisor/teacher o student/guardian)
   * se determina automáticamente por el correo.
   */
  async signIn(
    email: string,
    password: string,
    expectedAccountType?: AccountType,
  ): Promise<SignInResult> {
    const normalized = email.trim().toLowerCase();
    const role = EMAIL_TO_ROLE[normalized];
    if (!role) return { error: 'Correo no reconocido en el sistema.' };
    if (password !== MASTER_PASSWORD) return { error: 'Contraseña incorrecta.' };

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
      fullName: NAMES[role],
      email: normalized,
      role,
      accountType,
      avatar: AVATARS[role],
    };
    currentUser = user;
    return { user };
  },

  async loginAs(role: UserRole): Promise<MockUser> {
    const user: MockUser = {
      id: `mock-${role}-${Date.now()}`,
      fullName: NAMES[role],
      email: `${role}@wordlish.com`,
      role,
      accountType: ROLE_TO_ACCOUNT[role],
      avatar: AVATARS[role],
    };
    currentUser = user;
    return user;
  },

  async logout(): Promise<void> {
    currentUser = null;
  },

  getRoleForEmail(email: string): UserRole | null {
    return EMAIL_TO_ROLE[email.trim().toLowerCase()] ?? null;
  },

  getTestAccounts(accountType?: AccountType) {
    const all = Object.entries(EMAIL_TO_ROLE).map(([email, role]) => ({
      email,
      role,
      accountType: ROLE_TO_ACCOUNT[role],
      name: NAMES[role],
      avatar: AVATARS[role],
    }));
    if (!accountType) return all;
    return all.filter((a) => a.accountType === accountType);
  },
};
