-- =============================================================================
-- Wordlish · Migración 013 · Infraestructura faltante (Fase 1)
-- Fecha: 2026-07-25
-- Autor: OnSpace
--
-- Objetivo: crear las 6 tablas que el frontend actual necesita antes de
-- migrar más módulos, con RLS por rol e índices críticos.
--
-- Restricciones respetadas:
--   - No se activa AUTH_MODE=real
--   - No se elimina mockDb
--   - No se migra código de módulos
--   - No se toca el Design System
--   - No se construye chat completo (solo announcements unidireccional)
-- =============================================================================

-- 1) tier_yearly_rates — tarifas globales por año/tier/kind
create table if not exists public.tier_yearly_rates (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year between 2020 and 2100),
  tier teacher_tier not null,           -- essentials | special
  kind class_kind not null,             -- personal   | group
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  effective_from date,
  active boolean not null default true,
  under_review boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  constraint uq_tier_yearly_rates unique (year, tier, kind)
);
create index if not exists idx_tier_yearly_rates_year on public.tier_yearly_rates(year);
create index if not exists idx_tier_yearly_rates_active on public.tier_yearly_rates(active) where active;

alter table public.tier_yearly_rates enable row level security;

create policy admin_all_tier_yearly_rates on public.tier_yearly_rates
  for all to authenticated using (is_admin()) with check (is_admin());
create policy staff_select_tier_yearly_rates on public.tier_yearly_rates
  for select to authenticated using (is_admin() or is_supervisor() or is_teacher());

-- 2) app_settings — configuración global clave/valor JSONB
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  created_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy admin_all_app_settings on public.app_settings
  for all to authenticated using (is_admin()) with check (is_admin());
create policy authenticated_select_public_settings on public.app_settings
  for select to authenticated using (is_public = true or is_admin());

-- 3) booking_holds — bloqueo temporal (protección DB, no solo frontend)
create table if not exists public.booking_holds (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  scheduled_date date not null,
  scheduled_time time not null,
  status text not null default 'active' check (status in ('active','expired','converted','released')),
  session_id text,
  booking_id uuid references public.bookings(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Unique parcial: impide dos holds activos sobre el mismo slot (a nivel DB)
create unique index if not exists uq_booking_holds_active
  on public.booking_holds(teacher_id, scheduled_date, scheduled_time)
  where status = 'active';
create index if not exists idx_booking_holds_expires on public.booking_holds(expires_at);
create index if not exists idx_booking_holds_user    on public.booking_holds(user_id);

alter table public.booking_holds enable row level security;
create policy admin_all_booking_holds on public.booking_holds
  for all to authenticated using (is_admin()) with check (is_admin());
create policy user_manage_own_holds on public.booking_holds
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy authenticated_select_active_holds on public.booking_holds
  for select to authenticated using (status = 'active');

-- Función para expirar holds vencidos (invocable por cron/edge)
create or replace function public.expire_booking_holds()
returns integer language plpgsql security definer as $$
declare n integer;
begin
  update public.booking_holds
     set status = 'expired', updated_at = now()
   where status = 'active' and expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- 4) support_tickets — soporte persistente (complementa WhatsApp)
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  subject text not null,
  description text not null,
  category text not null default 'general'
    check (category in ('general','pago','clase','tecnico','profesor','otro')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  status text not null default 'open'
    check (status in ('open','in_progress','waiting_user','resolved','closed')),
  assignee_id uuid references public.user_profiles(id) on delete set null,
  channel text default 'in_app',
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_support_tickets_user    on public.support_tickets(user_id);
create index if not exists idx_support_tickets_status  on public.support_tickets(status);
create index if not exists idx_support_tickets_created on public.support_tickets(created_at desc);

alter table public.support_tickets enable row level security;
create policy admin_all_support_tickets on public.support_tickets
  for all to authenticated using (is_admin()) with check (is_admin());
create policy supervisor_manage_support_tickets on public.support_tickets
  for all to authenticated using (is_supervisor()) with check (is_supervisor());
create policy user_insert_own_ticket on public.support_tickets
  for insert to authenticated with check (user_id = auth.uid());
create policy user_select_own_tickets on public.support_tickets
  for select to authenticated using (user_id = auth.uid());

-- 5) onboarding_state — pasos completados por usuario
create table if not exists public.onboarding_state (
  user_id uuid primary key references public.user_profiles(id) on delete cascade,
  role specific_role not null,
  steps_completed jsonb not null default '[]'::jsonb,
  current_step text,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.onboarding_state enable row level security;
create policy admin_all_onboarding on public.onboarding_state
  for all to authenticated using (is_admin()) with check (is_admin());
create policy user_manage_own_onboarding on public.onboarding_state
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 6) announcements — avisos unidireccionales (NO es chat)
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all'
    check (audience in ('all','admins','supervisors','teachers','students','guardians')),
  severity text not null default 'info'
    check (severity in ('info','success','warning','critical')),
  published_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null
);
create index if not exists idx_announcements_active on public.announcements(active, expires_at);

alter table public.announcements enable row level security;
create policy admin_all_announcements on public.announcements
  for all to authenticated using (is_admin()) with check (is_admin());
create policy authenticated_select_visible_announcements on public.announcements
  for select to authenticated using (
    active = true
    and (published_at is null or now() >= published_at)
    and (expires_at is null or now() <= expires_at)
    and (
      audience = 'all'
      or (audience = 'admins'      and is_admin())
      or (audience = 'supervisors' and is_supervisor())
      or (audience = 'teachers'    and is_teacher())
      or (audience = 'students'    and is_student())
      or (audience = 'guardians'   and is_guardian())
    )
  );

-- =============================================================================
-- Seeds (idempotentes, marcados 'demo:v1')
-- =============================================================================

insert into public.tier_yearly_rates (year, tier, kind, amount, currency, under_review, note)
values
  (2024, 'essentials', 'personal', 25.00, 'USD', false, 'demo:v1'),
  (2024, 'essentials', 'group',    27.00, 'USD', false, 'demo:v1'),
  (2024, 'special',    'personal', 30.00, 'USD', false, 'demo:v1'),
  (2024, 'special',    'group',    35.00, 'USD', true,  'demo:v1 · en evaluación'),
  (2025, 'essentials', 'personal', 25.00, 'USD', false, 'demo:v1'),
  (2025, 'essentials', 'group',    27.00, 'USD', false, 'demo:v1'),
  (2025, 'special',    'personal', 30.00, 'USD', false, 'demo:v1'),
  (2025, 'special',    'group',    35.00, 'USD', true,  'demo:v1 · en evaluación'),
  (2026, 'essentials', 'personal', 25.00, 'USD', false, 'demo:v1'),
  (2026, 'essentials', 'group',    27.00, 'USD', false, 'demo:v1'),
  (2026, 'special',    'personal', 30.00, 'USD', false, 'demo:v1'),
  (2026, 'special',    'group',    35.00, 'USD', true,  'demo:v1 · en evaluación')
on conflict (year, tier, kind) do nothing;

insert into public.app_settings (key, value, description, is_public) values
  ('payment.methods_enabled',        '["card","yappy","ach","proof","whatsapp"]'::jsonb, 'Métodos de pago activos globalmente.', true),
  ('payment.whatsapp_proof_enabled', 'true'::jsonb,   'Permite subir comprobante por WhatsApp.', true),
  ('booking.hold_ttl_minutes',       '5'::jsonb,      'Duración del bloqueo temporal en minutos.', true),
  ('booking.cancellation_hours_before','12'::jsonb,   'Horas mínimas para cancelar sin penalidad.', true),
  ('booking.screenshot_grace_minutes','10'::jsonb,    'Minutos de gracia para pantallazo de asistencia.', true),
  ('materials.max_size_mb',          '10'::jsonb,     'Tamaño máximo por material subido.', true),
  ('features.promotions',            'false'::jsonb,  'Feature flag módulo de promociones.', false),
  ('features.zoom_oauth',            'false'::jsonb,  'Feature flag Zoom OAuth para salas dinámicas.', false),
  ('features.push_notifications',    'false'::jsonb,  'Feature flag push (Expo/FCM/APNs).', false),
  ('policy.prepaid_only',            'true'::jsonb,   'Modelo 100% prepago; sin pendientes ni deferred.', true)
on conflict (key) do nothing;

-- =============================================================================
-- Rollback (destructivo — usar con precaución)
-- =============================================================================
-- drop function if exists public.expire_booking_holds();
-- drop table if exists public.announcements;
-- drop table if exists public.onboarding_state;
-- drop table if exists public.support_tickets;
-- drop table if exists public.booking_holds;
-- drop table if exists public.app_settings;
-- drop table if exists public.tier_yearly_rates;
