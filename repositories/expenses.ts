// ============================================================================
// Wordlish · Repositorio de gastos operativos (Cloud real).
//
// A diferencia del resto de repos (aún en `mockDb`), este ya consume la
// tabla `public.expenses` de OnSpace Cloud. Sirve de referencia para migrar
// los demás módulos en Fases 3B–E.
// ============================================================================
import { getSupabaseClient } from '@/template';
import type {
  Expense,
  ExpenseCategory,
  ExpenseFrequency,
  ExpenseStatus,
} from '@/services/financeService';

interface DbExpense {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number | string;
  currency: string;
  frequency: ExpenseFrequency;
  billing_date: string;
  next_billing_date: string;
  method: string;
  status: ExpenseStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toModel(row: DbExpense): Expense {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
    currency: row.currency,
    frequency: row.frequency,
    billingDate: row.billing_date,
    nextBillingDate: row.next_billing_date,
    method: row.method,
    status: row.status,
    notes: row.notes ?? undefined,
  };
}

function toDbPayload(input: Partial<Omit<Expense, 'id'>>) {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.category !== undefined) payload.category = input.category;
  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.currency !== undefined) payload.currency = input.currency;
  if (input.frequency !== undefined) payload.frequency = input.frequency;
  if (input.billingDate !== undefined) payload.billing_date = input.billingDate;
  if (input.nextBillingDate !== undefined) payload.next_billing_date = input.nextBillingDate;
  if (input.method !== undefined) payload.method = input.method;
  if (input.status !== undefined) payload.status = input.status;
  if (input.notes !== undefined) payload.notes = input.notes ?? null;
  return payload;
}

export const expensesRepo = {
  async list(): Promise<Expense[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('next_billing_date', { ascending: true });
      if (error) {
        console.warn('[expensesRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as DbExpense));
    } catch (err) {
      console.warn('[expensesRepo.list] exception', err);
      return [];
    }
  },

  async create(input: Omit<Expense, 'id'>): Promise<Expense | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('expenses')
        .insert(toDbPayload(input))
        .select('*')
        .single();
      if (error) {
        console.warn('[expensesRepo.create] error', error.message);
        return null;
      }
      return toModel(data as DbExpense);
    } catch (err) {
      console.warn('[expensesRepo.create] exception', err);
      return null;
    }
  },

  async update(id: string, patch: Partial<Omit<Expense, 'id'>>): Promise<Expense | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('expenses')
        .update({ ...toDbPayload(patch), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) {
        console.warn('[expensesRepo.update] error', error.message);
        return null;
      }
      return toModel(data as DbExpense);
    } catch (err) {
      console.warn('[expensesRepo.update] exception', err);
      return null;
    }
  },

  async remove(id: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) {
        console.warn('[expensesRepo.remove] error', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[expensesRepo.remove] exception', err);
      return false;
    }
  },
};
