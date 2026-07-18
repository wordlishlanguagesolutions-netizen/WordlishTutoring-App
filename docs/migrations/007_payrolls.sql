-- Migración 007 · Liquidaciones (teacher_payrolls) y ajustes
-- Requiere 003 (teachers) y 001 (enums).

create table if not exists public.teacher_payrolls (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  teacher_name_snapshot text not null,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  period_start date not null,
  period_end date not null,
  personal_classes_count int not null default 0,
  group_classes_count int not null default 0,
  payable_hours numeric(6,2) not null default 0,
  payable_absences numeric(6,2) not null default 0,
  cancellations numeric(6,2) not null default 0,
  rate_snapshot jsonb not null,
  computed_total numeric(12,2) not null default 0,
  final_total numeric(12,2) not null default 0,
  status payroll_status not null default 'draft',
  reviewed_at timestamptz,
  paid_at timestamptz,
  reviewed_by uuid references public.user_profiles(id) on delete set null,
  paid_by uuid references public.user_profiles(id) on delete set null,
  payment_receipt_url text,
  payment_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (teacher_id, month)
);
drop trigger if exists trg_audit_teacher_payrolls on public.teacher_payrolls;
create trigger trg_audit_teacher_payrolls before insert or update on public.teacher_payrolls for each row execute function public.set_row_audit_fields();

create or replace function public.block_paid_payroll_update()
returns trigger language plpgsql as $$
begin
  if old.status = 'paid' then
    raise exception 'Payroll % is paid and cannot be modified.', old.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_block_paid_payroll on public.teacher_payrolls;
create trigger trg_block_paid_payroll before update on public.teacher_payrolls
for each row when (old.status = 'paid') execute function public.block_paid_payroll_update();

alter table public.teacher_payrolls enable row level security;
drop policy if exists "admin_all_teacher_payrolls" on public.teacher_payrolls;
create policy "admin_all_teacher_payrolls" on public.teacher_payrolls for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "teacher_select_own_payrolls" on public.teacher_payrolls;
create policy "teacher_select_own_payrolls" on public.teacher_payrolls for select to authenticated
  using (teacher_id in (select id from public.teachers where user_id = auth.uid())
         and status in ('reviewed','paid'));

create table if not exists public.payroll_adjustments (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references public.teacher_payrolls(id) on delete cascade,
  kind payroll_adjustment_kind not null,
  reason text not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_payroll_adjustments on public.payroll_adjustments;
create trigger trg_audit_payroll_adjustments before insert or update on public.payroll_adjustments for each row execute function public.set_row_audit_fields();
create index if not exists idx_payroll_adjustments_payroll on public.payroll_adjustments(payroll_id);
alter table public.payroll_adjustments enable row level security;
drop policy if exists "admin_all_payroll_adjustments" on public.payroll_adjustments;
create policy "admin_all_payroll_adjustments" on public.payroll_adjustments for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "teacher_select_own_adjustments" on public.payroll_adjustments;
create policy "teacher_select_own_adjustments" on public.payroll_adjustments for select to authenticated
  using (payroll_id in (select id from public.teacher_payrolls where teacher_id in (select id from public.teachers where user_id = auth.uid())));
