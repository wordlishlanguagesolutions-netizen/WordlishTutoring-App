// Wordlish · Repositorio de paquetes de horas
import type { HourPackage } from '@/types';
import { mockDb, makeId } from '@/services/mockDb';
import { BaseRepository } from './base';

class PackagesRepository extends BaseRepository<HourPackage> {
  constructor() {
    super(mockDb.packages);
  }

  listForStudent(studentId: string): HourPackage[] {
    return this.store.filter((p) => p.studentId === studentId && p.active);
  }

  remainingHoursFor(studentId: string): number {
    return this.listForStudent(studentId).reduce(
      (sum, p) => sum + p.remainingHours,
      0,
    );
  }

  consumeHour(studentId: string): boolean {
    const active = this.store.find(
      (p) => p.studentId === studentId && p.active && p.remainingHours > 0,
    );
    if (!active) return false;
    active.remainingHours -= 1;
    active.updatedAt = new Date().toISOString();
    return true;
  }

  restoreHour(studentId: string): void {
    const active = this.store.find(
      (p) => p.studentId === studentId && p.active,
    );
    if (active) {
      active.remainingHours += 1;
      active.updatedAt = new Date().toISOString();
    }
  }

  insert(p: Omit<HourPackage, 'id' | 'createdAt' | 'updatedAt'>): HourPackage {
    const nowIso = new Date().toISOString();
    const pkg: HourPackage = {
      ...p,
      id: makeId('pkg'),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    return this._insert(pkg);
  }
}

export const packagesRepo = new PackagesRepository();
