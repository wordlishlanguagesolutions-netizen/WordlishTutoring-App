-- ============================================================================
-- Wordlish · Migration 014 · Arquitectura de roles
-- Fecha: 2026-07-25
--
-- Objetivo: reforzar a nivel DB la operación real de Wordlish:
--   · 1 administrador principal (bandera `is_primary_admin`) irremplazable
--     sin RPC de transferencia autorizada.
--   · Máximo 3 supervisores activos (trigger sobre user_profiles).
--   · RPCs helper para que el frontend consulte capacidad sin duplicar lógica.
--
-- Todas las operaciones son idempotentes.
-- ============================================================================

-- 1) Bandera "admin principal"
alter table public.user_profiles
  add column if not exists is_primary_admin boolean not null default false;

create unique index if not exists user_profiles_only_one_primary_admin
  on public.user_profiles ((true))
  where is_primary_admin = true;

-- 2) Trigger: máximo 3 supervisores activos
create or replace function public.enforce_supervisor_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer;
  max_allowed integer := 3;
begin
  if new.role = 'supervisor' and coalesce(new.active, true) = true then
    select count(*) into active_count
    from public.user_profiles
    where role = 'supervisor'
      and active = true
      and id <> new.id;
    if active_count >= max_allowed then
      raise exception 'MAX_SUPERVISORS_REACHED: solo se permiten % supervisores activos (actuales: %)',
        max_allowed, active_count using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_supervisor_limit on public.user_profiles;
create trigger trg_enforce_supervisor_limit
  before insert or update of role, active on public.user_profiles
  for each row execute function public.enforce_supervisor_limit();

-- 3) Trigger: proteger admin principal.
--    Soporta `wordlish.allow_primary_admin_transfer='on'` para permitir el
--    cambio de bandera desde `transfer_primary_admin(uuid)`.
create or replace function public.protect_primary_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bypass_flag text;
begin
  bypass_flag := current_setting('wordlish.allow_primary_admin_transfer', true);

  if tg_op = 'DELETE' then
    if old.is_primary_admin = true then
      raise exception 'CANNOT_DELETE_PRIMARY_ADMIN: la cuenta administradora principal no puede eliminarse'
        using errcode = '23514';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.is_primary_admin = true then
    if new.role is distinct from 'admin' then
      raise exception 'CANNOT_DEMOTE_PRIMARY_ADMIN: la cuenta administradora principal debe conservar el rol admin'
        using errcode = '23514';
    end if;
    if coalesce(new.active, true) = false then
      raise exception 'CANNOT_DEACTIVATE_PRIMARY_ADMIN: la cuenta administradora principal no puede desactivarse'
        using errcode = '23514';
    end if;
    if new.is_primary_admin = false and coalesce(bypass_flag, '') <> 'on' then
      raise exception 'CANNOT_REVOKE_PRIMARY_ADMIN_FLAG: usa transfer_primary_admin(uuid) para reasignar el admin principal'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_primary_admin_upd on public.user_profiles;
create trigger trg_protect_primary_admin_upd
  before update on public.user_profiles
  for each row execute function public.protect_primary_admin();

drop trigger if exists trg_protect_primary_admin_del on public.user_profiles;
create trigger trg_protect_primary_admin_del
  before delete on public.user_profiles
  for each row execute function public.protect_primary_admin();

-- 4) RPC helpers
create or replace function public.active_supervisor_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.user_profiles
  where role = 'supervisor' and active = true;
$$;
grant execute on function public.active_supervisor_count() to authenticated;

create or replace function public.max_supervisors()
returns integer
language sql
immutable
as $$ select 3::int $$;
grant execute on function public.max_supervisors() to authenticated;

-- 5) RPC: transferencia atómica del admin principal.
create or replace function public.transfer_primary_admin(new_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
begin
  if not is_admin() then
    raise exception 'FORBIDDEN: solo el administrador puede transferir el admin principal'
      using errcode = '42501';
  end if;

  select role::text into target_role from public.user_profiles where id = new_admin_id;
  if target_role is null then
    raise exception 'USER_NOT_FOUND' using errcode = '23503';
  end if;
  if target_role <> 'admin' then
    raise exception 'TARGET_NOT_ADMIN: el usuario destino debe tener rol admin antes de transferir la bandera'
      using errcode = '23514';
  end if;

  perform set_config('wordlish.allow_primary_admin_transfer', 'on', true);
  update public.user_profiles set is_primary_admin = false
    where is_primary_admin = true and id <> new_admin_id;
  update public.user_profiles set is_primary_admin = true
    where id = new_admin_id;
  perform set_config('wordlish.allow_primary_admin_transfer', 'off', true);
end;
$$;

grant execute on function public.transfer_primary_admin(uuid) to authenticated;

comment on function public.transfer_primary_admin(uuid) is
  'Wordlish · Transferencia atómica del admin principal. Solo llamable por admin autenticado. El destino debe tener role=admin antes.';

-- ============================================================================
-- Rollback (comentado, no ejecutar sin backup):
--
-- drop function if exists public.transfer_primary_admin(uuid);
-- drop function if exists public.active_supervisor_count();
-- drop function if exists public.max_supervisors();
-- drop trigger if exists trg_protect_primary_admin_del on public.user_profiles;
-- drop trigger if exists trg_protect_primary_admin_upd on public.user_profiles;
-- drop trigger if exists trg_enforce_supervisor_limit on public.user_profiles;
-- drop function if exists public.protect_primary_admin();
-- drop function if exists public.enforce_supervisor_limit();
-- drop index if exists user_profiles_only_one_primary_admin;
-- alter table public.user_profiles drop column if exists is_primary_admin;
-- ============================================================================
