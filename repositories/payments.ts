// Wordlish · Repositorio de pagos
import type { Payment, PaymentStatus } from '@/types';
import { mockDb, makeId } from '@/services/mockDb';
import { BaseRepository } from './base';

class PaymentsRepository extends BaseRepository<Payment> {
  constructor() {
    super(mockDb.payments);
  }

  listForStudent(studentId: string): Payment[] {
    return this.store.filter((p) => p.studentId === studentId);
  }

  listForGuardian(guardianId: string): Payment[] {
    return this.store.filter((p) => p.guardianId === guardianId);
  }

  create(p: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Payment {
    const nowIso = new Date().toISOString();
    const payment: Payment = {
      ...p,
      id: makeId('pay'),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    return this._insert(payment);
  }

  markStatus(id: string, status: PaymentStatus, paidAt?: string): Payment | undefined {
    return this._update(id, {
      status,
      paidAt: status === 'paid' ? (paidAt ?? new Date().toISOString()) : null,
      updatedAt: new Date().toISOString(),
    } as Partial<Payment>);
  }
}

export const paymentsRepo = new PaymentsRepository();
