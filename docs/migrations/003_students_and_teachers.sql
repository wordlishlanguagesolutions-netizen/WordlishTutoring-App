-- Migración 003 · Estudiantes, relaciones, profesores, disponibilidad, tarifas
-- Requiere 002.

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(id) on delete set null,
  guardian_id uuid references public.guardians(id) on delete set null,
  full_name text not null,
  first_name text not null,
  avatar_url text,
  age int check (age > 0),
  grade text not null,
  school text,
  phone text,
  plan_tier teacher_tier not null default 'essentials',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_students on public.students;
create trigger trg_audit_students before insert or update on public.students for each row execute function public.set_row_audit_fields();
create index if not exists idx_students_guardian_id on public.students(guardian_id);
create index if not exists idx_students_user_id on public.students(user_id);
create index if not exists idx_students_active on public.students(active);
alter table public.students enable row level security;
drop policy if exists "admin_all_students" on public.students;
create policy "admin_all_students" on public.students for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_select_students" on public.students;
create policy "supervisor_select_students" on public.students for select to authenticated using (public.is_supervisor());
drop policy if exists "student_select_self" on public.students;
create policy "student_select_self" on public.students for select to authenticated using (user_id = auth.uid());
drop policy if exists "guardian_select_own_students" on public.students;
create policy "guardian_select_own_students" on public.students for select to authenticated
  using (guardian_id in (select id from public.guardians where user_id = auth.uid()));

create table if not exists public.student_guardians (
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  relationship text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  primary key (student_id, guardian_id)
);
create unique index if not exists idx_student_guardians_primary on public.student_guardians(student_id) where is_primary = true;
drop trigger if exists trg_audit_student_guardians on public.student_guardians;
create trigger trg_audit_student_guardians before insert or update on public.student_guardians for each row execute function public.set_row_audit_fields();
alter table public.student_guardians enable row level security;
drop policy if exists "admin_all_student_guardians" on public.student_guardians;
create policy "admin_all_student_guardians" on public.student_guardians for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_select_student_guardians" on public.student_guardians;
create policy "supervisor_select_student_guardians" on public.student_guardians for select to authenticated using (public.is_supervisor());
drop policy if exists "guardian_select_own_links" on public.student_guardians;
create policy "guardian_select_own_links" on public.student_guardians for select to authenticated
  using (guardian_id in (select id from public.guardians where user_id = auth.uid()));

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid unique not null references public.staff(id) on delete cascade,
  user_id uuid unique not null references public.user_profiles(id) on delete cascade,
  tier teacher_tier not null default 'essentials',
  subjects text[] not null default '{}',
  grades text[] not null default '{}',
  bio text,
  hourly_rate numeric(10,2) not null default 0,
  stats jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_teachers on public.teachers;
create trigger trg_audit_teachers before insert or update on public.teachers for each row execute function public.set_row_audit_fields();
create index if not exists idx_teachers_tier on public.teachers(tier);
create index if not exists idx_teachers_subjects on public.teachers using gin(subjects);
create index if not exists idx_teachers_grades on public.teachers using gin(grades);
alter table public.teachers enable row level security;
drop policy if exists "admin_all_teachers" on public.teachers;
create policy "admin_all_teachers" on public.teachers for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_select_teachers" on public.teachers;
create policy "supervisor_select_teachers" on public.teachers for select to authenticated using (public.is_supervisor());
drop policy if exists "authenticated_select_teachers" on public.teachers;
create policy "authenticated_select_teachers" on public.teachers for select to authenticated using (true);
drop policy if exists "teacher_update_self" on public.teachers;
create policy "teacher_update_self" on public.teachers for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.teacher_subjects (
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  primary key (teacher_id, subject_id)
);
drop trigger if exists trg_audit_teacher_subjects on public.teacher_subjects;
create trigger trg_audit_teacher_subjects before insert or update on public.teacher_subjects for each row execute function public.set_row_audit_fields();
create index if not exists idx_teacher_subjects_subject on public.teacher_subjects(subject_id);
alter table public.teacher_subjects enable row level security;
drop policy if exists "authenticated_select_teacher_subjects" on public.teacher_subjects;
create policy "authenticated_select_teacher_subjects" on public.teacher_subjects for select to authenticated using (true);
drop policy if exists "admin_all_teacher_subjects" on public.teacher_subjects;
create policy "admin_all_teacher_subjects" on public.teacher_subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.teacher_availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  week_start date not null,
  weekday int not null check (weekday between 0 and 6),
  slots text[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (teacher_id, week_start, weekday)
);
drop trigger if exists trg_audit_teacher_availability on public.teacher_availability;
create trigger trg_audit_teacher_availability before insert or update on public.teacher_availability for each row execute function public.set_row_audit_fields();
create index if not exists idx_avail_teacher_week on public.teacher_availability(teacher_id, week_start);
alter table public.teacher_availability enable row level security;
drop policy if exists "admin_all_teacher_availability" on public.teacher_availability;
create policy "admin_all_teacher_availability" on public.teacher_availability for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_select_teacher_availability" on public.teacher_availability;
create policy "supervisor_select_teacher_availability" on public.teacher_availability for select to authenticated using (public.is_supervisor());
drop policy if exists "teacher_manage_own_availability" on public.teacher_availability;
create policy "teacher_manage_own_availability" on public.teacher_availability for all to authenticated
  using (teacher_id in (select id from public.teachers where user_id = auth.uid()))
  with check (teacher_id in (select id from public.teachers where user_id = auth.uid()));
drop policy if exists "authenticated_select_published_availability" on public.teacher_availability;
create policy "authenticated_select_published_availability" on public.teacher_availability for select to authenticated using (published_at is not null);

create table if not exists public.teacher_rates (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  personal_hour_rate numeric(10,2) not null default 0,
  group_hour_rate numeric(10,2) not null default 0,
  absence_pay_rate numeric(10,2) not null default 0,
  currency text not null default 'USD',
  effective_from date not null,
  effective_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create unique index if not exists idx_teacher_rates_active on public.teacher_rates(teacher_id) where active = true;
drop trigger if exists trg_audit_teacher_rates on public.teacher_rates;
create trigger trg_audit_teacher_rates before insert or update on public.teacher_rates for each row execute function public.set_row_audit_fields();
alter table public.teacher_rates enable row level security;
drop policy if exists "admin_all_teacher_rates" on public.teacher_rates;
create policy "admin_all_teacher_rates" on public.teacher_rates for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "teacher_select_own_rates" on public.teacher_rates;
create policy "teacher_select_own_rates" on public.teacher_rates for select to authenticated
  using (teacher_id in (select id from public.teachers where user_id = auth.uid()));
