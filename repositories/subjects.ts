// ============================================================================
// Wordlish · Repositorio de materias (Cloud real).
//
// Segundo módulo migrado a OnSpace Cloud (después de Expenses). Consume
// directamente `public.subjects` con RLS `authenticated_select_subjects`.
//
// Contrato:
//   - list(): lista de materias activas ordenadas por nombre.
//   - listAll(): incluye desactivadas (uso admin).
//
// Solo lectura por ahora; CRUD de materias es responsabilidad futura del
// panel de admin (#22 del tablero).
// ============================================================================
import { getSupabaseClient } from '@/template';

export interface Subject {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

interface DbSubject {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

function toModel(row: DbSubject): Subject {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    active: row.active,
  };
}

export const subjectsRepo = {
  async list(): Promise<Subject[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('subjects')
        .select('id, code, name, active')
        .eq('active', true)
        .order('name', { ascending: true });
      if (error) {
        console.warn('[subjectsRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as DbSubject));
    } catch (err) {
      console.warn('[subjectsRepo.list] exception', err);
      return [];
    }
  },

  async listAll(): Promise<Subject[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('subjects')
        .select('id, code, name, active')
        .order('name', { ascending: true });
      if (error) {
        console.warn('[subjectsRepo.listAll] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as DbSubject));
    } catch (err) {
      console.warn('[subjectsRepo.listAll] exception', err);
      return [];
    }
  },
};
