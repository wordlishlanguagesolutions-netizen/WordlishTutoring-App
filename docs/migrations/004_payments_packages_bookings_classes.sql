-- Migración 004 · Pagos, paquetes de horas, reservas y expediente de clase
-- Requiere 003.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete set null,
  guardian_id uuid references public.guardians(id) on delete set null,
  package_id uuid,
  booking_id uuid,
  concept text not null,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'USD',
  status payment_status not null default 'pending',
  method payment_method not null,
  paid_at timestamptz,
  external_reference text,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_payments on public.payments;
create trigger trg_audit_payments before insert or update on public.payments for each row execute function public.set_row_audit_fields();
create index if not exists idx_payments_student on public.payments(student_id);
create index if not exists idx_payments_guardian on public.payments(guardian_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_status_created on public.payments(status, created_at desc);
create unique index if not exists idx_payments_external_ref on public.payments(external_reference) where external_reference is not null;
alter table public.payments enable row level security;
drop policy if exists "admin_all_payments" on public.payments;
create policy "admin_all_payments" on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_select_payments" on public.payments;
create policy "supervisor_select_payments" on public.payments for select to authenticated using (public.is_supervisor());
drop policy if exists "student_select_own_payments" on public.payments;
create policy "student_select_own_payments" on public.payments for select to authenticated
  using (student_id in (select id from public.students where user_id = auth.uid()));
drop policy if exists "guardian_select_own_payments" on public.payments;
create policy "guardian_select_own_payments" on public.payments for select to authenticated
  using (guardian_id in (select id from public.guardians where user_id = auth.uid()));

create table if not exists public.hour_packages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_id uuid references public.guardians(id) on delete set null,
  name text not null,
  tier teacher_tier not null,
  total_hours numeric(6,2) not null check (total_hours >= 0),
  remaining_hours numeric(6,2) not null check (remaining_hours >= 0),
  purchased_at timestamptz not null,
  expires_at timestamptz not null,
  payment_id uuid references public.payments(id) on delete set null,
  status package_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_hour_packages on public.hour_packages;
create trigger trg_audit_hour_packages before insert or update on public.hour_packages for each row execute function public.set_row_audit_fields();
create index if not exists idx_hour_packages_student on public.hour_packages(student_id);
create index if not exists idx_hour_packages_status on public.hour_packages(status);
create index if not exists idx_hour_packages_active on public.hour_packages(student_id, status) where status = 'active';
alter table public.hour_packages enable row level security;
drop policy if exists "admin_all_hour_packages" on public.hour_packages;
create policy "admin_all_hour_packages" on public.hour_packages for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_select_hour_packages" on public.hour_packages;
create policy "supervisor_select_hour_packages" on public.hour_packages for select to authenticated using (public.is_supervisor());
drop policy if exists "student_select_own_packages" on public.hour_packages;
create policy "student_select_own_packages" on public.hour_packages for select to authenticated
  using (student_id in (select id from public.students where user_id = auth.uid()));
drop policy if exists "guardian_select_own_packages" on public.hour_packages;
create policy "guardian_select_own_packages" on public.hour_packages for select to authenticated
  using (student_id in (select s.id from public.students s where s.guardian_id in (select g.id from public.guardians g where g.user_id = auth.uid())));

alter table public.payments
  drop constraint if exists payments_package_id_fkey;
alter table public.payments
  add constraint payments_package_id_fkey foreign key (package_id)
  references public.hour_packages(id) on delete set null;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  guardian_id uuid references public.guardians(id) on delete set null,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  substitute_id uuid references public.teachers(id) on delete set null,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  package_id uuid references public.hour_packages(id) on delete set null,
  class_record_id uuid,
  kind class_kind not null default 'personal',
  scheduled_date date not null,
  scheduled_time time not null,
  starts_at timestamptz generated always as ((scheduled_date + scheduled_time) at time zone 'UTC') stored,
  duration_min int not null default 60,
  status booking_status not null default 'pending_payment',
  zoom_url text,
  hour_consumed boolean not null default false,
  student_name text,
  teacher_name text,
  student_avatar text,
  teacher_avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_bookings on public.bookings;
create trigger trg_audit_bookings before insert or update on public.bookings for each row execute function public.set_row_audit_fields();
create index if not exists idx_bookings_student on public.bookings(student_id);
create index if not exists idx_bookings_teacher on public.bookings(teacher_id);
create index if not exists idx_bookings_guardian on public.bookings(guardian_id);
create index if not exists idx_bookings_starts_at on public.bookings(starts_at);
create index if not exists idx_bookings_status_starts on public.bookings(status, starts_at);
create unique index if not exists idx_bookings_no_double_slot on public.bookings(teacher_id, starts_at) where status in ('pending_payment','confirmed');
alter table public.bookings enable row level security;

drop policy if exists "admin_all_bookings" on public.bookings;
create policy "admin_all_bookings" on public.bookings for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_select_bookings" on public.bookings;
create policy "supervisor_select_bookings" on public.bookings for select to authenticated using (public.is_supervisor());
drop policy if exists "teacher_select_own_bookings" on public.bookings;
create policy "teacher_select_own_bookings" on public.bookings for select to authenticated
  using (teacher_id in (select id from public.teachers where user_id = auth.uid())
      or substitute_id in (select id from public.teachers where user_id = auth.uid()));
drop policy if exists "teacher_update_own_bookings" on public.bookings;
create policy "teacher_update_own_bookings" on public.bookings for update to authenticated
  using (teacher_id in (select id from public.teachers where user_id = auth.uid()))
  with check (teacher_id in (select id from public.teachers where user_id = auth.uid()));
drop policy if exists "student_select_own_bookings" on public.bookings;
create policy "student_select_own_bookings" on public.bookings for select to authenticated
  using (student_id in (select id from public.students where user_id = auth.uid()));
drop policy if exists "student_insert_own_bookings" on public.bookings;
create policy "student_insert_own_bookings" on public.bookings for insert to authenticated
  with check (student_id in (select id from public.students where user_id = auth.uid()));
drop policy if exists "guardian_select_own_bookings" on public.bookings;
create policy "guardian_select_own_bookings" on public.bookings for select to authenticated
  using (guardian_id in (select id from public.guardians where user_id = auth.uid())
      or student_id in (select s.id from public.students s where s.guardian_id in (select g.id from public.guardians g where g.user_id = auth.uid())));
drop policy if exists "guardian_insert_own_bookings" on public.bookings;
create policy "guardian_insert_own_bookings" on public.bookings for insert to authenticated
  with check (student_id in (select s.id from public.students s where s.guardian_id in (select g.id from public.guardians g where g.user_id = auth.uid())));

alter table public.payments
  drop constraint if exists payments_booking_id_fkey;
alter table public.payments
  add constraint payments_booking_id_fkey foreign key (booking_id)
  references public.bookings(id) on delete set null;

create table if not exists public.class_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique not null references public.bookings(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  guardian_id uuid references public.guardians(id) on delete set null,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  kind class_kind not null default 'personal',
  scheduled_date date not null,
  scheduled_time time not null,
  starts_at timestamptz generated always as ((scheduled_date + scheduled_time) at time zone 'UTC') stored,
  status class_record_status not null default 'scheduled',
  zoom_url text,
  zoom_meeting_id text,
  started_at timestamptz,
  ended_at timestamptz,
  student_joined_at timestamptz,
  teacher_joined_at timestamptz,
  screenshot_id uuid,
  report_id uuid,
  student_topic text,
  student_material_submitted_at timestamptz,
  observations text,
  supervisor_notes text,
  substitute_assigned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_class_records on public.class_records;
create trigger trg_audit_class_records before insert or update on public.class_records for each row execute function public.set_row_audit_fields();
create index if not exists idx_class_records_booking on public.class_records(booking_id);
create index if not exists idx_class_records_student on public.class_records(student_id);
create index if not exists idx_class_records_teacher on public.class_records(teacher_id);
create index if not exists idx_class_records_starts on public.class_records(starts_at);
create index if not exists idx_class_records_status_starts on public.class_records(status, starts_at);
create index if not exists idx_class_records_in_progress on public.class_records(teacher_id) where status = 'in_progress';
alter table public.class_records enable row level security;

drop policy if exists "admin_all_class_records" on public.class_records;
create policy "admin_all_class_records" on public.class_records for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_all_class_records" on public.class_records;
create policy "supervisor_all_class_records" on public.class_records for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "teacher_select_own_class_records" on public.class_records;
create policy "teacher_select_own_class_records" on public.class_records for select to authenticated
  using (teacher_id in (select id from public.teachers where user_id = auth.uid()));
drop policy if exists "teacher_update_own_class_records" on public.class_records;
create policy "teacher_update_own_class_records" on public.class_records for update to authenticated
  using (teacher_id in (select id from public.teachers where user_id = auth.uid()))
  with check (teacher_id in (select id from public.teachers where user_id = auth.uid()));
drop policy if exists "student_select_own_class_records" on public.class_records;
create policy "student_select_own_class_records" on public.class_records for select to authenticated
  using (student_id in (select id from public.students where user_id = auth.uid()));
drop policy if exists "guardian_select_own_class_records" on public.class_records;
create policy "guardian_select_own_class_records" on public.class_records for select to authenticated
  using (guardian_id in (select id from public.guardians where user_id = auth.uid())
      or student_id in (select s.id from public.students s where s.guardian_id in (select g.id from public.guardians g where g.user_id = auth.uid())));

alter table public.bookings
  drop constraint if exists bookings_class_record_id_fkey;
alter table public.bookings
  add constraint bookings_class_record_id_fkey foreign key (class_record_id)
  references public.class_records(id) on delete set null;
