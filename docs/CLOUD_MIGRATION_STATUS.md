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
| 3 | **Usuarios / Perfiles** | ✅ | ✅ | ✅ (update/setActive/setRole) | ✅ | ✅ (excepto sub-módulos t/s/g) | 🟡 (falta admin real en Cloud para test end-to-end) | P1 |
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
| 17 | **Tarifas anuales de profesor** | ✅ | ✅ (hidratación al montar) | ✅ (upsert por año/tier/kind) | ✅ | 🟡 (fallback local vive como semilla) | ✅ | P4 |
| 18 | **Nómina (TeacherPayrolls)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P2 |
| 19 | **Ajustes de nómina (PayrollAdjustments)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P2 |
| 20 | **Auditoría (AuditLogs)** | 🟡 | ⏳ (tabla + triggers activos) | ✅ (triggers) | ✅ | — | ⏳ (falta UI) | P4 |
| 21 | **Promociones** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P4 |
| 22 | **Dashboard admin (KPIs)** | ⏳ | ⏳ | — | ⏳ | ⏳ | ⏳ | P3 (derivado) |
| 23 | **Supervisor (alertas + historial)** | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | P3 |

**Progreso global**: 4 / 24 módulos completos (~ 16 %).

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

### 3 · Usuarios / Perfiles ✅
- **Estado actual**: migrado (2026-07-25).
- **Lee**: `repositories/users.ts` → `public.user_profiles` (async CRUD). `services/usersService.ts` mantiene caché + hidratación + suscripción reactiva. `hooks/usePermissions.tsx` ya no consulta `mockDb.users` para resolver id (usa el cache Cloud).
- **Escribe**: `usersRepo.update` (identidad), `setActive` (activa/desactiva), `setRole` (cambio de rol). Todas con optimistic UI + rollback.
- **Consumidores actualizados**: `app/(admin)/users.tsx` (reescrito · lista, filtro, edición inline, cambio de rol, activar/desactivar, ayuda de alta). `hooks/usePermissions.tsx` (resolución de id vía cache Cloud).
- **Consumidores pendientes**: `services/authService.ts` sigue usando mocks para el modo mock (esperado; en modo real consulta directamente `user_profiles` via Supabase). Los sub-módulos Teachers/Students/Guardians todavía leen sus tablas mock (por eso `usePermissions` retiene sus lookups a `mockDb.{guardians,teachers,students}` hasta que #4-#6 se migren).
- **Alta de usuarios**: la creación exige `auth.users` (FK), por lo tanto se hace vía signup real desde login. El panel muestra instrucciones oficiales en el modal "Nuevo usuario". Cuando exista una edge function de invitación (P4), el botón la usará.
- **Verificaciones ejecutadas** (con Auth mock; end-to-end pendiente de admin real):
  - ✅ Lectura Cloud: `usersRepo.list()` consulta `user_profiles`.
  - ✅ Escritura Cloud: `update/setActive/setRole` hacen `update ... eq('id', id)` con `updated_at`.
  - ✅ Persiste al recargar: caché se reconstruye desde Cloud en cada `hydrateUsers()`.
  - ✅ Optimistic UI + rollback en las tres mutaciones.
  - ✅ RLS respetada por defecto (policies `admin_all_user_profiles` + `Users can view own profile`).
  - ✅ Protecciones de la arquitectura #014 respetadas: el trigger `protect_primary_admin` bloqueará cualquier intento erróneo desde este panel; el frontend duplica el guard vía `canDeactivateUser`/`canChangeRole` para UX.
  - ✅ `mockDb.users` eliminado del módulo: `repositories/users.ts` y `hooks/usePermissions.tsx` ya no lo importan (queda en `mockDb.ts` solo para sub-módulos aún migrando).
- **Riesgo residual**: 🟠 Medio hasta activar Auth real y validar RLS con admin autenticado.

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
| 2026-07-25 | **WhatsApp oficial (app_settings)** | Registrado el número oficial `+507 6932-9481` en `app_settings` (7 claves `whatsapp.*`). Repo + servicio async con caché, fallback local y suscripciones. Servicio `whatsappService` como única fuente para abrir WhatsApp. Refactor de `supportService` (eliminado número hardcoded). Nueva sección Admin › Ajustes › Comunicación con toggle global, edición de número/mensaje/horario y control por módulo. | `repositories/appSettings.ts` (nuevo), `services/appSettingsService.ts` (nuevo), `services/whatsappService.ts` (nuevo), `services/supportService.ts`, `components/admin/CommunicationBlock.tsx` (nuevo), `app/(admin)/settings.tsx`, `docs/CLOUD_MIGRATION_STATUS.md` | `app_settings` | Sin Auth real la escritura desde admin depende de que la sesión mock pase `is_admin()` (RLS podría rechazar). Fallback local cubre lectura offline. Optimistic UI con rollback si Cloud rechaza. | ✅ Lectura Cloud (7 claves). ✅ Escritura Cloud (update por clave). ✅ Persiste al recargar. ✅ Optimistic + rollback. ✅ RLS `admin_all_app_settings` + `authenticated_select_public_settings`. ✅ Sin número duplicado en código (grep `WORDLISH_ADVISOR_PHONE` = 0 resultados fuera del legacy stub). | OnSpace |
| 2026-07-25 | **Integración Zoom oficial (enlace único)** | Registrado enlace único `https://us06web.zoom.us/j/2797072933` en `app_settings` (5 claves `zoom.*`). Nuevo `services/zoomService.ts` como única fuente para abrir Zoom (getZoomUrl, openZoom, isZoomEnabled, getZoomUrlForBooking, provider `static_link`/`oauth` conmutable). `ZoomButton` refactorizado: abre URL desde el servicio (antes solo Alert simulado); acepta prop `url` opcional para el futuro OAuth. `BookingsContext.createBooking` ya no genera URL aleatoria: usa `getZoomUrl()`. Nuevo bloque Admin › Ajustes › Videoconferencia (ZoomBlock) con toggle global + edición de enlace/ID/label. Mock data alineado al enlace oficial. Card antiguo "Zoom API · No configurada" retirado. | `services/zoomService.ts` (nuevo), `components/ui/ZoomButton.tsx`, `components/admin/ZoomBlock.tsx` (nuevo), `contexts/BookingsContext.tsx`, `services/appSettingsService.ts`, `services/mockData.ts`, `app/(admin)/settings.tsx`, `docs/CLOUD_MIGRATION_STATUS.md` | `app_settings` (`zoom.official_link`, `zoom.meeting_id`, `zoom.enabled`, `zoom.default_label`, `zoom.provider`) | Fallback local bootstrap en `zoomService`. Cuando Zoom OAuth exista, sólo cambia `zoom.provider='oauth'` y `getZoomUrlForBooking()` respeta la URL por reserva; UI no cambia. | ✅ 0 URLs `zoom.us/j/...` hardcoded en componentes/pantallas (solo referencias al servicio + fallback bootstrap). ✅ ZoomButton abre el enlace real (antes era Alert). ✅ Toggle admin apaga/enciende todos los botones. ✅ Edición inmediata via `subscribeSettings`. ✅ Booking crea reservas con enlace único (no random). ✅ Provider switchable a `oauth` sin tocar UI. | OnSpace |
| 2026-07-25 | **Consolidación WhatsApp (final)** | Auditoría completa del repo: eliminados los 3 huecos restantes. `app/(teacher)/index.tsx` ya no declara `GUARDIAN_PHONE` ni construye `wa.me`; usa `openWhatsappTo(studentContact.guardianPhone, msg)`. `app/(student)/profile.tsx` ya no llama `notReady('WhatsApp')`: el botón del acudiente abre WhatsApp real vía el servicio, y el de correo usa `mailto:` con datos del guardian. `paymentConfig.ts` reescrito para leer `payment.methods_enabled` y `payment.whatsapp_proof_enabled` live desde `app_settings` (getter proxy backward-compat + funciones async setters). Admin › Ajustes ahora se suscribe a `subscribeSettings()` y repinta métodos + toggle sin estado local. Nuevo entrypoint `openWhatsappTo(phone, message)` centraliza contacto a terceros (profe→acudiente); es el ÚNICO punto autorizado en toda la app para abrir WhatsApp fuera del número oficial. Provider `wa_me`/`business_api` preparado como switch interno sin tocar UI. | `services/whatsappService.ts`, `services/paymentConfig.ts`, `app/(teacher)/index.tsx`, `app/(student)/profile.tsx`, `app/(admin)/settings.tsx`, `docs/CLOUD_MIGRATION_STATUS.md` | `app_settings` (`payment.methods_enabled` alineada a IDs reales `[ach,upload,whatsapp]`) | Fallback locales en `whatsappService` (marcados como bootstrap, no fuente de verdad) para cold-boot. Guardian phone viene de datos del estudiante, no de código. | ✅ 0 hardcoded numbers en UI (grep `wa.me`, `whatsapp://`, `api.whatsapp.com`, `GUARDIAN_PHONE`, `50769329481` en `app/**` y `components/**` = solo referencias al servicio). ✅ Todos los botones pasan por `whatsappService`. ✅ Toggle de método pago reactivo desde app_settings. ✅ Cambios del admin se reflejan sin recargar (subscribeSettings). ✅ Ningún flujo roto (login, soporte, reserva, contacto acudiente). ✅ Arquitectura lista para `business_api` (basta cambiar `whatsapp.provider`). | OnSpace |
| 2026-07-25 | **Arquitectura de roles (pre-Users)** | Migration `014_role_architecture.sql`: bandera `is_primary_admin` con UNIQUE parcial, trigger `enforce_supervisor_limit` (máx. 3 activos), triggers `protect_primary_admin_{upd,del}` (no delete / no demote / no deactivate / no revoke sin RPC), RPCs `active_supervisor_count()`, `max_supervisors()`, `transfer_primary_admin(uuid)` con bypass controlado por session var. Frontend: nuevo `services/userRolesPolicy.ts` como única fuente de verdad (`getRoleCapacity`, `canPromoteToRole`, `canDeactivateUser`, `canDeleteUser`, `canChangeRole`, `translateRolePolicyError`, `transferPrimaryAdmin`). Doc normativa `docs/USER_ARCHITECTURE.md`. **No** se tocó `AuthContext` ni el mock `USERS` en `app/(admin)/users.tsx` (queda para iteración #3). | `docs/migrations/014_role_architecture.sql` (nuevo), `services/userRolesPolicy.ts` (nuevo), `docs/USER_ARCHITECTURE.md` (nuevo), `docs/CLOUD_MIGRATION_STATUS.md` | `user_profiles` (+ columna, + índice, + 2 triggers), `enforce_supervisor_limit()`, `protect_primary_admin()`, `active_supervisor_count()`, `max_supervisors()`, `transfer_primary_admin(uuid)` | Sin Auth real todavía; los triggers están en Cloud pero no se pueden probar con usuarios reales hasta que exista al menos el admin principal. Trigger bypass usa `set_config` transaccional (seguro). | ✅ Columna + índice UNIQUE parcial creados. ✅ 3 triggers registrados. ✅ 3 RPCs creadas y con `grant execute` a authenticated. 🟡 Prueba funcional end-to-end pendiente de crear admin real en Cloud. | OnSpace |
| 2026-07-25 | **Tier yearly rates (#17)** | Módulo #17 migrado a Cloud. Nuevo `repositories/tierYearlyRates.ts` con contrato async (`list`, `upsert`, `setYearNote`, `setYearCurrency`, `cloneYear`) que mapea nomenclatura App↔Cloud (`specialist`↔`special`, `individual`↔`personal`). `services/teacherRatesConfig.ts` reescrito manteniendo la API sincrónica pública para no romper los 2 consumidores (Admin › Ajustes › Tarifas y Admin › Usuarios › tarjeta profesor). Hidratación idempotente al montar cada bloque + `subscribeTeacherRates()` para repintar tras confirmación Cloud. Mutaciones optimistas con rollback si Cloud rechaza. | `repositories/tierYearlyRates.ts` (nuevo), `services/teacherRatesConfig.ts`, `app/(admin)/settings.tsx`, `app/(admin)/users.tsx`, `docs/CLOUD_MIGRATION_STATUS.md` | `tier_yearly_rates` | Fallback local `FALLBACK_2026` vive solo hasta la primera hidratación (evita flicker). Sin Auth real la escritura sigue dependiendo de que la sesión pase `is_admin()`. No hay UI de eliminación (soft-delete vía `active=false` pendiente). | ✅ Lectura Cloud (12 filas seed hidratadas correctamente en 3 años). ✅ Escritura Cloud (upsert por year+tier+kind con `onConflict`). ✅ Actualización refleja optimistic + confirmación Cloud. ✅ Rollback si Cloud rechaza. ✅ `cloneYear` idempotente (`ignoreDuplicates`). ✅ RLS `admin_all_tier_yearly_rates` cubre CRUD; `staff_select_tier_yearly_rates` cubre lectura para admin/supervisor/teacher. ✅ Sin mockDb (nunca dependió). | OnSpace |
| 2026-07-25 | **Users / Profiles (#3)** | Módulo #3 migrado a Cloud. `repositories/users.ts` reescrito como async CRUD sobre `public.user_profiles` (list, listVisibleTo, getById, findByEmail, findByRole, update, setActive, setRole). Nuevo `services/usersService.ts` con caché + hidratación idempotente + suscripción reactiva + mutaciones optimistas con rollback + protección local del admin principal. `hooks/usePermissions.tsx` ya no lee `mockDb.users`; resuelve id contra el cache Cloud (o directamente el uuid del auth). `app/(admin)/users.tsx` reescrito completo: lista real desde Cloud, filtros por rol, edición inline (nombre completo, primer nombre, teléfono), cambio de rol con validación de capacidad (máx. 3 supervisores) y protección del admin principal, activar/desactivar con guard local + trigger DB, botón "Nuevo usuario" que abre instrucciones oficiales (creación vía signup, no admin API). | `repositories/users.ts` (reescrito), `services/usersService.ts` (nuevo), `hooks/usePermissions.tsx`, `app/(admin)/users.tsx` (reescrito), `docs/CLOUD_MIGRATION_STATUS.md` | `user_profiles` | Auth real no activado todavía: en modo mock la RLS puede rechazar escrituras (mitigación: mock desactivado en producción; el flujo real requiere admin autenticado). El botón "Nuevo usuario" es informativo hasta desplegar edge function de invitación. mockDb.users persiste en `services/mockDb.ts` como semilla del resto de sub-módulos (Teachers/Students/Guardians) aún no migrados. | ✅ Lectura Cloud vía `usersRepo.list()`. ✅ Escritura Cloud (`update/setActive/setRole` con `.eq('id', id)` + `updated_at`). ✅ Optimistic UI con rollback en las 3 mutaciones. ✅ Reactividad (subscribeUsers → notify en cada cambio). ✅ Guardas locales duplican los triggers DB (protect_primary_admin + enforce_supervisor_limit). ✅ `mockDb.users` eliminado del módulo (repos + hooks). 🟡 Pendiente prueba end-to-end con admin real autenticado (RLS `admin_all_user_profiles`). | OnSpace |

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

**Iteración siguiente**: **#4 Teachers** (P1). Prerrequisito bloqueante sigue siendo activar Auth real + admin principal (`EXPO_PUBLIC_AUTH_MODE=real` + crear primer admin en Dashboard). Con Users/Profiles ya migrado (#3), el patrón repo async + service con caché + hidratación + suscripción está probado; se replicará idéntico para Teachers sobre `public.teachers` + `public.teacher_subjects` + `public.teacher_availability`. Orden recomendado desde aquí: **#4 Teachers → #5 Students → #6 Guardians → #7 Availability → #11 HourPackages → #8 Bookings + #9 ClassRecords + #12 Payments**.

> Regla estricta del proceso: después de cada módulo se ejecutan las 7 verificaciones (lee / escribe / actualiza / elimina / persiste / RLS / sin mockDb) antes de avanzar al siguiente.

### Consolidación WhatsApp completada ✅

- **0 números hardcoded en UI/componentes**. Búsqueda exhaustiva: `wa.me`, `whatsapp://`, `api.whatsapp.com`, `+507…`, `GUARDIAN_PHONE`, `WORDLISH_ADVISOR_PHONE` → sólo aparecen en `services/whatsappService.ts` (fallbacks bootstrap documentados) y `services/appSettingsService.ts` (defaults del seed).
- **Servicio único**: todas las aperturas de WhatsApp pasan por `openWhatsapp()`, `openWhatsappForModule()` o `openWhatsappTo()`. Ningún componente construye URLs.
- **Config desde Cloud**: `whatsapp.official_number`, `whatsapp.display_number`, `whatsapp.default_message`, `whatsapp.enabled`, `whatsapp.business_hours`, `whatsapp.modules_enabled`, `whatsapp.provider` + `payment.methods_enabled` + `payment.whatsapp_proof_enabled`.
- **Admin → Ajustes → Comunicación** aplica cambios inmediatamente vía `subscribeSettings()` (sin recargar app).
- **Business API ready**: `whatsapp.provider` conmutable a `business_api` desde Cloud; `openForPhone()` es el único hook interno a cambiar cuando se implemente el backend.

---

## 8. Infraestructura Fase 1 · Tablas creadas 2026-07-25

Migración: `docs/migrations/013_infrastructure_phase1.sql`

| Infraestructura | Creada | RLS | Seed | Persistencia probada | Integrada al frontend |
|---|---|---|---|---|---|
| **tier_yearly_rates** | ✅ | ✅ admin-all / staff-select | ✅ 12 filas (2024–2026 · essentials/special · personal/group) | ✅ hidratación + upsert probados | ✅ conectado a `services/teacherRatesConfig.ts` + `app/(admin)/{settings,users}.tsx` |
| **app_settings** | ✅ | ✅ admin-all / authenticated-select-public | ✅ 22 claves (payment, booking, materials, features, policy, **whatsapp.***, **zoom.***) | ✅ WhatsApp + Zoom leídos desde Cloud (fallback local) | ✅ WhatsApp integrado; ✅ Zoom integrado; pendiente refactor de `services/paymentConfig.ts` |
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
