// Wordlish · Repositorio de reservas (con filtros tipo RLS)
import type { Booking } from '@/types';
import { mockDb, makeId } from '@/services/mockDb';
import { BaseRepository } from './base';
import { SecurityContext, filterBookings } from '@/services/securityService';

class BookingsRepository extends BaseRepository<Booking> {
  constructor() {
    super(mockDb.bookings);
  }

  listAll(): Booking[] {
    return this.list();
  }

  listForUser(ctx: SecurityContext | null): Booking[] {
    return filterBookings(ctx, this.list());
  }

  listForStudent(studentId: string): Booking[] {
    return this.store.filter((b) => b.studentId === studentId);
  }

  listForTeacher(teacherId: string): Booking[] {
    return this.store.filter((b) => b.teacherId === teacherId);
  }

  listForGuardian(studentIds: string[]): Booking[] {
    const ids = new Set(studentIds);
    return this.store.filter((b) => ids.has(b.studentId));
  }

  insert(b: Omit<Booking, 'id'>): Booking {
    const created: Booking = { ...b, id: makeId('bk') } as Booking;
    return this._insert(created);
  }

  update(id: string, patch: Partial<Booking>): Booking | undefined {
    return this._update(id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    } as Partial<Booking>);
  }
}

export const bookingsRepo = new BookingsRepository();
