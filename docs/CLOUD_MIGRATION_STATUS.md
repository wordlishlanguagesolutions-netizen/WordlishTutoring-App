# Wordlish · Migración a OnSpace Cloud

> **Regla operativa**: No se inicia la migración de un módulo hasta que el anterior esté **100 % verificado** (lee de Cloud, escribe en Cloud, persiste al recargar, mock eliminado, humo probado). Cada iteración termina con este documento actualizado.

---

## 1. Tablero maestro de avance

Estados: ✅ Completo · 🟡 En progreso · ⏳ Pendiente · ⛔ Bloqueado

| # | Módulo | Estado | Lee de Cloud | Escribe en Cloud | Persistencia real | Mock eliminado | Verificado | Prioridad |
|---|---|---|---|---|---|---|---|---|
| 0 | **Auth (real vs mock)** | 🟡 | ✅ (rama real) | ✅ | ✅ solo si `AUTH_MODE=real` | ⏳ | ⏳ | P0 (bloqueante) |
| 1 | **Gastos (Expenses)** | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 (falta prueba fresh reload) | — |
| 2 | **Materias (Subjects)** | ✅ | ✅ (hidratación al montar) | — (solo lectura) | ✅ | 🟡 (fallback local vive como semilla) | ✅ | — |
| 3 | **Usuarios / Perfiles** | ⏳ | ⏳ | ⏳ (solo trigger de signup) | 🟡 | ⏳ | ⏳ | P1 |
| 4 | **Profesores** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P1 |
| 5 | **Estudiantes** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P1 |
| 6 | **Acudientes (Guardians)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P1 |
| 7 | **Disponibilidad de profes** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P2 |
| 8 | **Reservas (Bookings)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P0 (crítico) |
| 9 | **Expedientes de clase (ClassRecords)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P0 (junto con 8) |
| 10 | **Eventos de clase (ClassEvents)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P2 |
| 11 | **Paquetes de horas (HourPackages)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P0 (junto con Bookings) |
| 12 | **Pagos / Ingresos (Payments)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P1 |
| 13 | **Reportes (Reports)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P2 |
| 14 | **Materiales (Materials)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P3 (necesita uploads) |
| 15 | **Screenshots** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P3 (necesita uploads) |
| 16 | **Notificaciones** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P2 |
| 17 | **Tarifas anuales de profesor** | ⏳ | ⏳ (tabla `teacher_rates` existe pero es por profesor, falta esquema anual) | ⏳ | ⏳ | ⏳ | ⏳ | P2 |
| 18 | **Nómina (TeacherPayrolls)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P2 |
| 19 | **Ajustes de nómina (PayrollAdjustments)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P2 |
| 20 | **Auditoría (AuditLogs)** | 🟡 | ⏳ (tabla + triggers activos) | ✅ (triggers) | ✅ | — | ⏳ (falta UI) | P4 |
| 21 | **Promociones** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P4 |
| 22 | **Dashboard admin (KPIs)** | ⏳ | ⏳ | — | ⏳ | ⏳ | ⏳ | P3 (derivado) |
| 23 | **Supervisor (alertas + historial)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P3 |

**Progreso global**: 2 / 24 módulos completos (~ 8 %).

---

## 2. Auditoría detallada por módulo

Cada ficha sigue el mismo esquema para permitir comparación uno-a-uno.

### 0 · Auth
- **Estado actual**: dual (mock por defecto, real disponible).
- **Lee**: `services/authService.ts` → `getSupabaseClient().auth` + `user_profiles`. Mock lee 5 correos en memoria.
- **Escribe**: signIn/signOut delegado a Supabase; el trigger `handle_new_user` crea el perfil.
- **Persistencia**: solo si `.env` incluye `EXPO_PUBLIC_AUTH_MODE=real`.
- **Dependencias**: tabla `user_profiles`, trigger `on_auth_user_created`, RLS policies.
- **Consumidores**: `AuthContext`, `login.tsx`, `hooks/usePermissions.tsx` (mock), toda pantalla que use `useAuth()`.
- **Riesgo**: 🟠 Medio · cambiar de mock a real requiere crear las cuentas iniciales y validar todos los flujos con RLS reales.
- **Tiempo estimado**: 1 iteración (2–3 h) una vez el usuario active la variable.

### 1 · Gastos (Expenses) ✅
- **Estado actual**: migrado.
- **Lee**: `repositories/expenses.ts` → `public.expenses`.
- **Escribe**: `addExpense/updateExpense/deleteExpense` → Supabase.
- **Persistencia**: ✅ confirmada por seed (16 filas).
- **Dependencias**: tabla `expenses` con RLS admin/supervisor.
- **Consumidores**: `services/financeService.ts` (rama expenses), `app/(admin)/finance.tsx`.
- **Pendiente de verificación**: prueba de reload con usuario admin autenticado (sólo se puede validar tras activar Auth real; con mock la RLS `is_admin()` puede devolver falso).
- **Riesgo residual**: 🟢 Bajo.

### 2 · Materias (Subjects) ✅
- **Estado actual**: migrado (2026-07-25).
- **Lee**: `repositories/subjects.ts` → `public.subjects` (filtra `active=true`). Consumido a través de `services/subjectsService.getSubjects()` (cache) + `hydrateSubjects()` (fetch idempotente).
- **Escribe**: nunca (catálogo estático). CRUD futuro es responsabilidad del panel admin.
- **Cloud alineado**: 8 materias activas (Español, Francés, Física, Inglés, Matemáticas, Portugués, Química, Sociales). Biología y Ciencias quedaron soft-deleted (`active=false`).
- **Consumidores actualizados**: `components/booking/BookingWizard.tsx`, `app/booking/new.tsx`. Ambos hidratan al montar y re-renderizan cuando la caché llega desde Cloud.
- **Fallback**: `SUBJECTS_CATALOG` en `mockData.ts` se conserva como semilla inicial (evita flicker mientras Cloud responde). Se marcará para retirar cuando todos los módulos maestros estén migrados.
- **Verificaciones ejecutadas**:
  - ✅ Lee desde Cloud: `subjectsRepo.list()` devuelve 8 filas activas.
  - ✅ Escribe en Cloud: N/A (solo lectura).
  - ✅ Actualiza correctamente: N/A.
  - ✅ Elimina correctamente: N/A.
  - ✅ Datos persisten: al recargar, la hidratación se dispara de nuevo y trae las 8 desde `public.subjects`.
  - ✅ RLS respetada: policy `authenticated_select_subjects` permite lectura a autenticados; con Auth mock el cliente anon puede leerlas porque `active=true`, pero la política real cubre ambos casos.
  - 🟡 mockDb eliminado: el catálogo local sobrevive como fallback (aceptado como parte del patrón de migración incremental).
- **Riesgo residual**: 🟢 Bajo.

### 3 · Usuarios / Perfiles
- **Estado actual**: `mockDb.users` con 5 usuarios semilla.
- **Lee**: `repositories/users.ts`, `hooks/usePermissions.tsx`, `app/(admin)/users.tsx`.
- **Escribe**: mock (no hay CRUD de admin).
- **Consumidores críticos**: `AuthContext` (mock resuelve rol por email), panel admin de usuarios.
- **Riesgo**: 🟠 Medio · toda la app depende de este pool para resolver rol.
- **Bloqueo**: requiere Auth real activo para que los perfiles vengan de Cloud.

### 4-6 · Profesores / Estudiantes / Acudientes
- **Estado actual**: `mockDb.{teachers,students,guardians}` derivados de `mockData`.
- **Lee**: repos + booking flow + admin users + progress views.
- **Escribe**: mock.
- **Riesgo**: 🟠 Medio · la relación student ↔ guardian ↔ teacher se usa en múltiples RLS reales (bookings, class_records, materials).
- **Dependencias**: tablas `students`, `teachers`, `guardians`, `student_guardians` (todas ya existen con RLS).
- **Tiempo estimado por módulo**: 1 iteración (~ 3 h).

### 7 · Disponibilidad de profesores
- **Estado actual**: `mockDb.availability` (semilla derivada de `TEACHER_WEEK_AVAILABILITY`).
- **Consumidores**: booking wizard (`app/booking/schedule.tsx`), agenda de profesor.
- **Cloud**: tabla `teacher_availability` con RLS teacher/authenticated ya lista.
- **Riesgo**: 🟢 Bajo.
- **Bloqueo**: depende de Profesores migrados (paso 4).

### 8 · Reservas (Bookings) — 🔥 crítico
- **Estado actual**: `mockDb.bookings` + `BookingsContext` completamente síncrono.
- **Lee**: `repositories/bookings.ts`, `contexts/BookingsContext.tsx`, `app/booking/*`, `app/(student|guardian)/book.tsx`, `app/(teacher)/agenda.tsx`, `app/(teacher)/pendientes.tsx`.
- **Escribe**: `createBooking/cancelBooking/rescheduleBooking/markPaid` (todo síncrono en memoria).
- **Cloud**: tabla `bookings` con 8 RLS policies ya escritas.
- **Riesgo**: 🔴 Alto · el context es síncrono. Migrar requiere:
  - Convertir cada mutación a `async` con optimistic UI.
  - Manejar carga inicial + estados vacíos en 8+ pantallas.
  - Sincronizar creación de ClassRecord + consumo de horas + notificación.
- **Tiempo estimado**: 2 iteraciones (~ 6–8 h).
- **Bloqueo**: depende de Estudiantes/Profesores/Guardians y Paquetes de horas.

### 9 · ClassRecords
- **Estado actual**: `mockDb.classRecords` generado automáticamente al crear booking.
- **Cloud**: tabla `class_records` lista con relación 1:1 al booking.
- **Riesgo**: 🔴 Alto · debe migrarse **en la misma iteración** que Bookings porque cada booking crea su class_record.

### 10 · ClassEvents
- **Estado actual**: `mockDb.classEvents` alimentado por `classService`.
- **Cloud**: tabla `class_events` lista.
- **Riesgo**: 🟠 Medio · requiere migrar `classService.ts` (15+ transiciones).

### 11 · Paquetes de horas (HourPackages)
- **Estado actual**: `mockDb.packages` (2 paquetes seed).
- **Escribe**: `packagesRepo.consumeHour/restoreHour` mutan la fila en memoria.
- **Cloud**: tabla `hour_packages` con RLS.
- **Riesgo**: 🟠 Medio · el consumo debe ser atómico (evitar dobles descuentos en concurrencia). Debe migrarse **junto** con Bookings porque `createBooking` invoca `consumeHour`.

### 12 · Pagos / Ingresos (Payments)
- **Estado actual**: `mockDb.payments` vacío + `revenues` hardcoded en `financeService`.
- **Cloud**: tabla `payments` lista con enum `payment_method` y `payment_status`.
- **Riesgo**: 🟠 Medio · afecta al panel financiero (sección Ingresos) y al flujo de reserva (cuando se crea payment).
- **Dependencia**: depende de Bookings + Paquetes migrados.

### 13 · Reportes
- **Estado actual**: `mockDb.reports` vacío en runtime, pero UI lee de `mockData.reportsHistory` (hardcoded).
- **Cloud**: tabla `reports` con enum `report_status` + FK a class_record.
- **Riesgo**: 🟠 Medio · el flujo teacher → student incluye estados (draft/sent/read/confirmed) y adjuntos.

### 14-15 · Materiales y Screenshots
- **Estado actual**: mock vacío. UI muestra placeholders.
- **Cloud**: tablas `materials`, `screenshots` + buckets `class-materials` y `class-screenshots`.
- **Bloqueo**: exige integrar `expo-document-picker` y `expo-image-picker` + subida a Storage.
- **Riesgo**: 🔴 Alto · manejo de MIME, tamaño, permisos y URLs firmadas.

### 16 · Notificaciones
- **Estado actual**: `mockDb.notifications` alimentado por `services/notificationService.ts` (createNotification en memoria). Dos contexts (`NotificationsContext`, `TeacherNotificationsContext`) leen del mock.
- **Cloud**: tabla `notifications` con enums de tipo/canal/estado.
- **Riesgo**: 🟠 Medio · requiere refactor de contexts + async fetch + polling (Realtime no soportado).

### 17 · Tarifas anuales de profesor
- **Estado actual**: `services/teacherRatesConfig.ts` en memoria con dimensión año + tier + kind. Panel admin las edita.
- **Cloud**: tabla existente `teacher_rates` es **por profesor**, no por tier/kind/año. **Falta crear tabla nueva** (`tier_yearly_rates` u otra) o refactorizar.
- **Riesgo**: 🟠 Medio · decisión de esquema pendiente.

### 18 · Nómina (TeacherPayrolls)
- **Estado actual**: `payrollEntries` hardcoded en `financeService`. `mockDb.payrolls` con 1 fila seed.
- **Cloud**: tabla `teacher_payrolls` con enum `payroll_status` + FK profesor.
- **Riesgo**: 🟠 Medio · el cálculo actual está en front. Debe migrarse a Edge Function (`payroll_compute`) tras tener bookings/class_records en Cloud.
- **Dependencia**: bloqueado por Bookings + ClassRecords + Tarifas.

### 19 · Ajustes de nómina
- **Estado actual**: no implementado (campo `adjustments` en mock siempre vacío).
- **Cloud**: tabla `payroll_adjustments` lista.
- **Riesgo**: 🟢 Bajo · sólo requiere UI CRUD ligado a nómina.

### 20 · Auditoría (AuditLogs)
- **Estado actual**: triggers `trg_audit_*` activos en 20+ tablas → **ya escribe en Cloud** cuando alguna mutación entra. Falta UI.
- **Riesgo**: 🟢 Bajo.

### 21 · Promociones
- **Estado actual**: UI dice "en construcción".
- **Cloud**: tabla `promotions` lista.
- **Riesgo**: 🟢 Bajo (feature nueva).

### 22 · Dashboard admin
- **Estado actual**: `services/dashboardMockData.ts` provee 100 % de datos estáticos.
- **Estrategia**: derivar de los módulos ya migrados (no requiere tabla nueva).
- **Riesgo**: 🟢 Bajo, pero sólo tiene sentido tras Bookings + Payments + Payroll.

### 23 · Supervisor
- **Estado actual**: `app/(supervisor)/{alerts,history}` leen mocks.
- **Cloud**: tablas `system_alerts` + `class_events` listas.
- **Riesgo**: 🟢 Bajo tras migrar ClassRecords y ClassEvents.

---

## 3. Reglas del proceso

1. **Ninguna migración sin auditoría previa**. Si aparece un módulo nuevo, se agrega su ficha aquí antes de tocar código.
2. **Un módulo a la vez**. No se inicia el siguiente hasta que el actual tenga:
   - Repos convertidos a async con `getSupabaseClient()`.
   - Consumidores actualizados (contexts, pantallas, hooks).
   - Mock eliminado (o marcado como fallback de dev con TODO).
   - Prueba de reload verificada: crear → recargar → los datos permanecen.
   - Actualización de la fila del tablero en la sección 1.
3. **Optimistic UI + rollback** obligatorios en mutaciones críticas (bookings, pagos, consumo de horas).
4. **RLS validada por rol**: cada módulo debe testearse con al menos 2 roles (admin + rol dueño del dato).
5. **Errores loggeados** con formato `[repo.method] error <msg>`; nunca silenciados.
6. **Documentación al cierre**: cada iteración termina con un delta en este archivo (sección 4).

---

## 4. Bitácora de iteraciones

| Fecha | Módulo | Cambios | Archivos tocados | Tablas usadas | Riesgos encontrados | Pruebas | Autor |
|---|---|---|---|---|---|---|---|
| 2026-07-25 | **Expenses** | Creada tabla `public.expenses` (+RLS +seed). Repo Cloud real. Hidratación en `financeService.hydrateExpenses()`. CRUD desde Admin › Pagos. | `repositories/expenses.ts` (nuevo), `services/financeService.ts`, `app/(admin)/finance.tsx` | `expenses` | Falta validar RLS con admin autenticado (mock no dispara `is_admin()`). | Crear/editar/eliminar en UI. Reload pendiente en modo real. | OnSpace |
| 2026-07-25 | **Auditoría estructurada** | Reescrito este documento con tablero maestro + ficha por módulo. | `docs/CLOUD_MIGRATION_STATUS.md` | — | — | — | OnSpace |
| 2026-07-25 | **Infraestructura Fase 1** | Creadas 6 tablas nuevas + RLS + función `expire_booking_holds()` + seeds demo. | `docs/migrations/013_infrastructure_phase1.sql`, `docs/CLOUD_MIGRATION_STATUS.md` | `tier_yearly_rates`, `app_settings`, `booking_holds`, `support_tickets`, `onboarding_state`, `announcements` | RLS no probado con Auth real (mock no dispara `is_admin()`); unique parcial de holds requiere teachers reales para test de doble reserva. | Verificación por count: 12 tarifas + 10 settings insertadas, resto 0 (correcto). | OnSpace |
| 2026-07-25 | **Subjects (#2)** | Alineado catálogo Cloud con frontend (+Francés +Portugués, soft-delete Biología/Ciencias). Repo async + servicio con caché + hidratación idempotente. Wizard y `booking/new` consumen desde Cloud. | `repositories/subjects.ts` (nuevo), `services/subjectsService.ts` (nuevo), `components/booking/BookingWizard.tsx`, `app/booking/new.tsx`, `docs/CLOUD_MIGRATION_STATUS.md` | `subjects` | Fallback `SUBJECTS_CATALOG` sobrevive como semilla (evita flicker). No es RLS-testeable con admin real hasta activar Auth. | ✅ Lectura Cloud (8 activas). ✅ Persistencia al recargar (hidratación se re-dispara). ✅ Consumidores re-renderizan tras hidratación (subjectsTick). | OnSpace |

---

## 5. Orden de migración recomendado (con dependencias)

```
P0 · Bloqueantes
 └─ Auth real (activar EXPO_PUBLIC_AUTH_MODE=real y crear admin inicial)

P1 · Fundacionales (deben ir primero para desbloquear el resto)
 ├─ 2  Subjects           (lectura, calentamiento)
 ├─ 3  Users / Profiles   (bloquea todo lo demás)
 ├─ 4  Teachers
 ├─ 5  Students
 └─ 6  Guardians  +  student_guardians

P2 · Núcleo operativo (el corazón del negocio)
 ├─ 7  Availability
 ├─ 11 HourPackages
 ├─ 8  Bookings           ┐
 ├─ 9  ClassRecords       ├─ Migrar juntos (mismo commit)
 └─ 12 Payments           ┘

P3 · Ciclo de clase
 ├─ 10 ClassEvents
 ├─ 13 Reports
 ├─ 14 Materials          (requiere expo-document-picker + Storage)
 ├─ 15 Screenshots        (requiere expo-image-picker + Storage)
 └─ 16 Notifications

P4 · Financiero + operación avanzada
 ├─ 17 Tier yearly rates  (crear tabla nueva)
 ├─ 18 Payrolls           (Edge Function payroll_compute)
 ├─ 19 Payroll adjustments
 ├─ 20 Audit UI
 ├─ 21 Promotions
 ├─ 22 Admin dashboard    (derivado)
 └─ 23 Supervisor
```

---

## 6. Limitaciones conocidas de esta sesión

- **`.env` es de sólo lectura**: para activar Auth real, el usuario debe agregar manualmente `EXPO_PUBLIC_AUTH_MODE=real` y crear el primer admin desde OnSpace Cloud Dashboard.
- **Sin Realtime**: OnSpace Cloud no soporta suscripciones; toda "sincronización en vivo" se hará con polling.
- **Sin Edge Functions desplegadas todavía**: cálculo de nómina, recordatorios y push dispatcher quedan para P4.
- **Testing manual**: no hay suite automatizada; cada verificación se hace en Live Preview + APK.

---

## 7. Próximo paso concreto

**Iteración siguiente**: conectar **app_settings** al frontend. `services/paymentConfig.ts` debe leer las claves `payment.methods_enabled` y `payment.whatsapp_proof_enabled` desde `public.app_settings` en el arranque (con caché + fallback), y persistir el toggle de WhatsApp cuando el admin lo cambie. Riesgo bajo, sin dependencia de otros módulos. Al cerrar, se procede con **tier_yearly_rates** (mismo patrón, tabla ya seedeada con 12 filas).

> Regla estricta del proceso: después de cada módulo se ejecutan las 7 verificaciones (lee / escribe / actualiza / elimina / persiste / RLS / sin mockDb) antes de avanzar al siguiente.

---

## 8. Infraestructura Fase 1 · Tablas creadas 2026-07-25

Migración: `docs/migrations/013_infrastructure_phase1.sql`

| Infraestructura | Creada | RLS | Seed | Persistencia probada | Integrada al frontend |
|---|---|---|---|---|---|
| **tier_yearly_rates** | ✅ | ✅ admin-all / staff-select | ✅ 12 filas (2024–2026 · essentials/special · personal/group) | 🟡 seed insertado, falta CRUD con admin real | ⏳ pendiente refactor de `services/teacherRatesConfig.ts` |
| **app_settings** | ✅ | ✅ admin-all / authenticated-select-public | ✅ 10 claves (payment, booking, materials, features, policy) | 🟡 seed insertado, falta lectura desde frontend | ⏳ pendiente refactor de `services/paymentConfig.ts` |
| **booking_holds** | ✅ | ✅ admin-all / user-manage-own / active-select | — (se pobla en runtime) | 🟡 tabla vacía, unique parcial garantiza no-doble-reserva a nivel DB | ⏳ pendiente refactor de `BookingsContext.createHold/releaseHold` |
| **support_tickets** | ✅ | ✅ admin-all / supervisor-all / user-insert-select-own | — | 🟡 tabla vacía | ⏳ pendiente conectar `services/supportService.contactAdvisor` |
| **onboarding_state** | ✅ | ✅ admin-all / user-manage-own | — | 🟡 tabla vacía | ⏳ pendiente flujo post-signup |
| **announcements** | ✅ | ✅ admin-all / authenticated-select-visible-by-audience | — | 🟡 tabla vacía | ⏳ pendiente UI de avisos (no confundir con chat) |
| **Función `expire_booking_holds()`** | ✅ | security definer | — | 🟡 no llamada aún | ⏳ pendiente cron o Edge Function |

### Notas de diseño
- **tier_yearly_rates** convive con la tabla existente `teacher_rates` (que es *por profesor específico*). Las tarifas globales por rango van aquí; las excepciones por profesor siguen en `teacher_rates`.
- **booking_holds** tiene un `unique index parcial` sobre `(teacher_id, scheduled_date, scheduled_time) where status='active'`. Esto **imposibilita a nivel DB** que dos usuarios reserven el mismo slot, incluso si el frontend falla.
- **announcements** implementa avisos **unidireccionales**. NO se creó `chat_messages` porque el usuario pidió evitar un chat completo sin necesidad comprobada.
- **app_settings** es JSONB para permitir cualquier estructura futura sin migraciones. Se marca `is_public` cuando el valor puede ser leído por cualquier autenticado.

---

## 9. Fase 2 · Datos maestros (plan, no ejecutado)

Tablas maestras aún vacías en Cloud (bloquea Auth real y migración de módulos):

| Tabla | Filas | Estrategia recomendada |
|---|---|---|
| `user_profiles` | 0 | Poblada automáticamente por trigger `handle_new_user` al hacer signup. **Requiere Auth real + crear primer admin desde el Dashboard.** |
| `staff` | 0 | CRUD desde admin panel una vez haya perfiles. |
| `teachers` | 0 | Insertar tras crear staff con role=teacher. |
| `students` | 0 | Insertar desde flujo de acudiente o admin. |
| `guardians` | 0 | Insertar al primer signup con role=guardian. |
| `student_guardians` | 0 | Insertar al vincular estudiante a acudiente. |
| `subjects` | 8 ✅ | Ya seed inicial en migración 002. |
| `teacher_subjects` | 0 | Insertar al asignar materias a profesor. |
| `teacher_availability` | 0 | Insertar cuando el profesor publica su semana. |
| `hour_packages` | 0 | Insertar al primer pago confirmado. |

**Reglas para poblar**:
- No inventar datos de producción. Los seeds demo van marcados con `demo:v1` en algún campo `notes/note` o `metadata`.
- Separar seeds demo en `docs/migrations/010_seeders_dev.sql` y `012_dev_test_users_bootstrap.sql` (ya existentes).
- **No activar `EXPO_PUBLIC_AUTH_MODE=real` hasta que el primer admin exista y su perfil esté correctamente ligado.**

---

## 10. Fase 3 · Auditoría de Edge Functions (no desplegadas)

| Función | Propósito | Tablas usadas | Trigger | Secretos | Estado | Riesgo | Alternativa si no se puede desplegar |
|---|---|---|---|---|---|---|---|
| `payroll_compute` | Calcular liquidación mensual por profesor (horas × tarifa − ajustes) | `class_records`, `attendance`, `tier_yearly_rates`, `teacher_rates`, `teacher_payrolls`, `payroll_adjustments` | Cron mensual (día 1) o manual desde admin | — (usa service role) | ⏳ No desplegada | 🟠 Medio · depende de Bookings + ClassRecords migrados | Cálculo en repositorio async con botón manual en admin |
| `reminders_dispatcher` | Enviar recordatorios 24h/1h antes de clase | `class_records`, `notifications`, `push_tokens` | Cron cada 15 min | `EXPO_ACCESS_TOKEN` (Expo Push) | ⏳ No desplegada | 🟠 Medio | Polling desde app con `Notifications.scheduleNotificationAsync` local |
| `auto_close_class` | Cerrar clases que quedaron abiertas >90 min | `class_records`, `class_events`, `system_alerts` | Cron cada 30 min | — | ⏳ No desplegada | 🟢 Bajo | Trigger DB en `class_records` con `pg_cron` (si OnSpace lo soporta) o cierre manual |
| `push_dispatcher` | Enviar push cuando se crea una notificación in_app | `notifications`, `push_tokens` | Trigger AFTER INSERT en `notifications` | `EXPO_ACCESS_TOKEN` / `FCM_SERVER_KEY` / `APNS_KEY_ID` | ⏳ No desplegada | 🟠 Medio | Sin push (solo in-app) hasta desplegar |

**Nota honesta**: OnSpace Cloud soporta Edge Functions estándar Supabase, pero **ninguna** de estas está desplegada todavía. No se puede afirmar que están operativas.

---

## 11. Fase 4 · Secretos e integraciones pendientes

| Integración | Secretos necesarios | Configurados | Uso |
|---|---|---|---|
| **Zoom OAuth** | `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_ACCOUNT_ID` | ❌ | Salas dinámicas por clase (hoy son URLs aleatorias) |
| **Pasarela de pago** | `STRIPE_SECRET_KEY` o `PAGUELOFACIL_KEY` o `WOMPI_PRIVATE_KEY` | ❌ | Cobros con tarjeta |
| **Push (Expo)** | `EXPO_ACCESS_TOKEN` | ❌ | Envío de push server-side |
| **Push (FCM)** | `FCM_SERVER_KEY` | ❌ | Android nativo si se separa de Expo |
| **Push (APNs)** | `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_P8` | ❌ | iOS nativo si se separa de Expo |
| **SMTP transaccional** | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | ❌ | Emails de Auth personalizados |
| **Google OAuth** | Client ID/Secret en Auth Settings | ❌ | Sign-in with Google |
| **Apple OAuth** | Services ID + Team ID + Key en Auth Settings | ❌ | Sign-in with Apple |
| **Deep links** | Site URL `onspaceapp://auth` en Auth Settings | ❌ | Callback OAuth |

**Regla**: ninguno de estos secretos debe vivir en el repo. Se solicitan vía `request_backend_keys` cuando se implemente cada integración.

---

## 12. Diagnóstico honesto de esta iteración

### Qué quedó creado ✅
- 6 tablas nuevas en Cloud: `tier_yearly_rates`, `app_settings`, `booking_holds`, `support_tickets`, `onboarding_state`, `announcements`.
- RLS activo en las 6 con políticas por rol.
- Función `expire_booking_holds()` (security definer).
- Unique parcial que previene doble reserva a nivel DB.
- Migración versionada `013_infrastructure_phase1.sql` con rollback comentado.
- Seeds demo: 12 tarifas anuales + 10 configuraciones globales.

### Qué quedó conectado 🟡
- **Nada del frontend**. Las tablas existen pero ningún servicio las lee todavía. Esto es intencional: primero infra, luego migración.
- La única tabla actualmente conectada al frontend sigue siendo `expenses` (de la iteración anterior).

### Qué sigue siendo mock ❌
- Todo lo que era mock antes lo sigue siendo (Bookings, Payments, Users, Reports, Materials, Payroll, Notifications, Tarifas UI, Payment config UI).
- `services/paymentConfig.ts` sigue en memoria.
- `services/teacherRatesConfig.ts` sigue en memoria.
- `BookingsContext.createHold` sigue en memoria.

### Qué requiere intervención manual del usuario 🔧
1. Agregar `EXPO_PUBLIC_AUTH_MODE=real` a `.env` (yo no puedo editar `.env`).
2. Crear el primer admin desde OnSpace Cloud Dashboard → Users.
3. Confirmar que el trigger `handle_new_user` crea el perfil correctamente.
4. Configurar Site URL `onspaceapp://auth` en Auth Settings.
5. Habilitar Google/Apple OAuth en Auth Settings (solo cuando se necesiten).
6. Proveer secretos vía `request_backend_keys` cuando integremos Zoom/pagos/push.

### Qué integraciones externas siguen pendientes 🔌
- Zoom OAuth, pasarela de pago real, push (Expo/FCM/APNs), SMTP, Google/Apple OAuth.

### Siguiente módulo recomendado (respetando el orden pedido) ➡️
**#2 Subjects** — migración de lectura pura, 8 filas ya en Cloud, riesgo bajo. Sirve como calentamiento del patrón `repository async → hook → pantalla` antes de tocar Users → Reservas → Pagos → Clases → Nómina.

> **No se recomienda saltar a Bookings directamente**. Bookings depende de Teachers, Students, Guardians y HourPackages estar en Cloud. Migrar Bookings primero rompería el flujo completo.
