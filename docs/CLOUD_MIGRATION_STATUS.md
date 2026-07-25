# Wordlish · Migración a OnSpace Cloud

> **Regla operativa**: No se inicia la migración de un módulo hasta que el anterior esté **100 % verificado** (lee de Cloud, escribe en Cloud, persiste al recargar, mock eliminado, humo probado). Cada iteración termina con este documento actualizado.

---

## 1. Tablero maestro de avance

Estados: ✅ Completo · 🟡 En progreso · ⏳ Pendiente · ⛔ Bloqueado

| # | Módulo | Estado | Lee de Cloud | Escribe en Cloud | Persistencia real | Mock eliminado | Verificado | Prioridad |
|---|---|---|---|---|---|---|---|---|
| 0 | **Auth (real vs mock)** | 🟡 | ✅ (rama real) | ✅ | ✅ solo si `AUTH_MODE=real` | ⏳ | ⏳ | P0 (bloqueante) |
| 1 | **Gastos (Expenses)** | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 (falta prueba fresh reload) | — |
| 2 | **Materias (Subjects)** | 🟡 | ⏳ (Cloud tiene 8 filas, UI no consulta) | ⏳ | ✅ (tabla) | ⏳ | ⏳ | P1 |
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

**Progreso global**: 1 / 24 módulos completos (~ 4 %).

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

### 2 · Materias (Subjects)
- **Estado actual**: hardcoded en `services/mockData.ts` como `SUBJECTS`.
- **Lee**: mock. Cloud ya tiene 8 filas seed.
- **Escribe**: nunca (catálogo estático).
- **Consumidores**: booking wizard, filtros de reportes, distribución de nómina por materia.
- **Riesgo**: 🟢 Bajo (solo lectura).
- **Tiempo estimado**: 1 iteración corta (~1 h). Ideal para calentar el flujo antes de migrar Bookings.

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

**Iteración siguiente**: Módulo **#2 Subjects** (lectura pura, 8 filas ya en Cloud, riesgo bajo). Sirve para validar el patrón `repository async → hook → pantalla` sin tocar lógica de negocio. Al cerrar, se marca ✅ y se procede con **#3 Users** que sí desbloquea todo el resto.

> Antes de iniciar, confirmar en este documento que la ficha del módulo objetivo está completa y aceptada.
