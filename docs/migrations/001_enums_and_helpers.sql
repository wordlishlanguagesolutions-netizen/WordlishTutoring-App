-- Migración 001 · Extensiones, enums, trigger de auditoría y helpers de rol
-- Idempotente. Ejecutar antes que cualquier otra migración.

create extension if not exists pgcrypto;

do $$ begin create type account_type as enum ('student_guardian','staff'); exception when duplicate_object then null; end $$;
do $$ begin create type specific_role as enum ('admin','supervisor','teacher','student','guardian'); exception when duplicate_object then null; end $$;
do $$ begin create type booking_status as enum ('pending_payment','confirmed','cancelled','rescheduled','completed','student_absent','technical_issue'); exception when duplicate_object then null; end $$;
do $$ begin create type class_record_status as enum ('scheduled','in_progress','ok','no_screenshot','teacher_late','student_late','no_camera','technical','completed','cancelled','student_absent'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_status as enum ('paid','pending','failed','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_method as enum ('card','yappy','cuanto','transfer','other'); exception when duplicate_object then null; end $$;
do $$ begin create type notification_type as enum ('class_reminder_24h','class_reminder_15m','class_starting','new_report','new_material','schedule_change','teacher_absent','class_cancelled','class_rescheduled','payment_pending','payment_confirmed','availability_pending','booking_confirmed','payroll_ready','payroll_paid','system'); exception when duplicate_object then null; end $$;
do $$ begin create type notification_channel as enum ('in_app','push','whatsapp','email'); exception when duplicate_object then null; end $$;
do $$ begin create type notification_delivery_status as enum ('queued','delivered','read','failed'); exception when duplicate_object then null; end $$;
do $$ begin create type alert_severity as enum ('info','warning','danger','critical'); exception when duplicate_object then null; end $$;
do $$ begin create type material_kind as enum ('PDF','MP3','MP4','DOC','IMG','LINK'); exception when duplicate_object then null; end $$;
do $$ begin create type class_kind as enum ('personal','group'); exception when duplicate_object then null; end $$;
do $$ begin create type payroll_status as enum ('draft','reviewed','paid'); exception when duplicate_object then null; end $$;
do $$ begin create type payroll_adjustment_kind as enum ('bonus','deduction','correction'); exception when duplicate_object then null; end $$;
do $$ begin create type class_event_type as enum ('booking_created','payment_confirmed','teacher_assigned','substitute_assigned','material_received','topic_received','class_started','screenshot_received','technical_issue','student_absent','teacher_absent','no_camera','student_late','class_ended','report_submitted','report_read','report_confirmed','material_sent','hours_deducted'); exception when duplicate_object then null; end $$;
do $$ begin create type report_status as enum ('draft','sent','read','confirmed'); exception when duplicate_object then null; end $$;
do $$ begin create type material_source as enum ('student','teacher'); exception when duplicate_object then null; end $$;
do $$ begin create type teacher_tier as enum ('essentials','special'); exception when duplicate_object then null; end $$;
do $$ begin create type package_status as enum ('active','expired','depleted','cancelled'); exception when duplicate_object then null; end $$;

create or replace function public.set_row_audit_fields()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := coalesce(new.updated_by, auth.uid());
  elsif tg_op = 'UPDATE' then
    new.updated_at := now();
    new.updated_by := auth.uid();
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  return new;
end $$;

-- user_profiles: ampliar columnas requeridas por el dominio
alter table public.user_profiles
  add column if not exists full_name text,
  add column if not exists first_name text,
  add column if not exists phone text,
  add column if not exists avatar_url text,
  add column if not exists role specific_role,
  add column if not exists account_type account_type,
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

update public.user_profiles
   set role = coalesce(role, 'student'::specific_role),
       account_type = coalesce(account_type, 'student_guardian'::account_type),
       full_name = coalesce(full_name, username, email),
       first_name = coalesce(first_name, split_part(coalesce(username, email), ' ', 1))
 where role is null or account_type is null or full_name is null or first_name is null;

alter table public.user_profiles
  alter column role set not null,
  alter column account_type set not null,
  alter column full_name set not null,
  alter column first_name set not null;

drop trigger if exists trg_audit_user_profiles on public.user_profiles;
create trigger trg_audit_user_profiles
before insert or update on public.user_profiles
for each row execute function public.set_row_audit_fields();

create index if not exists idx_user_profiles_role on public.user_profiles(role);
create index if not exists idx_user_profiles_account_type on public.user_profiles(account_type);
create index if not exists idx_user_profiles_email on public.user_profiles(email);

-- Helpers de rol (usados por RLS)
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role::text from public.user_profiles where id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean language sql stable as $$
  select public.current_user_role() = 'admin';
$$;
create or replace function public.is_supervisor() returns boolean language sql stable as $$
  select public.current_user_role() in ('admin','supervisor');
$$;
create or replace function public.is_staff() returns boolean language sql stable as $$
  select public.current_user_role() in ('admin','supervisor','teacher');
$$;
create or replace function public.is_teacher() returns boolean language sql stable as $$
  select public.current_user_role() = 'teacher';
$$;
create or replace function public.is_student() returns boolean language sql stable as $$
  select public.current_user_role() = 'student';
$$;
create or replace function public.is_guardian() returns boolean language sql stable as $$
  select public.current_user_role() = 'guardian';
$$;

drop policy if exists "admin_all_user_profiles" on public.user_profiles;
create policy "admin_all_user_profiles" on public.user_profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "supervisor_select_user_profiles" on public.user_profiles;
create policy "supervisor_select_user_profiles" on public.user_profiles
  for select to authenticated using (public.is_supervisor());
