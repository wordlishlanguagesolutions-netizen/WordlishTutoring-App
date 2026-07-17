// Wordlish · Repository base
// Patrón repositorio: encapsula acceso a datos.
// Fase 1: opera contra mockDb en memoria.
// Fase 2: swap a Supabase sin cambiar consumidores.

export abstract class BaseRepository<T extends { id: string }> {
  constructor(protected store: T[]) {}

  protected list(): T[] {
    return [...this.store];
  }

  findById(id: string): T | undefined {
    return this.store.find((x) => x.id === id);
  }

  protected _insert(item: T): T {
    this.store.push(item);
    return item;
  }

  protected _update(id: string, patch: Partial<T>): T | undefined {
    const idx = this.store.findIndex((x) => x.id === id);
    if (idx < 0) return undefined;
    this.store[idx] = { ...this.store[idx], ...patch };
    return this.store[idx];
  }

  protected _delete(id: string): boolean {
    const idx = this.store.findIndex((x) => x.id === id);
    if (idx < 0) return false;
    this.store.splice(idx, 1);
    return true;
  }
}
