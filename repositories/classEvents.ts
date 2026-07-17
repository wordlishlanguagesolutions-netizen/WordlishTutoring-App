// Wordlish · Repositorio del timeline de una clase.
// Cada acción del ciclo de vida (antes/durante/después)
// se registra aquí. Los eventos son inmutables y quedan
// ligados al ClassRecord por classRecordId.

import type { ClassEvent, ClassEventType, SpecificRole } from '@/types';
import { mockDb, makeId } from '@/services/mockDb';

interface AppendArgs {
  classRecordId: string;
  type: ClassEventType;
  actorId: string;
  actorRole: SpecificRole;
  message: string;
  meta?: Record<string, unknown> | null;
}

class ClassEventsRepository {
  private get store(): ClassEvent[] {
    return mockDb.classEvents;
  }

  append(args: AppendArgs): ClassEvent {
    const nowIso = new Date().toISOString();
    const ev: ClassEvent = {
      id: makeId('ev'),
      classRecordId: args.classRecordId,
      type: args.type,
      at: nowIso,
      actorId: args.actorId,
      actorRole: args.actorRole,
      message: args.message,
      meta: args.meta ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.store.push(ev);
    return ev;
  }

  listForClass(classRecordId: string): ClassEvent[] {
    return this.store
      .filter((e) => e.classRecordId === classRecordId)
      .slice()
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  countForClass(classRecordId: string): number {
    return this.store.filter((e) => e.classRecordId === classRecordId).length;
  }
}

export const classEventsRepo = new ClassEventsRepository();
