// Wordlish · Repositorio de screenshots.
// REGLA DURA: un screenshot SIEMPRE pertenece a un ClassRecord.

import type { Screenshot } from '@/types';
import { mockDb, makeId } from '@/services/mockDb';
import { BaseRepository } from './base';
import { classRecordsRepo } from './classes';

type CreateArgs = Omit<
  Screenshot,
  'id' | 'createdAt' | 'updatedAt' | 'capturedAt' | 'verified'
>;

class ScreenshotsRepository extends BaseRepository<Screenshot> {
  constructor() {
    super(mockDb.screenshots);
  }

  createForClass(args: CreateArgs): Screenshot {
    const cr = classRecordsRepo.findById(args.classRecordId);
    if (!cr) throw new Error('No se puede crear screenshot fuera de una clase.');
    const nowIso = new Date().toISOString();
    const s: Screenshot = {
      ...args,
      id: makeId('scr'),
      capturedAt: nowIso,
      verified: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this._insert(s);
    classRecordsRepo.attachScreenshot(cr.id, s.id);
    return s;
  }

  markVerified(id: string): Screenshot | undefined {
    return this._update(id, {
      verified: true,
      updatedAt: new Date().toISOString(),
    } as Partial<Screenshot>);
  }

  listForClass(classRecordId: string): Screenshot[] {
    return this.store.filter((s) => s.classRecordId === classRecordId);
  }
}

export const screenshotsRepo = new ScreenshotsRepository();
