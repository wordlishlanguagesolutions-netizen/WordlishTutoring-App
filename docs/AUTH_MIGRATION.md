# Fase 3A · Migración de autenticación a OnSpace Cloud

Este documento describe el estado, activación y verificación de la autenticación real. **La UI, las rutas y la lógica de roles NO cambiaron.** Sólo el servicio de auth y el AuthContext.

---

## 1 · Modos disponibles

`services/authService.ts` está preparado como servicio dual, controlado por la variable de entorno `EXPO_PUBLIC_AUTH_MODE`:

| Valor | Comportamiento | Cuándo usarlo |
| --- | --- | --- |
| `mock` (default) | Correos ficticios + contraseña `123456` en memoria. Sin persistencia. | Desarrollo local antes de tener cuentas reales. Vía de recuperación si Auth real falla. |
| `real` | Supabase Auth vía OnSpace Cloud. Sesión persistente. Perfil desde `public.user_profiles`. | Cuando ya existen cuentas reales asignadas con rol. |

Cualquier valor distinto de `real` cae a `mock`. El default protege que la app **nunca quede inaccesible** si aún no hay usuarios creados.

### Cambio de modo

En `.env`:

```
EXPO_PUBLIC_AUTH_MODE=real
```

Reinicia Metro (`npx expo start -c`) para tomar la variable.

---

## 2 · Trigger `handle_new_user` corregido

La Fase 2 dejó `user_profiles.role`, `account_type`, `full_name` y `first_name` como NOT NULL. La migración **011** actualiza el trigger `handle_new_user` para:

* Derivar `full_name`/`first_name` desde `raw_user_meta_data` o del email.
* Aceptar `role` y `account_type` opcionales desde el metadata (validando el enum).
* Fallback: `role='student'`, `account_type='student_guardian'`.
* `ON CONFLICT (id) DO NOTHING` (idempotente).

Ya fue aplicada al proyecto vivo. Sin este fix, ningún signup real completaría.

---

## 3 · Crear los usuarios de prueba (sin credenciales en código)

1. Abre **OnSpace Cloud → Users → Add User** y crea manualmente estos cinco correos con la contraseña que elijas (guárdala fuera del repositorio):

   ```
   admin@wordlish.dev
   supervisor@wordlish.dev
   profesor@wordlish.dev
   estudiante@wordlish.dev
   acudiente@wordlish.dev
   ```

   El trigger `handle_new_user` creará automáticamente su fila en `public.user_profiles` con rol `student` por defecto.

2. Ejecuta la migración **012** en el SQL Editor de OnSpace Cloud. El script:
   * Ajusta el rol y el `account_type` de cada fila de perfil.
   * Crea las filas de actor correspondientes (`staff`, `guardians`, `students`, `teachers`).
   * Vincula estudiante ↔ acudiente en `student_guardians`.
   * Es **idempotente** (puede re-ejecutarse).
   * **Nunca guarda ni imprime contraseñas.**

3. Reemplaza las cuentas por las de tu equipo real ajustando los `WHERE email = ...` del script.

### Promoción segura a admin

* Un usuario **no puede** cambiar su propio rol desde el cliente: las políticas RLS de `user_profiles` sólo permiten `update` de campos propios sin escalar rol, mientras que `admin_all_user_profiles` es la única política que autoriza `update` de la columna `role`.
* La primera cuenta admin se promueve **manualmente** vía SQL Editor (paso 2 arriba) o desde la fila de `user_profiles` en el panel Data. No hay atajo desde la app.

---

## 4 · Verificación de RLS por rol

Ejecuta en el SQL Editor (reemplaza el UUID según cada test):

```sql
-- Login como admin: debe ver todo
set local role authenticated;
set local request.jwt.claims to '{"sub":"<UUID_ADMIN>"}';
select count(*) from public.bookings;         -- >= 0, sin error
select count(*) from public.teacher_payrolls; -- >= 0

-- Login como teacher: sólo sus clases
set local request.jwt.claims to '{"sub":"<UUID_TEACHER>"}';
select count(*) from public.bookings
 where teacher_id in (select id from public.teachers where user_id = auth.uid());

-- Login como student: sólo sus reservas
set local request.jwt.claims to '{"sub":"<UUID_STUDENT>"}';
select id from public.bookings limit 5;
```

Ejecuta el bloque completo en una transacción para que `set local` tenga efecto. La ausencia de errores + resultados coherentes valida las políticas.

---

## 5 · Plan de pruebas mínimas

| # | Escenario | Resultado esperado |
| --- | --- | --- |
| 1 | Login correcto (correo real + contraseña real) | Redirección al home del rol correspondiente. |
| 2 | Login con contraseña incorrecta | Mensaje `Correo o contraseña incorrectos.` |
| 3 | Logout | Vuelve a `/login`. Sesión eliminada en local storage. |
| 4 | Cerrar y reabrir la app | Sesión persistente: entra directo al home del rol. |
| 5 | Recuperación de contraseña | `authService.resetPassword(email)` retorna `{ ok: true }`. Correo llega al usuario. |
| 6 | Redirección por rol | Cada rol aterriza en su layout (`(admin)`, `(supervisor)`, `(teacher)`, `(student)`, `(guardian)`). |
| 7 | Ruta no autorizada | Consultas RLS-protegidas devuelven vacío o error 401. |
| 8 | iOS + Android + Web | Login funciona en las 3 plataformas (Supabase JS usa AsyncStorage en RN y localStorage en Web). |
| 9 | UI sin cambios | Pantallas `/login`, `/index`, y cada home siguen idénticas. |
| 10 | Resto de módulos | Reservas, clases, pagos, reportes, materiales y nómina continúan leyendo de `mockDb`. |

### Cómo revertir la migración

Si Auth real falla:

1. En `.env`: `EXPO_PUBLIC_AUTH_MODE=mock`
2. `npx expo start -c`
3. La app vuelve al comportamiento anterior con los correos de prueba en memoria.

No se necesita `git revert`: la rama mock quedó preservada.

---

## 6 · Archivos modificados en esta fase

| Archivo | Cambio |
| --- | --- |
| `services/authService.ts` | Servicio dual mock/real detrás de `EXPO_PUBLIC_AUTH_MODE`. Añade `resetPassword`, `mode`, `isReal`. API pública compatible. |
| `contexts/AuthContext.tsx` | Se suscribe a `onAuthStateChange` en modo real. Añade `resetPassword`. |
| `.env.example` | Documenta `EXPO_PUBLIC_AUTH_MODE`. |
| `docs/migrations/011_fix_handle_new_user.sql` | Fix del trigger (ejecutado en OnSpace Cloud). |
| `docs/migrations/012_dev_test_users_bootstrap.sql` | Bootstrap opcional de perfiles/actores para las 5 cuentas de prueba (sin contraseñas). |
| `docs/AUTH_MIGRATION.md` | Este documento. |

**Sin cambios:** `app/login.tsx`, `app/index.tsx`, `hooks/useAuth.tsx`, `constants/roles.ts`, todos los layouts, todos los repositorios, `mockDb.ts`, `template/*`.

---

## 7 · Datos que ya no vienen de mockDb

Solo dos superficies leen datos reales cuando `EXPO_PUBLIC_AUTH_MODE=real`:

1. **Sesión activa** (`auth.users` + JWT).
2. **Perfil del usuario logueado** (`public.user_profiles`).

Todo lo demás (reservas, clases, reportes, pagos, materiales, nómina, notificaciones, disponibilidad, promociones) sigue leyendo de `services/mockDb.ts`. La migración de repositorios es la Fase 3B en adelante.

---

## 8 · Riesgos pendientes

* **Sin flujo de signup en la app.** El registro sigue siendo administrativo (Dashboard + SQL). Aceptable en esta fase.
* **`resetPassword` no tiene deep link configurado.** Envía el correo de Supabase estándar; el usuario lo abre y sigue el flujo de OnSpace Cloud. Se ajustará cuando integremos deep links.
* **Sesión persistente en Web** requiere `localStorage` habilitado. En navegación privada estricta el usuario deberá loguearse cada vez.
* **`user_profiles.role` es la única fuente de verdad del rol.** Si un admin cambia el rol de un usuario logueado, la app respetará el cambio en el siguiente `onAuthStateChange` o refresco.
* **`handle_new_user` deja rol por defecto `student`.** Nuevos signups sin promoción quedan como estudiantes hasta que un admin los ajuste. Consciente.
