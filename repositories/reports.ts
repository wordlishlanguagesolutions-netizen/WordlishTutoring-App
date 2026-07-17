// Wordlish · Repositorio de reportes.
// REGLA DURA: un reporte SIEMPRE pertenece a un ClassRecord.
// Crear un reporte fuera de una clase lanza error.
// Ciclo de vida: draft -> sent -> read -> confirmed.

import type { Report, ReportStatus } from '@/types';
import { mockDb, makeId } from '@/services/mockDb';
import { BaseRepository } from './base';
import { classRecordsRepo } from './classes';

type CreateArgs = Omit<Report, 'id' | 'createdAt' | 'updatedAt' | 'submittedAt'>;

class ReportsRepository extends BaseRepository<Report> {
  constructor() {
    super(mockDb.reports);
  }

  createForClass(args: CreateArgs): Report {
    const cr = classRecordsRepo.findById(args.classRecordId);
    if (!cr) throw new Error('No se puede crear un reporte fuera de una clase.');
    const nowIso = new Date().toISOString();
    const r: Report = {
      ...args,
      id: makeId('rep'),
      submittedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this._insert(r);
    classRecordsRepo.attachReport(cr.id, r.id);
    return r;
  }

  updateStatus(id: string, status: ReportStatus): Report | undefined {
    return this._update(id, {
      status,
      updatedAt: new Date().toISOString(),
    } as Partial<Report>);
  }

  listForClass(classRecordId: string): Report[] {
    return this.store.filter((r) => r.classRecordId === classRecordId);
  }

  listForStudent(studentId: string): Report[] {
    return this.store.filter((r) => r.studentId === studentId);
  }

  listForTeacher(teacherId: string): Report[] {
    return this.store.filter((r) => r.teacherId === teacherId);
  }
}

export const reportsRepo = new ReportsRepository();
