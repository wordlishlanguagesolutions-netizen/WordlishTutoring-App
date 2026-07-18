-- Migración 006 · Notificaciones, alertas de sistema, push tokens, ack de políticas
-- Requiere 005 (por FKs a class_records, teachers, students).

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  message text not null,
  channel notification_channel not null default 'in_app',
  delivery_status notification_delivery_status not null default 'queued',
  read boolean not null default false,
  read_at timestamptz,
  action_route text,
  action_label text,
  ref_type text check (ref_type in ('booking','class','payment','report','material','payroll')),
  ref_id uuid,
  scheduled_for timestamptz,
  tone text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_notifications on public.notifications;
create trigger trg_audit_notifications before insert or update on public.notifications for each row execute function public.set_row_audit_fields();
create index if not exists idx_notifications_user_read on public.notifications(user_id, read);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_scheduled on public.notifications(scheduled_for) where scheduled_for is not null;
alter table public.notifications enable row level security;
drop policy if exists "admin_all_notifications" on public.notifications;
create policy "admin_all_notifications" on public.notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "user_manage_own_notifications" on public.notifications;
create policy "user_manage_own_notifications" on public.notifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.system_alerts (
  id uuid primary key default gen_random_uuid(),
  class_record_id uuid references public.class_records(id) on delete set null,
  teacher_id uuid references public.teachers(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  type text not null,
  detail text,
  severity alert_severity not null,
  icon text,
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_system_alerts on public.system_alerts;
create trigger trg_audit_system_alerts before insert or update on public.system_alerts for each row execute function public.set_row_audit_fields();
create index if not exists idx_system_alerts_open on public.system_alerts(resolved, severity, created_at desc);
alter table public.system_alerts enable row level security;
drop policy if exists "supervisor_all_system_alerts" on public.system_alerts;
create policy "supervisor_all_system_alerts" on public.system_alerts for all to authenticated using (public.is_supervisor()) with check (public.is_supervisor());

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  platform text not null check (platform in ('ios','android','web')),
  token text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  unique (user_id, platform, token)
);
drop trigger if exists trg_audit_push_tokens on public.push_tokens;
create trigger trg_audit_push_tokens before insert or update on public.push_tokens for each row execute function public.set_row_audit_fields();
alter table public.push_tokens enable row level security;
drop policy if exists "admin_select_push_tokens" on public.push_tokens;
create policy "admin_select_push_tokens" on public.push_tokens for select to authenticated using (public.is_admin());
drop policy if exists "user_manage_own_push_tokens" on public.push_tokens;
create policy "user_manage_own_push_tokens" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.policy_acknowledgements (
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  policy_key text not null,
  acknowledged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  primary key (user_id, policy_key)
);
drop trigger if exists trg_audit_policy_ack on public.policy_acknowledgements;
create trigger trg_audit_policy_ack before insert or update on public.policy_acknowledgements for each row execute function public.set_row_audit_fields();
alter table public.policy_acknowledgements enable row level security;
drop policy if exists "admin_select_policy_ack" on public.policy_acknowledgements;
create policy "admin_select_policy_ack" on public.policy_acknowledgements for select to authenticated using (public.is_admin());
drop policy if exists "user_manage_own_policy_ack" on public.policy_acknowledgements;
create policy "user_manage_own_policy_ack" on public.policy_acknowledgements for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
