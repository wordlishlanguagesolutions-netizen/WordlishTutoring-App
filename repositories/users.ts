// Wordlish · Repositorio de usuarios
import type { UserProfile } from '@/types';
import { mockDb } from '@/services/mockDb';
import { BaseRepository } from './base';
import { SecurityContext, canViewUser } from '@/services/securityService';

class UsersRepository extends BaseRepository<UserProfile> {
  constructor() {
    super(mockDb.users);
  }

  listVisibleTo(ctx: SecurityContext | null): UserProfile[] {
    if (!ctx) return [];
    if (ctx.role === 'admin') return this.list();
    return this.list().filter((u) => canViewUser(ctx, u.id));
  }

  findByEmail(email: string): UserProfile | undefined {
    return this.store.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
    );
  }

  findByRole(role: UserProfile['role']): UserProfile[] {
    return this.store.filter((u) => u.role === role);
  }
}

export const usersRepo = new UsersRepository();
