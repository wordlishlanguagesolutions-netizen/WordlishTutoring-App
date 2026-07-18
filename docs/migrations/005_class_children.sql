-- Migración 005 · class_events, screenshots, reports, materials, attendance
-- Requiere 004.

create table if not exists public.class_events (
  id uuid primary key default gen_random_uuid(),
  class_record_id uuid not null references public.class_records(id) on delete cascade,
  type class_event_type not null,
  at timestamptz not null default now(),
  actor_user_id uuid not null references public.user_profiles(id) on delete restrict,
  actor_role specific_role not null,
  message text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists idx_class_events_class on public.class_events(class_record_id);
create index if not exists idx_class_events_class_at on public.class_events(class_record_id, at desc);
create index if not exists idx_class_events_type on public.class_events(type);
alter table public.class_events enable row level security;
drop policy if exists "admin_all_class_events" on public.class_events;
create policy "admin_all_class_events" on public.class_events for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_all_class_events" on public.class_events;
create policy "supervisor_all_class_events" on public.class_events for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "participant_select_class_events" on public.class_events;
create policy "participant_select_class_events" on public.class_events for select to authenticated
  using (class_record_id in (
    select cr.id from public.class_records cr
    where cr.teacher_id in (select id from public.teachers where user_id = auth.uid())
       or cr.student_id in (select id from public.students where user_id = auth.uid())
       or cr.guardian_id in (select id from public.guardians where user_id = auth.uid())
  ));
drop policy if exists "participant_insert_class_events" on public.class_events;
create policy "participant_insert_class_events" on public.class_events for insert to authenticated
  with check (class_record_id in (
    select cr.id from public.class_records cr
    where cr.teacher_id in (select id from public.teachers where user_id = auth.uid())
       or cr.student_id in (select id from public.students where user_id = auth.uid())
       or cr.guardian_id in (select id from public.guardians where user_id = auth.uid())
  ));

create table if not exists public.screenshots (
  id uuid primary key default gen_random_uuid(),
  class_record_id uuid not null references public.class_records(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  storage_path text not null,
  captured_at timestamptz not null default now(),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create unique index if not exists idx_screenshots_class_record on public.screenshots(class_record_id);
create index if not exists idx_screenshots_teacher on public.screenshots(teacher_id);
create index if not exists idx_screenshots_captured on public.screenshots(captured_at);
drop trigger if exists trg_audit_screenshots on public.screenshots;
create trigger trg_audit_screenshots before insert or update on public.screenshots for each row execute function public.set_row_audit_fields();
alter table public.screenshots enable row level security;
drop policy if exists "admin_all_screenshots" on public.screenshots;
create policy "admin_all_screenshots" on public.screenshots for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_all_screenshots" on public.screenshots;
create policy "supervisor_all_screenshots" on public.screenshots for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "teacher_manage_own_screenshots" on public.screenshots;
create policy "teacher_manage_own_screenshots" on public.screenshots for all to authenticated
  using (teacher_id in (select id from public.teachers where user_id = auth.uid()))
  with check (teacher_id in (select id from public.teachers where user_id = auth.uid()));
drop policy if exists "student_select_own_screenshots" on public.screenshots;
create policy "student_select_own_screenshots" on public.screenshots for select to authenticated
  using (student_id in (select id from public.students where user_id = auth.uid()));

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  class_record_id uuid unique not null references public.class_records(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  topic text not null,
  progress text not null,
  objectives text not null,
  strengths text not null,
  improvements text not null,
  homework text,
  guardian_notes text,
  rating int check (rating between 1 and 5),
  attachments text[] not null default '{}',
  status report_status not null default 'draft',
  submitted_at timestamptz,
  read_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_reports on public.reports;
create trigger trg_audit_reports before insert or update on public.reports for each row execute function public.set_row_audit_fields();
create index if not exists idx_reports_teacher on public.reports(teacher_id);
create index if not exists idx_reports_student on public.reports(student_id);
create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_reports_teacher_draft on public.reports(teacher_id, status) where status = 'draft';
alter table public.reports enable row level security;
drop policy if exists "admin_all_reports" on public.reports;
create policy "admin_all_reports" on public.reports for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_all_reports" on public.reports;
create policy "supervisor_all_reports" on public.reports for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "teacher_manage_own_reports" on public.reports;
create policy "teacher_manage_own_reports" on public.reports for all to authenticated
  using (teacher_id in (select id from public.teachers where user_id = auth.uid()))
  with check (teacher_id in (select id from public.teachers where user_id = auth.uid()) and status <> 'confirmed');
drop policy if exists "student_select_own_reports" on public.reports;
create policy "student_select_own_reports" on public.reports for select to authenticated
  using (student_id in (select id from public.students where user_id = auth.uid()));
drop policy if exists "student_update_own_report_state" on public.reports;
create policy "student_update_own_report_state" on public.reports for update to authenticated
  using (student_id in (select id from public.students where user_id = auth.uid()))
  with check (student_id in (select id from public.students where user_id = auth.uid()));
drop policy if exists "guardian_select_ward_reports" on public.reports;
create policy "guardian_select_ward_reports" on public.reports for select to authenticated
  using (student_id in (select s.id from public.students s where s.guardian_id in (select g.id from public.guardians g where g.user_id = auth.uid())));

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  class_record_id uuid not null references public.class_records(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  title text not null,
  description text,
  kind material_kind not null,
  storage_path text not null,
  size_label text,
  source material_source not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_materials on public.materials;
create trigger trg_audit_materials before insert or update on public.materials for each row execute function public.set_row_audit_fields();
create index if not exists idx_materials_class on public.materials(class_record_id);
create index if not exists idx_materials_class_source on public.materials(class_record_id, source);
create index if not exists idx_materials_teacher on public.materials(teacher_id);
alter table public.materials enable row level security;
drop policy if exists "admin_all_materials" on public.materials;
create policy "admin_all_materials" on public.materials for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_select_materials" on public.materials;
create policy "supervisor_select_materials" on public.materials for select to authenticated using (public.is_supervisor());
drop policy if exists "participant_select_materials" on public.materials;
create policy "participant_select_materials" on public.materials for select to authenticated
  using (teacher_id in (select id from public.teachers where user_id = auth.uid())
      or student_id in (select id from public.students where user_id = auth.uid())
      or student_id in (select s.id from public.students s where s.guardian_id in (select g.id from public.guardians g where g.user_id = auth.uid())));
drop policy if exists "teacher_insert_own_material" on public.materials;
create policy "teacher_insert_own_material" on public.materials for insert to authenticated
  with check (teacher_id in (select id from public.teachers where user_id = auth.uid()) and source = 'teacher');
drop policy if exists "student_insert_own_material" on public.materials;
create policy "student_insert_own_material" on public.materials for insert to authenticated
  with check ((student_id in (select id from public.students where user_id = auth.uid())
            or student_id in (select s.id from public.students s where s.guardian_id in (select g.id from public.guardians g where g.user_id = auth.uid())))
            and source = 'student');

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  class_record_id uuid not null references public.class_records(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  status text not null check (status in ('attended','late','absent','excused')),
  joined_at timestamptz,
  left_at timestamptz,
  minutes_late int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (class_record_id, student_id)
);
drop trigger if exists trg_audit_attendance on public.attendance;
create trigger trg_audit_attendance before insert or update on public.attendance for each row execute function public.set_row_audit_fields();
alter table public.attendance enable row level security;
drop policy if exists "admin_all_attendance" on public.attendance;
create policy "admin_all_attendance" on public.attendance for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_all_attendance" on public.attendance;
create policy "supervisor_all_attendance" on public.attendance for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());
drop policy if exists "teacher_manage_own_attendance" on public.attendance;
create policy "teacher_manage_own_attendance" on public.attendance for all to authenticated
  using (class_record_id in (select id from public.class_records where teacher_id in (select id from public.teachers where user_id = auth.uid())))
  with check (class_record_id in (select id from public.class_records where teacher_id in (select id from public.teachers where user_id = auth.uid())));
drop policy if exists "student_select_own_attendance" on public.attendance;
create policy "student_select_own_attendance" on public.attendance for select to authenticated
  using (student_id in (select id from public.students where user_id = auth.uid()));
drop policy if exists "guardian_select_ward_attendance" on public.attendance;
create policy "guardian_select_ward_attendance" on public.attendance for select to authenticated
  using (student_id in (select s.id from public.students s where s.guardian_id in (select g.id from public.guardians g where g.user_id = auth.uid())));

alter table public.class_records
  drop constraint if exists class_records_screenshot_id_fkey;
alter table public.class_records
  add constraint class_records_screenshot_id_fkey foreign key (screenshot_id)
  references public.screenshots(id) on delete set null;
alter table public.class_records
  drop constraint if exists class_records_report_id_fkey;
alter table public.class_records
  add constraint class_records_report_id_fkey foreign key (report_id)
  references public.reports(id) on delete set null;
