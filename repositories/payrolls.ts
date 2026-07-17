// Wordlish · Repositorio de liquidaciones mensuales
// Encapsula acceso a mockDb.payrolls. La lógica de cálculo, transiciones
// y notificaciones vive en services/payrollService.ts.

import type { PayrollStatus, TeacherPayroll } from '@/types';
import { mockDb } from '@/services/mockDb';
import { BaseRepository } from './base';

class PayrollsRepository extends BaseRepository<TeacherPayroll> {
  constructor() {
    super(mockDb.payrolls);
  }

  listAll(): TeacherPayroll[] {
    return this.list();
  }

  listForTeacher(teacherId: string): TeacherPayroll[] {
    return this.store.filter((p) => p.teacherId === teacherId);
  }

  listForMonth(monthKey: string): TeacherPayroll[] {
    return this.store.filter((p) => p.month === monthKey);
  }

  listByStatus(status: PayrollStatus): TeacherPayroll[] {
    return this.store.filter((p) => p.status === status);
  }

  findByTeacherAndMonth(
    teacherId: string,
    monthKey: string,
  ): TeacherPayroll | undefined {
    return this.store.find(
      (p) => p.teacherId === teacherId && p.month === monthKey,
    );
  }
}

export const payrollsRepo = new PayrollsRepository();
