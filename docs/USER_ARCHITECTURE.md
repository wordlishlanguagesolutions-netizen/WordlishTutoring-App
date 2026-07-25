# Wordlish · Arquitectura de usuarios y roles

> Documento normativo. Cualquier trabajo sobre autenticación, migración de perfiles, panel de administración o RLS debe respetar lo aquí descrito.

Última actualización: 2026-07-25.

---

## 1. Estructura real de Wordlish

Wordlish es una operación pequeña con crecimiento moderado. La arquitectura NO debe optimizarse para multi-tenancy ni para múltiples administradores.

| Rol | Cantidad prevista | Límite duro | Enforcement |
|---|---|---|---|
| **admin** | 1 (propietario) | 1 admin principal irremplazable sin transferencia atómica | Trigger DB (`protect_primary_admin`) + bandera `is_primary_admin` con índice UNIQUE parcial |
| **supervisor** | 0 – 3 | **3 activos máximo** | Trigger DB (`enforce_supervisor_limit`) + validación UI vía `active_supervisor_count()` |
| **teacher** | 20 – 30 iniciales | Sin límite duro, hint UI de capacidad | Solo referencia UX |
| **student** | Ilimitado | — | — |
| **guardian** | Ilimitado | — | — |

**Roles oficiales (enum `specific_role`)**: `admin`, `supervisor`, `teacher`, `student`, `guardian`. No agregar más sin necesidad probada.

---

## 2. Admin principal

- **Bandera**: `public.user_profiles.is_primary_admin BOOLEAN NOT NULL DEFAULT false`.
- **Unicidad**: índice `user_profiles_only_one_primary_admin` garantiza que **sólo puede existir uno** con `true`.
- **Reglas protegidas por trigger** (`trg_protect_primary_admin_upd`, `trg_protect_primary_admin_del`):
  - ❌ No puede eliminarse (`DELETE`).
  - ❌ No puede degradarse (cambio de `role` distinto a `admin`).
  - ❌ No puede desactivarse (`active=false`).
  - ❌ No puede perder la bandera con un `UPDATE` normal.
- **Transferencia autorizada**: RPC `transfer_primary_admin(uuid)` es la ÚNICA vía. Requiere que el llamante sea `admin` y que el destino ya tenga `role='admin'`. Cambia la bandera en dos filas dentro de la misma transacción, saltándose el trigger vía `set_config('wordlish.allow_primary_admin_transfer','on', true)`.

**Frontend**: `services/userRolesPolicy.ts` → `transferPrimaryAdmin(newAdminUserId)`.

---

## 3. Supervisores (máximo 3 activos)

- **Trigger** `trg_enforce_supervisor_limit` sobre `BEFORE INSERT OR UPDATE OF role, active`:
  - Cuenta filas con `role='supervisor' AND active=true` distintas de la afectada.
  - Si ya hay 3, rechaza con `MAX_SUPERVISORS_REACHED`.
- **RPCs helper**:
  - `active_supervisor_count()` → integer, público para authenticated.
  - `max_supervisors()` → integer, retorna `3`.
- **Frontend**:
  - `getActiveSupervisorCount()` (cache de 15s).
  - `getRoleCapacity('supervisor')` → devuelve `{ active, max: 3, canAddMore, reason }`.
  - `canPromoteToRole('supervisor')` → guard listo para deshabilitar botones.
  - `translateRolePolicyError(msg)` → traduce el error del trigger para mostrarlo al admin.

**Rehabilitar un supervisor previamente desactivado** puede fallar si ya hay 3 activos: el admin debe primero desactivar otro.

---

## 4. Profesores (20 – 30 iniciales)

- Sin límite duro. La constante `INITIAL_TEACHER_CAPACITY_HINT = 30` es solo referencia UX (por ejemplo, para mostrar "27 / 30" en el dashboard).
- No agregar constraints DB para limitar profesores.
- Cada profesor tendrá su fila en `public.teachers` (FK 1:1 con `user_profiles`) con métricas propias.

---

## 5. Estudiantes y acudientes

- Sin límite artificial.
- Relaciones flexibles vía `public.student_guardians`:
  - Un estudiante puede tener 0, 1 o varios acudientes.
  - Un acudiente puede tener múltiples estudiantes.
- Un estudiante puede ser independiente (sin acudiente).

---

## 6. Permisos y RLS

**Regla dura**: la seguridad NO se implementa ocultando botones. Toda acción sensible debe estar cubierta por RLS o por una función `security definer`.

Funciones de rol ya disponibles en Cloud: `is_admin()`, `is_supervisor()`, `is_teacher()`, `is_student()`, `is_guardian()`, `is_staff()`, `current_user_role()`.

### 6.1 Alcance del admin
Acceso total a **todo**: usuarios, tarifas, pagos, ingresos, gastos, nómina, integraciones, configuración, auditoría, activación de supervisores. RLS policies `admin_all_*` ya presentes en 20+ tablas cubren esto.

### 6.2 Alcance del supervisor (operativo)
**Permitido**:
- Clases (programadas, en curso, historial).
- Asistencia, tardanzas, ausencias.
- Materiales y screenshots.
- Reportes de clase.
- Validación de comprobantes de pago (SELECT `payments`).
- Soporte al estudiante (tickets).
- Seguimiento operativo de profesores.
- Alertas del sistema.

**Prohibido** (no cubierto por policies `supervisor_*`, o excluido en `audit_logs`):
- Secretos, integraciones, credenciales.
- Cambio de admin principal.
- Tarifas maestras (`tier_yearly_rates` es sólo SELECT).
- Gastos generales (solo SELECT).
- Nóminas (`payments`, `teacher_payrolls`, `payroll_adjustments`, `hour_packages`, `teacher_rates` están excluidas en `supervisor_select_audit_logs`).
- Eliminación de usuarios o cambio de rol crítico.

### 6.3 Alcance de teacher / student / guardian
Cubierto por policies `teacher_*`, `student_*`, `guardian_*` de cada tabla. Cada rol ve **exclusivamente** su propia porción del dato.

---

## 7. Primer usuario real (proceso obligatorio)

**Antes** de habilitar Auth real para todos:

1. **Admin crea manualmente** en OnSpace Cloud Dashboard → Users:
   - Email real del propietario de Wordlish.
   - Password fuerte.
   - Marcar `role='admin'` en `user_profiles` (via SQL o vía trigger `handle_new_user` si el metadata lo trae).
2. **Marcar** `is_primary_admin=true` en su fila de `user_profiles` (via SQL en el Dashboard).
3. **Verificar**:
   - `select is_admin()` con la sesión del propietario devuelve `true`.
   - `select is_primary_admin, role from user_profiles where id = auth.uid()` devuelve `true, admin`.
   - RLS: puede leer/escribir en `expenses`, `subjects`, `tier_yearly_rates`, `app_settings`.
4. **Recién entonces** activar `EXPO_PUBLIC_AUTH_MODE=real` en `.env`.
5. Probar con el admin. Luego crear supervisores, profesores, estudiantes, acudientes reales uno por uno, verificando alcance por rol antes de escalar.

**Riesgo si se activa Auth real sin admin principal**: la app arranca con usuario autenticado sin perfil, `AuthContext` cierra la sesión de inmediato (comportamiento esperado, no bloqueante), pero los flujos administrativos quedan inaccesibles.

**Rollback**: volver a modo mock quitando la variable `EXPO_PUBLIC_AUTH_MODE` o poniéndola vacía en `.env`. La app vuelve al pool mock sin tocar datos Cloud.

---

## 8. Frontend · `services/userRolesPolicy.ts`

API pública única para toda decisión de rol:

```ts
MAX_ACTIVE_SUPERVISORS = 3
INITIAL_TEACHER_CAPACITY_HINT = 30

getActiveSupervisorCount(force?): Promise<number>
getRoleCapacity(role): Promise<RoleCapacity>
canPromoteToRole(target): Promise<{ allowed, reason? }>
canDeactivateUser(profile): { allowed, reason? }
canDeleteUser(profile): { allowed, reason? }
canChangeRole(profile): { allowed, reason? }
translateRolePolicyError(msg): string
transferPrimaryAdmin(newUserId): Promise<{ ok, error? }>
invalidateRoleCapacityCache(): void
```

Ningún componente debe consultar el conteo de supervisores directamente ni deducir el admin principal por email. Todo pasa por este servicio.

---

## 9. Migraciones asociadas

| Archivo | Fecha | Descripción |
|---|---|---|
| `docs/migrations/013_infrastructure_phase1.sql` | 2026-07-25 | Tablas de soporte (booking_holds, support_tickets, announcements, etc.) |
| `docs/migrations/014_role_architecture.sql` | 2026-07-25 | Bandera `is_primary_admin`, trigger de máx. 3 supervisores, trigger de protección del admin principal, RPCs helper, RPC de transferencia atómica |

Las migraciones son idempotentes (`create or replace`, `add column if not exists`, `drop trigger if exists`).

---

## 10. Qué NO se ha hecho todavía (bloqueado por Auth real)

- Migrar `AuthContext` para leer `is_primary_admin` desde Cloud.
- Refactorizar `app/(admin)/users.tsx` para reemplazar mock USERS por lectura Cloud.
- UI para transferir admin principal.
- Panel de supervisores con contador `2 / 3`, botón "Activar supervisor" deshabilitado cuando `canPromoteToRole('supervisor')` retorna `allowed=false`.
- Prueba end-to-end por rol.

Todo lo anterior queda en cola para la iteración "Users / Profiles" (#3 del tablero), que sólo puede empezar tras crear el admin real.
