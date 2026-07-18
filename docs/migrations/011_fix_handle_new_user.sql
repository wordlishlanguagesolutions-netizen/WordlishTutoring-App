-- Migración 011 · Compatibilidad de handle_new_user con user_profiles NOT NULL
--
-- Motivo: la migración 001 hizo NOT NULL las columnas `role`, `account_type`,
-- `full_name` y `first_name` de `public.user_profiles`. El trigger original
-- `handle_new_user` sólo insertaba `(id, username, email)`, por lo que
-- cualquier signup real fallaba con NOT NULL violation.
--
-- Este trigger:
--   * Deriva `full_name` y `first_name` desde `raw_user_meta_data` o el email.
--   * Acepta `role` y `account_type` opcionales desde `raw_user_meta_data`.
--   * Si el metadata trae un rol inválido, cae a 'student'.
--   * `account_type` se infiere del rol si no viene declarado.
--   * ON CONFLICT DO NOTHING para no romper si ya existe la fila.
--
-- NO asigna admin automáticamente. La promoción a admin/supervisor/teacher
-- se hace manualmente por un admin vía SQL después del signup.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full_name text;
  v_first_name text;
  v_role specific_role;
  v_account_type account_type;
begin
  v_full_name := coalesce(v_meta->>'full_name', v_meta->>'username', split_part(new.email, '@', 1));
  v_first_name := coalesce(v_meta->>'first_name', split_part(v_full_name, ' ', 1));

  begin
    v_role := coalesce((v_meta->>'role')::specific_role, 'student'::specific_role);
  exception when others then
    v_role := 'student'::specific_role;
  end;

  begin
    v_account_type := coalesce((v_meta->>'account_type')::account_type,
      case when v_role in ('admin','supervisor','teacher') then 'staff'::account_type
           else 'student_guardian'::account_type end);
  exception when others then
    v_account_type := case when v_role in ('admin','supervisor','teacher') then 'staff'::account_type
                           else 'student_guardian'::account_type end;
  end;

  insert into public.user_profiles (
    id, username, email, full_name, first_name, role, account_type
  ) values (
    new.id,
    coalesce(v_meta->>'username', split_part(new.email, '@', 1)),
    new.email,
    v_full_name,
    v_first_name,
    v_role,
    v_account_type
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;
