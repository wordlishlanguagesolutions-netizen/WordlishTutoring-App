// ============================================================================
// Wordlish · Servicio de tickets de soporte (Cloud real).
//
// Consume public.support_tickets con hidratacion asincrona, cache en memoria
// y subscribers. Habilita registro y consulta de solicitudes de contacto
// sin necesidad de crear una tabla `contact_requests` separada.
//
// Casos de uso:
//   - SupportRow (WhatsApp) crea un ticket fire-and-forget para dejar
//     trazabilidad de todo contacto, aunque la conversacion siga por
//     WhatsApp. Ver components/ui/SupportRow.tsx.
//   - Admin/supervisor listan tickets (RLS `admin_all_support_tickets` y
//     `supervisor_manage_support_tickets`) para dar seguimiento.
//
// Contrato:
//   - createSupportTicket(input): insert directo con RLS
//     `user_insert_own_ticket` (user_id = auth.uid()).
//   - hydrateSupportTickets(force?): idempotente, deduplica.
//   - subscribeSupportTickets(cb): notifica al refrescar el cache.
//   - getSupportTickets() / getOpenSupportTickets(): snapshots sincronos.
//   - resetSupportTicketsCache(): usado en logout.
// ============================================================================

import { getSupabaseClient } from '@/template';

export interface SupportTicketItem {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigneeId: string | null;
  channel: string;
  refType: string | null;
  refId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface CreateSupportTicketInput {
  userId: string;
  subject: string;
  description: string;
  category?: string;
  priority?: string;
  channel?: 'in_app' | 'whatsapp' | 'email' | 'web_form';
  refType?: string | null;
  refId?: string | null;
}

let cache: SupportTicketItem[] = [];
let hydrated = false;
let inflight: Promise<SupportTicketItem[]> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[supportTicketsService.notify] listener error', err);
    }
  });
}

function toModel(row: any): SupportTicketItem {
  return {
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    description: row.description,
    category: row.category ?? 'general',
    priority: row.priority ?? 'normal',
    status: row.status ?? 'open',
    assigneeId: row.assignee_id,
    channel: row.channel ?? 'in_app',
    refType: row.ref_type,
    refId: row.ref_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  };
}

export async function createSupportTicket(
  input: CreateSupportTicketInput,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: input.userId,
        subject: input.subject,
        description: input.description,
        category: input.category ?? 'general',
        priority: input.priority ?? 'normal',
        status: 'open',
        channel: input.channel ?? 'in_app',
        ref_type: input.refType ?? null,
        ref_id: input.refId ?? null,
      })
      .select('id')
      .single();
    if (error) {
      console.warn('[supportTicketsService.create] error', error.message);
      return { ok: false, error: error.message };
    }
    // Refresh best-effort para admin/supervisor.
    void hydrateSupportTickets(true).catch(() => undefined);
    return { ok: true, id: data?.id };
  } catch (err: any) {
    console.warn('[supportTicketsService.create] exception', err);
    return { ok: false, error: err?.message ?? 'unknown_error' };
  }
}

export function getSupportTickets(): SupportTicketItem[] {
  return cache;
}

export function getOpenSupportTickets(): SupportTicketItem[] {
  return cache.filter((t) => t.status !== 'resolved' && t.status !== 'closed');
}

export function getSupportTicketsVersion(): number {
  return version;
}

export function isSupportTicketsHydrated(): boolean {
  return hydrated;
}

export function subscribeSupportTickets(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function hydrateSupportTickets(
  force = false,
): Promise<SupportTicketItem[]> {
  if (hydrated && !force) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('support_tickets')
        .select(
          'id, user_id, subject, description, category, priority, status, assignee_id, channel, ref_type, ref_id, created_at, updated_at, resolved_at',
        )
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) {
        console.warn('[supportTicketsService.hydrate] error', error.message);
        cache = [];
      } else {
        cache = (data ?? []).map(toModel);
      }
      hydrated = true;
    } catch (err) {
      console.warn('[supportTicketsService.hydrate] exception', err);
      cache = [];
      hydrated = true;
    } finally {
      inflight = null;
    }
    notify();
    return cache;
  })();
  return inflight;
}

export function resetSupportTicketsCache(): void {
  cache = [];
  hydrated = false;
  inflight = null;
  notify();
}

// ---------------------------------------------------------------------------
// Mutacion: marcar ticket como resuelto.
// Optimistic (actualiza status en cache) + Cloud UPDATE. Si falla, rollback.
// RLS: `admin_all_support_tickets` y `supervisor_manage_support_tickets`.
// ---------------------------------------------------------------------------
export async function resolveSupportTicket(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const prev = cache;
  const now = new Date().toISOString();
  cache = cache.map((t) =>
    t.id === id ? { ...t, status: 'resolved', resolvedAt: now } : t,
  );
  notify();
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'resolved', resolved_at: now })
      .eq('id', id);
    if (error) {
      cache = prev;
      notify();
      return { ok: false, error: error.message };
    }
    void hydrateSupportTickets(true).catch(() => undefined);
    return { ok: true };
  } catch (err: any) {
    cache = prev;
    notify();
    return { ok: false, error: err?.message ?? 'unknown_error' };
  }
}

export async function reopenSupportTicket(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const prev = cache;
  cache = cache.map((t) =>
    t.id === id ? { ...t, status: 'open', resolvedAt: null } : t,
  );
  notify();
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'open', resolved_at: null })
      .eq('id', id);
    if (error) {
      cache = prev;
      notify();
      return { ok: false, error: error.message };
    }
    void hydrateSupportTickets(true).catch(() => undefined);
    return { ok: true };
  } catch (err: any) {
    cache = prev;
    notify();
    return { ok: false, error: err?.message ?? 'unknown_error' };
  }
}
