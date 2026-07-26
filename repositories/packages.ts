// ============================================================================
// Wordlish · Repositorio de paquetes de horas (Cloud real) — Módulo #8.
//
// Capa async pura sobre `public.hour_packages`. El facade sincrónico
// (`packagesRepo`) para consumidores legacy se expone desde
// `services/packagesService.ts` y comparte cache.
// ============================================================================

import { getSupabaseClient } from '@/template';
import type { HourPackage } from '@/types';

interface DbPackageRow {
  id: string;
  student_id: string;
  guardian_id: string | null;
  name: string;
  tier: 'essentials' | 'special';
  total_hours: number;
  remaining_hours: number;
  purchased_at: string;
  expires_at: string;
  payment_id: string | null;
  status: 'active' | 'expired' | 'depleted' | 'cancelled';
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  'id, student_id, guardian_id, name, tier, total_hours, remaining_hours, purchased_at, expires_at, payment_id, status, created_at, updated_at';

function toModel(row: DbPackageRow): HourPackage {
  return {
    id: row.id,
    studentId: row.student_id,
    guardianId: row.guardian_id,
    name: row.name,
    totalHours: Number(row.total_hours),
    remainingHours: Number(row.remaining_hours),
    purchasedAt: row.purchased_at,
    expiresAt: row.expires_at,
    paymentId: row.payment_id,
    active: row.status === 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface PackageCreateArgs {
  studentId: string;
  guardianId?: string | null;
  name: string;
  tier?: 'essentials' | 'special';
  totalHours: number;
  remainingHours?: number;
  purchasedAt?: string;
  expiresAt: string;
  paymentId?: string | null;
}

export interface PackageUpdatePatch {
  remainingHours?: number;
  active?: boolean;
  expiresAt?: string;
  paymentId?: string | null;
  status?: 'active' | 'expired' | 'depleted' | 'cancelled';
}

export const packagesCloudRepo = {
  async list(): Promise<HourPackage[]> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('hour_packages')
        .select(SELECT_COLS)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[packagesCloudRepo.list] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbPackageRow));
    } catch (err) {
      console.warn('[packagesCloudRepo.list] exception', err);
      return [];
    }
  },

  async listForStudent(studentId: string): Promise<HourPackage[]> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('hour_packages')
        .select(SELECT_COLS)
        .eq('student_id', studentId)
        .order('purchased_at', { ascending: false });
      if (error) {
        console.warn('[packagesCloudRepo.listForStudent] error', error.message);
        return [];
      }
      return (data ?? []).map((r) => toModel(r as unknown as DbPackageRow));
    } catch (err) {
      console.warn('[packagesCloudRepo.listForStudent] exception', err);
      return [];
    }
  },

  async getById(id: string): Promise<HourPackage | null> {
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from('hour_packages')
        .select(SELECT_COLS)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.warn('[packagesCloudRepo.getById] error', error.message);
        return null;
      }
      return data ? toModel(data as unknown as DbPackageRow) : null;
    } catch (err) {
      console.warn('[packagesCloudRepo.getById] exception', err);
      return null;
    }
  },

  async insert(
    args: PackageCreateArgs,
  ): Promise<{ package: HourPackage | null; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const nowIso = new Date().toISOString();
      const payload: Record<string, unknown> = {
        student_id: args.studentId,
        guardian_id: args.guardianId ?? null,
        name: args.name,
        tier: args.tier ?? 'essentials',
        total_hours: args.totalHours,
        remaining_hours: args.remainingHours ?? args.totalHours,
        purchased_at: args.purchasedAt ?? nowIso,
        expires_at: args.expiresAt,
        payment_id: args.paymentId ?? null,
        status: 'active',
      };
      const { data, error } = await sb
        .from('hour_packages')
        .insert(payload)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[packagesCloudRepo.insert] error', error.message);
        return { package: null, error: error.message };
      }
      return { package: toModel(data as unknown as DbPackageRow) };
    } catch (err: any) {
      console.warn('[packagesCloudRepo.insert] exception', err);
      return { package: null, error: err?.message ?? 'unknown_error' };
    }
  },

  async update(
    id: string,
    patch: PackageUpdatePatch,
  ): Promise<{ package: HourPackage | null; error?: string }> {
    try {
      const sb = getSupabaseClient();
      const dbPatch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (patch.remainingHours !== undefined) dbPatch.remaining_hours = patch.remainingHours;
      if (patch.expiresAt !== undefined) dbPatch.expires_at = patch.expiresAt;
      if (patch.paymentId !== undefined) dbPatch.payment_id = patch.paymentId;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      else if (patch.active !== undefined) dbPatch.status = patch.active ? 'active' : 'cancelled';
      const { data, error } = await sb
        .from('hour_packages')
        .update(dbPatch)
        .eq('id', id)
        .select(SELECT_COLS)
        .single();
      if (error) {
        console.warn('[packagesCloudRepo.update] error', error.message);
        return { package: null, error: error.message };
      }
      return { package: toModel(data as unknown as DbPackageRow) };
    } catch (err: any) {
      console.warn('[packagesCloudRepo.update] exception', err);
      return { package: null, error: err?.message ?? 'unknown_error' };
    }
  },
};
