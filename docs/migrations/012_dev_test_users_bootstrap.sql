-- Migración 012 · Bootstrap de usuarios de prueba (SOLO DESARROLLO)
--
-- IMPORTANTE:
--   * NO crea cuentas en `auth.users` (eso se hace desde el Dashboard de
--     OnSpace Cloud → Users → Add User, o vía sign-up desde la app).
--   * Este script asume que ya existen los cinco correos de prueba en
--     `auth.users` y que el trigger `handle_new_user` creó sus filas base
--     en `public.user_profiles`.
--   * Este script sólo:
--       (a) Actualiza el rol y el `account_type` de cada fila de perfil.
--       (b) Crea la fila de actor correspondiente (staff/students/guardians).
--       (c) Vincula estudiante ↔ acudiente en `student_guardians`.
--   * NUNCA guarda ni imprime contraseñas.
--   * Es idempotente: puede re-ejecutarse sin duplicar filas.
--
-- Correos de prueba esperados (crear primero en el Dashboard):
--   admin@wordlish.dev        · rol admin
--   supervisor@wordlish.dev   · rol supervisor
--   profesor@wordlish.dev     · rol teacher
--   estudiante@wordlish.dev   · rol student
--   acudiente@wordlish.dev    · rol guardian
--
-- Cambia estos correos si tu equipo ya tiene otros.

-- ---------------------------------------------------------------------------
-- 1) Promoción de roles y ajuste de account_type + campos de nombre
-- ---------------------------------------------------------------------------
update public.user_profiles
   set role = 'admin', account_type = 'staff',
       full_name = coalesce(nullif(full_name,''), 'Admin de Prueba'),
       first_name = coalesce(nullif(first_name,''), 'Admin')
 where email = 'admin@wordlish.dev';

update public.user_profiles
   set role = 'supervisor', account_type = 'staff',
       full_name = coalesce(nullif(full_name,''), 'Supervisor de Prueba'),
       first_name = coalesce(nullif(first_name,''), 'Supervisor')
 where email = 'supervisor@wordlish.dev';

update public.user_profiles
   set role = 'teacher', account_type = 'staff',
       full_name = coalesce(nullif(full_name,''), 'Profesor de Prueba'),
       first_name = coalesce(nullif(first_name,''), 'Profesor')
 where email = 'profesor@wordlish.dev';

update public.user_profiles
   set role = 'student', account_type = 'student_guardian',
       full_name = coalesce(nullif(full_name,''), 'Estudiante de Prueba'),
       first_name = coalesce(nullif(first_name,''), 'Estudiante')
 where email = 'estudiante@wordlish.dev';

update public.user_profiles
   set role = 'guardian', account_type = 'student_guardian',
       full_name = coalesce(nullif(full_name,''), 'Acudiente de Prueba'),
       first_name = coalesce(nullif(first_name,''), 'Acudiente')
 where email = 'acudiente@wordlish.dev';

-- ---------------------------------------------------------------------------
-- 2) Filas de actor (staff, guardians, students)
-- ---------------------------------------------------------------------------
insert into public.staff (user_id, full_name, first_name, email, role, active)
select up.id, up.full_name, up.first_name, up.email, up.role, true
  from public.user_profiles up
 where up.email in ('admin@wordlish.dev','supervisor@wordlish.dev','profesor@wordlish.dev')
on conflict (user_id) do update
   set full_name = excluded.full_name,
       first_name = excluded.first_name,
       email = excluded.email,
       role = excluded.role,
       active = true;

insert into public.guardians (user_id, full_name, first_name, email, phone)
select up.id, up.full_name, up.first_name, up.email, coalesce(up.phone,'000-0000')
  from public.user_profiles up
 where up.email = 'acudiente@wordlish.dev'
on conflict (user_id) do update
   set full_name = excluded.full_name,
       first_name = excluded.first_name,
       email = excluded.email;

-- Estudiante ligado al acudiente cuando ambos existan
insert into public.students (user_id, guardian_id, full_name, first_name, grade, plan_tier, active)
select up.id, g.id, up.full_name, up.first_name, '9', 'essentials', true
  from public.user_profiles up
  left join public.guardians g on g.user_id = (
    select id from public.user_profiles where email='acudiente@wordlish.dev'
  )
 where up.email = 'estudiante@wordlish.dev'
on conflict do nothing;

-- Vínculo N:M student ↔ guardian (marcado como primario)
insert into public.student_guardians (student_id, guardian_id, relationship, is_primary)
select s.id, g.id, 'madre', true
  from public.students s
  join public.user_profiles ups on ups.id = s.user_id and ups.email = 'estudiante@wordlish.dev'
  join public.guardians g on g.user_id = (
    select id from public.user_profiles where email='acudiente@wordlish.dev'
  )
on conflict (student_id, guardian_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3) Fila `teachers` para el profesor de prueba
-- ---------------------------------------------------------------------------
insert into public.teachers (staff_id, user_id, tier, subjects, grades, hourly_rate)
select st.id, st.user_id, 'essentials'::teacher_tier, array['math','spanish'], array['9','10','11'], 25.00
  from public.staff st
  join public.user_profiles up on up.id = st.user_id
 where up.email = 'profesor@wordlish.dev'
on conflict (user_id) do nothing;
