-- Migración 008 · audit_logs + trigger global + adjuntar a tablas críticas
-- Requiere que todas las tablas críticas existan (001-007).

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_user_id uuid references public.user_profiles(id) on delete set null,
  actor_role specific_role,
  action text not null,
  entity text not null,
  entity_id uuid not null,
  changes jsonb,
  ip inet,
  user_agent text
);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity, entity_id, at desc);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_user_id, at desc);
create index if not exists idx_audit_logs_at on public.audit_logs(at desc);
create index if not exists idx_audit_logs_at_brin on public.audit_logs using brin(at);
alter table public.audit_logs enable row level security;
drop policy if exists "admin_select_audit_logs" on public.audit_logs;
create policy "admin_select_audit_logs" on public.audit_logs for select to authenticated using (public.is_admin());
drop policy if exists "supervisor_select_audit_logs" on public.audit_logs;
create policy "supervisor_select_audit_logs" on public.audit_logs for select to authenticated
  using (public.is_supervisor() and entity not in ('payments','teacher_payrolls','payroll_adjustments','hour_packages','teacher_rates'));

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role specific_role;
  v_entity_id uuid;
begin
  select role into v_role from public.user_profiles where id = auth.uid();
  if tg_op = 'DELETE' then
    v_entity_id := (old).id;
  else
    v_entity_id := (new).id;
  end if;
  insert into public.audit_logs(actor_user_id, actor_role, action, entity, entity_id, changes)
  values (
    auth.uid(),
    v_role,
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    jsonb_build_object(
      'before', case when tg_op <> 'INSERT' then to_jsonb(old) end,
      'after',  case when tg_op <> 'DELETE' then to_jsonb(new) end
    )
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'bookings','class_records','reports','payments','hour_packages',
    'teacher_payrolls','payroll_adjustments','teachers','students','guardians',
    'staff','promotions','teacher_rates'
  ] loop
    execute format('drop trigger if exists trg_audit_log_%1$s on public.%1$s;', t);
    execute format('create trigger trg_audit_log_%1$s after insert or update or delete on public.%1$s for each row execute function public.write_audit_log();', t);
  end loop;
end $$;
