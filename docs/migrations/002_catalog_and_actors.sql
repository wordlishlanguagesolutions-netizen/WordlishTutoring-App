-- Migración 002 · Catálogo (subjects, promotions) y actores (guardians, staff)
-- Requiere 001.

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_subjects on public.subjects;
create trigger trg_audit_subjects before insert or update on public.subjects for each row execute function public.set_row_audit_fields();
alter table public.subjects enable row level security;
drop policy if exists "authenticated_select_subjects" on public.subjects;
create policy "authenticated_select_subjects" on public.subjects for select to authenticated using (active = true or public.is_admin());
drop policy if exists "admin_all_subjects" on public.subjects;
create policy "admin_all_subjects" on public.subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  kind text not null check (kind in ('percent','flat','plan')),
  value numeric(10,2),
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses int,
  used_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_promotions on public.promotions;
create trigger trg_audit_promotions before insert or update on public.promotions for each row execute function public.set_row_audit_fields();
alter table public.promotions enable row level security;
drop policy if exists "authenticated_select_active_promotions" on public.promotions;
create policy "authenticated_select_active_promotions" on public.promotions
  for select to authenticated
  using (public.is_admin() or (active = true and (starts_at is null or now() >= starts_at) and (ends_at is null or now() <= ends_at)));
drop policy if exists "admin_all_promotions" on public.promotions;
create policy "admin_all_promotions" on public.promotions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.guardians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.user_profiles(id) on delete cascade,
  full_name text not null,
  first_name text not null,
  email text not null,
  phone text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_guardians on public.guardians;
create trigger trg_audit_guardians before insert or update on public.guardians for each row execute function public.set_row_audit_fields();
create index if not exists idx_guardians_user_id on public.guardians(user_id);
alter table public.guardians enable row level security;
drop policy if exists "admin_all_guardians" on public.guardians;
create policy "admin_all_guardians" on public.guardians for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_select_guardians" on public.guardians;
create policy "supervisor_select_guardians" on public.guardians for select to authenticated using (public.is_supervisor());
drop policy if exists "guardian_select_self" on public.guardians;
create policy "guardian_select_self" on public.guardians for select to authenticated using (user_id = auth.uid());
drop policy if exists "guardian_update_self" on public.guardians;
create policy "guardian_update_self" on public.guardians for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.user_profiles(id) on delete cascade,
  full_name text not null,
  first_name text not null,
  email text,
  phone text,
  avatar_url text,
  role specific_role not null check (role in ('admin','supervisor','teacher')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
drop trigger if exists trg_audit_staff on public.staff;
create trigger trg_audit_staff before insert or update on public.staff for each row execute function public.set_row_audit_fields();
create index if not exists idx_staff_user_id on public.staff(user_id);
create index if not exists idx_staff_role on public.staff(role);
alter table public.staff enable row level security;
drop policy if exists "admin_all_staff" on public.staff;
create policy "admin_all_staff" on public.staff for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "supervisor_select_staff" on public.staff;
create policy "supervisor_select_staff" on public.staff for select to authenticated using (public.is_supervisor());
drop policy if exists "staff_select_self" on public.staff;
create policy "staff_select_self" on public.staff for select to authenticated using (user_id = auth.uid());
drop policy if exists "staff_update_self" on public.staff;
create policy "staff_update_self" on public.staff for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
