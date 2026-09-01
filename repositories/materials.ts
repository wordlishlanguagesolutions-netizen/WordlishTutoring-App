// Wordlish · Repositorio de materiales.
// REGLA DURA: un material SIEMPRE pertenece a un ClassRecord.

import type { Material } from '@/types';
import { mockDb, makeId } from '@/services/mockDb';
import { BaseRepository } from './base';
import { classRecordsRepo } from './classes';

type CreateArgs = Omit<Material, 'id' | 'createdAt' | 'updatedAt'>;

class MaterialsRepository extends BaseRepository<Material> {
  constructor() {
    super(mockDb.materials);
  }

  createForClass(args: CreateArgs): Material {
    const cr = classRecordsRepo.findById(args.classRecordId);
    if (!cr) throw new Error('No se puede crear material fuera de una clase.');
    const nowIso = new Date().toISOString();
    const m: Material = {
      ...args,
      id: makeId('mat'),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this._insert(m);
    classRecordsRepo.attachMaterial(cr.id, m.id);
    return m;
  }

  listForClass(classRecordId: string): Material[] {
    return this.store.filter((m) => m.classRecordId === classRecordId);
  }

  listForStudent(studentId: string): Material[] {
    return this.store.filter((m) => m.studentId === studentId);
  }
}

export const materialsRepo = new MaterialsRepository();
