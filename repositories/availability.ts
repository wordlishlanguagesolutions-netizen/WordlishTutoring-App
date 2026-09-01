// Wordlish · Repositorio de disponibilidad de profesores
import type { TeacherAvailability } from '@/types';
import { mockDb } from '@/services/mockDb';
import { BaseRepository } from './base';

class AvailabilityRepository extends BaseRepository<TeacherAvailability> {
  constructor() {
    super(mockDb.availability);
  }

  getForTeacher(teacherId: string): TeacherAvailability[] {
    return this.store.filter((a) => a.teacherId === teacherId);
  }

  getSlots(teacherId: string, weekday: number): string[] {
    return (
      this.store.find(
        (a) => a.teacherId === teacherId && a.weekday === weekday,
      )?.slots ?? []
    );
  }

  publish(
    teacherId: string,
    weekday: number,
    slots: string[],
  ): TeacherAvailability {
    const existing = this.store.find(
      (a) => a.teacherId === teacherId && a.weekday === weekday,
    );
    const nowIso = new Date().toISOString();
    if (existing) {
      existing.slots = slots;
      existing.publishedAt = nowIso;
      existing.updatedAt = nowIso;
      return existing;
    }
    const record: TeacherAvailability = {
      id: `av-${teacherId}-${weekday}-${Date.now()}`,
      teacherId,
      weekday,
      slots,
      publishedAt: nowIso,
      weekStart: nowIso.split('T')[0],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this._insert(record);
    return record;
  }
}

export const availabilityRepo = new AvailabilityRepository();
