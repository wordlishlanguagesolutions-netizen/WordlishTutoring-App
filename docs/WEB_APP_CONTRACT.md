# Backend and App Contract for Web

Documento de referencia único para adaptar **WordlishTutoring App** (React Native + Expo) a **WordlishWeb**. Comparten el mismo backend (OnSpace Cloud / Supabase). Sin credenciales incluidas.

---

## 1. Tablas del backend compartido (27)

Todas viven en el esquema `public`. RLS activo en todas.

| # | Tabla | Uso principal |
|---|---|---|
| 1 | `user_profiles` | Perfil canónico 1:1 con `auth.users`. Fuente de rol y estado. |
| 2 | `students` | Ficha del estudiante (con o sin `user_id`). |
| 3 | `guardians` | Ficha del acudiente. |
| 4 | `student_guardians` | Relación N:M estudiante ↔ acudiente. |
| 5 | `staff` | Admin, supervisor, teacher (datos operativos). |
| 6 | `teachers` | Extensión didáctica de staff (materias, grados, tarifa, stats). |
| 7 | `subjects` | Catálogo de materias. |
| 8 | `teacher_subjects` | N:M profesor ↔ materia. |
| 9 | `teacher_availability` | Slots semanales publicables. |
| 10 | `hour_packages` | Banco de horas por estudiante. |
| 11 | `bookings` | Reservas de clase. |
| 12 | `class_records` | Expediente único de clase (1:1 con booking). |
| 13 | `class_events` | Timeline inmutable de la clase. |
| 14 | `screenshots` | Evidencia visual (1 por class_record). |
| 15 | `reports` | Reporte post-clase (1 por class_record). |
| 16 | `materials` | Adjuntos pre/post-clase. |
| 17 | `attendance` | Asistencia atómica por participante. |
| 18 | `payments` | Transacciones de cliente. |
| 19 | `promotions` | Descuentos y campañas. |
| 20 | `notifications` | Centro de notificaciones por usuario. |
| 21 | `system_alerts` | Alertas para supervisor/admin. |
| 22 | `teacher_rates` | Snapshot histórico de tarifas. |
| 23 | `teacher_payrolls` | Liquidación mensual por profesor. |
| 24 | `payroll_adjustments` | Ajustes de nómina. |
| 25 | `push_tokens` | Tokens Expo/FCM por usuario. |
| 26 | `policy_acknowledgements` | Registro de aceptación de políticas. |
| 27 | `audit_logs` | Bitácora global (writes por trigger). |

Tablas auxiliares presentes en Cloud: `announcements`, `app_settings`, `booking_holds`, `expenses`, `support_tickets`, `tier_yearly_rates`, `onboarding_state`.

---

## 2. Columnas principales y relaciones

### 2.1 Núcleo de identidad

- **`user_profiles`**: `id` (uuid = `auth.users.id`), `email`, `full_name`, `first_name`, `phone`, `avatar_url`, `role` (`admin|supervisor|teacher|student|guardian`), `account_type` (`staff|student_guardian`), `active` (bool), `is_primary_admin`.
- **`students`**: `id`, `user_id`→`user_profiles`, `guardian_id`→`guardians`, `full_name`, `age`, `grade`, `school`, `plan_tier` (`essentials|special`), `active`.
- **`guardians`**: `id`, `user_id`→`user_profiles`, `full_name`, `email`, `phone`.
- **`staff`**: `id`, `user_id`→`user_profiles`, `role` (`admin|supervisor|teacher`), `active`.
- **`teachers`**: `id`, `staff_id`→`staff`, `user_id`→`user_profiles`, `tier`, `subjects[]`, `grades[]`, `hourly_rate`, `stats` (jsonb).

### 2.2 Clase / reserva

- **`bookings`**: `id`, `student_id`, `guardian_id`, `teacher_id`, `substitute_id`, `subject_id`, `package_id`, `class_record_id`, `kind` (`personal|group`), `scheduled_date`, `scheduled_time`, `starts_at` (generated), `duration_min`, `status`, `zoom_url`, `hour_consumed`, snapshots (`student_name`, `teacher_name`, avatares).
- **`class_records`**: `id`, `booking_id` (UNIQUE), `student_id`, `teacher_id`, `guardian_id`, `subject_id`, `kind`, `status` (`scheduled|in_progress|ok|no_screenshot|teacher_late|student_late|no_camera|technical|completed|cancelled|student_absent`), `zoom_url`, `started_at`, `ended_at`, `student_joined_at`, `teacher_joined_at`, `screenshot_id`, `report_id`, `student_topic`, `observations`, `supervisor_notes`, `substitute_assigned`.
- **`class_events`**: `id`, `class_record_id`, `type`, `at`, `actor_user_id`, `actor_role`, `message`, `meta` (jsonb). Inmutable.
- **`attendance`**: `id`, `class_record_id`, `student_id`, `status`, `joined_at`, `left_at`, `minutes_late`.

### 2.3 Contenido de clase

- **`reports`**: `id`, `class_record_id` (UNIQUE), `booking_id`, `teacher_id`, `student_id`, `topic`, `progress`, `objectives`, `strengths`, `improvements`, `homework`, `guardian_notes`, `rating`, `attachments[]`, `status` (`draft|sent|read|confirmed`), `submitted_at`, `read_at`, `confirmed_at`.
- **`screenshots`**: `id`, `class_record_id`, `booking_id`, `teacher_id`, `student_id`, `storage_path`, `captured_at`, `verified`.
- **`materials`**: `id`, `class_record_id`, `booking_id`, `teacher_id`, `student_id`, `title`, `description`, `kind` (`PDF|MP3|MP4|DOC|IMG|LINK`), `storage_path`, `source` (`student|teacher`).

### 2.4 Dinero

- **`hour_packages`**: `id`, `student_id`, `guardian_id`, `name`, `tier`, `total_hours`, `remaining_hours`, `purchased_at`, `expires_at`, `payment_id`, `status` (`active|expired|depleted|cancelled`).
- **`payments`**: `id`, `student_id`, `guardian_id`, `package_id`, `booking_id`, `concept`, `amount`, `currency`, `status` (`pending|paid|failed|refunded`), `method` (`card|yappy|cuanto|transfer|other`), `paid_at`, `external_reference`, `receipt_url`.
- **`teacher_rates`**: `teacher_id`, `personal_hour_rate`, `group_hour_rate`, `absence_pay_rate`, `effective_from/to`, `active`.
- **`teacher_payrolls`**: `teacher_id`, `month` (YYYY-MM), `period_start/end`, `payable_hours`, `payable_absences`, `computed_total`, `final_total`, `status` (`draft|reviewed|paid`), `paid_at`, `payment_receipt_url`. **Regla dura**: `paid` bloquea `UPDATE` vía trigger.

### 2.5 Sistema

- **`notifications`**: `user_id`, `type`, `title`, `message`, `channel`, `read`, `action_route`, `ref_type/ref_id`, `scheduled_for`, `tone`, `icon`.
- **`system_alerts`**: `class_record_id`, `teacher_id`, `student_id`, `type`, `severity`, `resolved`.
- **`audit_logs`**: `actor_user_id`, `actor_role`, `action`, `entity`, `entity_id`, `changes` (jsonb).

---

## 3. Tabla usada por cada módulo

| Módulo funcional | Tabla(s) primaria(s) |
|---|---|
| Autenticación | `auth.users` + `user_profiles` |
| Onboarding admin bootstrap | `user_profiles.is_primary_admin` (RPC `bootstrap_primary_admin`, `primary_admin_exists`) |
| Perfil de usuario | `user_profiles`, `students`, `guardians`, `staff`, `teachers` |
| Gestión de usuarios (admin) | `user_profiles` + tabla especializada por rol |
| Creación de staff | Edge Function `create-staff-user` → `auth.users` + `user_profiles` + `staff`/`teachers` |
| Catálogo de profesores | `teachers` + `teacher_subjects` + `subjects` |
| Disponibilidad semanal | `teacher_availability` |
| Reserva de clase | `bookings` + `booking_holds` (holds transitorios) |
| Expediente de clase | `class_records` + `class_events` |
| Zoom | `class_records.zoom_url` / `zoom_meeting_id` |
| Reportes | `reports` |
| Materiales | `materials` (+ bucket `class-materials`) |
| Screenshot de clase | `screenshots` (+ bucket `class-screenshots`) |
| Asistencia | `attendance` |
| Banco de horas | `hour_packages` |
| Pagos | `payments` (+ bucket `payment-receipts`) |
| Promociones | `promotions` |
| Nómina | `teacher_payrolls` + `payroll_adjustments` + `teacher_rates` (+ bucket `payroll-receipts`) |
| Notificaciones | `notifications` + `push_tokens` |
| Alertas supervisor | `system_alerts` |
| Políticas | `policy_acknowledgements` + `announcements` |
| Auditoría | `audit_logs` |
| Reporte global con IA | Edge Function `generate-global-report` (lee reports/class_records) |

---

## 4. Módulos disponibles por rol

### admin
Dashboard operativo, Usuarios (crea/edita/desactiva students/guardians/staff/teachers), Paquetes (catálogo), Pagos (ingresos/gastos/nómina), Ajustes (políticas, tarifas), Reporte Global del Estudiante (IA), Impersonation "Ver como…".

### supervisor
Monitor en tiempo real (clases en curso, screenshots, alertas), Historial (auditoría limitada, sin financiero).

### teacher
Inicio (próxima clase), Agenda (disponibilidad + horario publicado), Pendientes (reportes por entregar, screenshots vencidos), Perfil (tarifas visibles, subjects, grades), Clase en curso (Zoom + screenshot + reporte).

### student
Inicio, Mis clases (reservar + agenda + pagar), Reportes (leer / confirmar), Perfil, Detalle de clase.

### guardian
Inicio, Reservas de sus estudiantes, Reportes (leer / confirmar), Perfil, Detalle de clase.

Todos: Notificaciones, Políticas, Cierre de sesión.

---

## 5. Rutas actuales (Expo Router)

### Grupos por rol (en móvil son tabs; en desktop son sidebar)

```
app/(admin)/       → index, users, finance, packages, settings
app/(supervisor)/  → index (monitor), history
app/(teacher)/     → index, agenda, pendientes, profile
app/(student)/     → index, book, payments (oculto), progress, profile
app/(guardian)/    → index, book, payments (oculto), progress, profile
```

### Rutas globales (fuera de grupo)

```
/login                    · pantalla dual (staff | student_guardian)
/signup                   · registro publico (rol student por defecto)
/forgot-password          · solicita OTP
/reset-password           · verifica OTP + fija password
/verify-email             · confirmacion OTP de signup
/bootstrap-admin          · one-time promocion a admin
/policies                 · politicas globales
/notifications            · centro de notificaciones
/settings/notifications   · preferencias por canal
/global-report            · reporte IA (solo admin)

/booking/type             · elegir tipo (personal|group)
/booking/teacher          · elegir profesor
/booking/schedule         · elegir slot
/booking/summary          · resumen previo
/booking/pay              · pagar
/booking/new              · atajo (deep link)
/booking/mine             · mis reservas
/booking/groups           · clases grupales
/booking/[id]             · detalle de reserva

/class/[id]               · expediente de clase (timeline, materiales, reporte)
/class/policies           · politicas por tipo de clase
/payments/[id]            · detalle de pago
/reports/[id]             · detalle de reporte
/teacher/standards        · estandares del profesor
```

Para web (URL amigable) mapear `(admin)/index` → `/admin`, `(teacher)/agenda` → `/teacher/agenda`, etc. Los grupos con paréntesis son solo agrupadores de Expo Router.

---

## 6. Servicios y repositorios principales

### Services (`services/*.ts`) — lógica de negocio
- `authService.ts` — Modo dual (mock/real). Firma pública: `signIn`, `signUp`, `resetPassword`, `verifySignupOtp`, `verifyRecoveryOtp`, `updatePassword`, `getCurrentUser`, `logout`. **En producción fuerza `real`.**
- `bootstrapAdminService.ts` — RPCs `bootstrap_primary_admin(email)` y `primary_admin_exists()`.
- `bookingsService.ts`, `bookingService.ts`, `bookingFlash.ts` — creación y flujo de reservas.
- `classRecordsService.ts` — expediente de clase.
- `classService.ts` — helpers de clase en curso.
- `reportsService.ts`, `materialsService.ts`, `screenshotsService.ts` — contenido de clase.
- `paymentsService.ts` — pagos + comprobantes + signed URLs (**3 min de expiración**).
- `packagesService.ts` — banco de horas.
- `payrollService.ts`, `teacherRatesConfig.ts` — nómina.
- `notificationService.ts`, `notificationPrefsService.ts`, `pushService.ts` — notificaciones y push.
- `usersService.ts`, `studentsService.ts`, `guardiansService.ts`, `teachersService.ts` — CRUD por rol.
- `globalReportService.ts` — invoca Edge Function `generate-global-report`.
- `zoomService.ts`, `whatsappService.ts`, `supportService.ts`, `soporteService.ts` — integraciones externas.
- `subjectsService.ts`, `appSettingsService.ts`, `securityService.ts`, `userRolesPolicy.ts`, `policiesAck.ts`, `exportService.ts`, `financeService.ts`.

### Repositories (`repositories/*.ts`) — acceso a datos Supabase
`users`, `bookings` (via service), `packages` (via service), `classRecords` (via service), `materials` (via service), `screenshots` (via service), `reports` (via service), `payments` (via service), `classEvents`, `notifications`, `availability`, `payrolls`, `pushTokens`, `guardians`, `students`, `teachers`, `subjects`, `expenses`, `tierYearlyRates`, `appSettings`, `base`.

Convención: services hacen cache + orquestación; repos ejecutan CRUD directo contra Supabase con RLS.

### Edge Functions (`supabase/functions/*`)
- `create-staff-user` — crea usuario auth + fila en `staff`/`teachers` atómicamente. Requiere admin.
- `send-push` — despacha a Expo Push API (Android).
- `generate-global-report` — llama OnSpace AI (Gemini) con reportes existentes.

---

## 7. Estados por entidad

| Entidad | Estados válidos | Transiciones |
|---|---|---|
| `bookings.status` | `pending_payment`, `confirmed`, `cancelled`, `rescheduled`, `completed`, `student_absent`, `technical_issue` | `pending_payment → confirmed → completed \| cancelled \| rescheduled \| student_absent \| technical_issue` |
| `class_records.status` | `scheduled`, `in_progress`, `ok`, `no_screenshot`, `teacher_late`, `student_late`, `no_camera`, `technical`, `completed`, `cancelled`, `student_absent` | `scheduled → in_progress → completed \| cancelled \| student_absent`; los sub-estados operativos se aplican durante `in_progress` |
| `payments.status` | `pending`, `paid`, `failed`, `refunded` | `pending → paid \| failed`; `paid → refunded` |
| `hour_packages.status` | `active`, `expired`, `depleted`, `cancelled` | `active → depleted` (remaining=0) / `expired` (fecha) / `cancelled` (admin) |
| `reports.status` | `draft`, `sent`, `read`, `confirmed` | `draft → sent → read → confirmed` |
| `materials.source` | `student` (pre-clase) o `teacher` (post-clase) | — |
| `teacher_payrolls.status` | `draft`, `reviewed`, `paid` | `draft → reviewed → paid` (terminal, inmutable) |
| `attendance.status` | `attended`, `late`, `absent`, `excused` | — |

---

## 8. Reglas de negocio importantes

1. **Un usuario = un rol**. El trigger `prevent_self_role_escalation` bloquea auto-escalada. Cambios de rol solo por admin.
2. **Admin principal único**. `is_primary_admin=true` protegido por `protect_primary_admin`. Cambio vía `transfer_primary_admin`.
3. **Reports/Screenshots/Materials nunca existen sueltos**. Siempre pertenecen a un `class_record`.
4. **Cada booking crea su class_record** automáticamente al confirmar.
5. **Anti-doble reserva**: índice único parcial `(teacher_id, starts_at) WHERE status IN ('pending_payment','confirmed')`.
6. **Nómina pagada es inmutable**. Trigger `block_paid_payroll_update` rechaza UPDATE.
7. **Snapshots en booking** (student_name, teacher_name, avatars) se actualizan por trigger cuando cambia el perfil origen; no editar manualmente.
8. **Reset de contraseña con OTP de 4 dígitos**, no magic link. Longitud fija (`Email OTP Length: 4`, expira en 3600 s).
9. **Usuarios inactivos** (`active=false`) no pueden loguear. `authService` verifica en login y en rehidratación de sesión.
10. **Signed URLs** de payment-receipts / screenshots / materials expiran en **3 minutos**.
11. **Impersonación** ("Ver como…") es solo cambio de UI en memoria. El rol real no cambia y RLS sigue enforcing la identidad real del admin.
12. **Registro público** solo crea `role='student'` (trigger `handle_new_user`). Staff se crea desde admin vía Edge Function.
13. **Máximo de supervisores** enforced por trigger `enforce_supervisor_limit` (RPC `max_supervisors`).
14. **Timezone**: todos los `timestamptz` en UTC. Presentación en cliente.

---

## 9. Permisos y restricciones por rol (RLS resumida)

| Tabla | admin | supervisor | teacher | student | guardian |
|---|---|---|---|---|---|
| `user_profiles` | ALL | SELECT | SELF | SELF | SELF |
| `students` / `guardians` | ALL | SELECT | SELECT (sus clases) | SELF | SELECT (vinculados) |
| `bookings` | ALL | SELECT | SELECT/UPDATE (suyas) | SELECT/INSERT (suyas) | SELECT/INSERT (por estudiante) |
| `class_records` | ALL | ALL | SELECT/UPDATE (suyas) | SELECT (suyas) | SELECT (suyos) |
| `class_events` | ALL | ALL | INSERT/SELECT (suyos) | INSERT/SELECT (suyos) | INSERT/SELECT (suyos) |
| `reports` | ALL | ALL | CRUD (no confirmed) | SELECT + read/confirm | SELECT + read/confirm |
| `materials` | ALL | SELECT | INSERT/SELECT (suyos) | INSERT/SELECT (suyos) | SELECT (vinculados) |
| `screenshots` | ALL | ALL | CRUD (suyos) | SELECT (suyos) | — |
| `attendance` | ALL | ALL | CRUD (sus clases) | SELECT (suya) | SELECT (vinculada) |
| `payments` | ALL | SELECT | — | SELECT (suyos) | SELECT (suyos) |
| `hour_packages` | ALL | SELECT | — | SELECT (suyos) | SELECT (suyos) |
| `teacher_payrolls` | ALL | — | SELECT (reviewed/paid) | — | — |
| `payroll_adjustments` | ALL | — | SELECT (suyos) | — | — |
| `teacher_rates` | ALL | — | SELECT (suyos) | — | — |
| `notifications` | ALL | — | SELF | SELF | SELF |
| `system_alerts` | ALL | ALL | — | — | — |
| `audit_logs` | SELECT | SELECT (sin financiero) | — | — | — |
| `subjects`, `promotions` | ALL | SELECT | SELECT (activos) | SELECT (activos) | SELECT (activos) |
| `teacher_availability` | ALL | SELECT | CRUD (suya) | SELECT (published) | SELECT (published) |

Buckets Storage: `avatars` (público SELECT), `class-materials` / `class-screenshots` / `payment-receipts` / `payroll-receipts` (privados, participant-scoped o owner-only).

---

## 10. Flujos críticos

### 10.1 Login
1. Usuario elige tipo (staff | student_guardian).
2. `authService.signIn(email, password, expectedAccountType)` → `supabase.auth.signInWithPassword`.
3. Se resuelve perfil desde `user_profiles` (rol + `active`).
4. Si `active=false` → `signOut` + error.
5. Si `expectedAccountType` no coincide → `signOut` + error.
6. Router redirige a `/(admin) | /(supervisor) | /(teacher) | /(student) | /(guardian)`.

### 10.2 Agenda del profesor
1. Teacher publica `teacher_availability(week_start, weekday, slots[])` con `published_at`.
2. Student/guardian consultan solo `published_at IS NOT NULL`.
3. Reserva escribe `bookings` respetando el índice único anti-doble-reserva.

### 10.3 Clase en curso
1. `class_record.status='scheduled'` → clase próxima.
2. Al iniciar Zoom, teacher marca `started_at` y `status='in_progress'`. Se registra `class_event(type='class_started')`.
3. Screenshot obligatorio: teacher sube a bucket `class-screenshots`, inserta en `screenshots`, actualiza `class_records.screenshot_id`.
4. Al terminar, `ended_at` + `status='completed'`. Consume 1h de `hour_packages` (trigger o service).
5. Sub-estados operativos (`no_screenshot`, `teacher_late`, `no_camera`, `technical`) durante `in_progress`.

### 10.4 Zoom
Enlace estático hoy (`bookings.zoom_url` / `class_records.zoom_url`). Botón "Abrir Zoom" hace `Linking.openURL`. **Web debe usar `window.open(url, '_blank')`.** Integración OAuth Zoom pendiente.

### 10.5 Screenshot
- Bucket: `class-screenshots` (privado).
- Path convencional: `classes/{class_record_id}/{ts}-screenshot.jpg`.
- RLS: sólo participantes y admin/supervisor. Signed URL 3 min.
- Móvil sube con `base64-arraybuffer`. **Web debe usar `File → Blob` directo** via `supabase.storage.from(...).upload()`.

### 10.6 Reporte post-clase
1. `reports.status='draft'` mientras teacher lo edita.
2. Al enviar → `status='sent'`, `submitted_at` set. Notificación al student/guardian.
3. Cuando abren el detalle → `status='read'`, `read_at` set.
4. Al confirmar → `status='confirmed'`, `confirmed_at` set. **Ya no se puede editar por teacher.**

### 10.7 Materiales
- Bucket `class-materials` (privado).
- `source='student'` (pre-clase, subido por estudiante o acudiente).
- `source='teacher'` (post-clase).
- RLS por participante o admin. Signed URL 3 min.

### 10.8 Pagos
1. Usuario paga → `payments.status='pending'` con `method` correspondiente.
2. Se sube comprobante a bucket `payment-receipts` → `receipt_url` set.
3. Admin verifica y marca `status='paid'` + `paid_at`.
4. Se dispara creación de `hour_packages` si aplica (`payment_id` referenciado).

### 10.9 Banco de horas
- `hour_packages.remaining_hours` decrementa 1 por clase completada.
- Estados calculados por triggers/cron: `depleted` cuando llega a 0, `expired` cuando `expires_at < now()`.
- Booking solo confirma si hay saldo en un package `active` del `tier` correcto.

### 10.10 Creación de Staff (E2E)
1. Admin abre `/(admin)/users` → "Nuevo profesor/supervisor".
2. Front invoca Edge Function `create-staff-user` (JWT admin en headers).
3. Función crea `auth.users` + envía invite email + inserta en `staff` (+ `teachers` si aplica).
4. Usuario recibe email → establece password via `/reset-password` (OTP).
5. Login en `/login` (tipo staff) → redirect a su dashboard.
6. Si falla algún paso, la función hace rollback (no deja registros parciales).

### 10.11 Cierre de sesión
1. Usuario presiona "Salir".
2. `authService.logout()` → `supabase.auth.signOut()`.
3. Se limpian todas las caches locales (`resetXxxCache()` de cada service).
4. `router.replace('/login')`.

---

## 11. Archivos clave (nombres exactos)

### Cliente Supabase
- `template/core/client.ts` — `getSupabaseClient()` (fuente única).
- `template/core/config.ts` — validación env.

### Auth
- `services/authService.ts`
- `services/bootstrapAdminService.ts`
- `contexts/AuthContext.tsx`
- `hooks/useAuth.tsx`
- `components/ui/RoleGuard.tsx`

### Impersonación
- `contexts/ImpersonationContext.tsx`
- `hooks/useImpersonation.tsx`
- `components/ui/ImpersonationBanner.tsx`

### Layouts por rol
- `app/(admin)/_layout.tsx`
- `app/(supervisor)/_layout.tsx`
- `app/(teacher)/_layout.tsx`
- `app/(student)/_layout.tsx`
- `app/(guardian)/_layout.tsx`

### Reservas y clase
- `app/booking/type.tsx`, `teacher.tsx`, `schedule.tsx`, `summary.tsx`, `pay.tsx`, `mine.tsx`, `[id].tsx`
- `app/class/[id].tsx`
- `components/booking/BookingWizard.tsx`, `BookingCard.tsx`, `PaymentMethods.tsx`
- `components/class/ClassTimeline.tsx`

### UI reutilizable
- `components/ui/{Button,Card,GlassCard,Input,Modal,Header,Screen,Avatar,Icon,StatCard,StatusBadge,PageContainer,WebSidebar,WebTwoColumn,Skeleton,KnowCard,NotificationBanner,NotificationsHUD,SupportRow,ZoomButton,RoleGuard,ImpersonationBanner}.tsx`

### Tokens de diseño
- `constants/theme.ts` — colors, spacing, typography, radius, shadow, motion.
- `constants/roles.ts` — `ROLES`, `getRoleInfo(role)`, rutas por rol.
- `constants/breakpoints.ts` — desktop / tablet / mobile.
- `constants/policies.ts`, `constants/contextualPolicies.ts`, `constants/designPhilosophy.ts`, `constants/teacherCulture.ts`.

### Types
- `types/enums.ts` — todos los enums de dominio (fuente única).
- `types/models.ts` — todas las interfaces (`Booking`, `ClassRecord`, `Report`, etc.).

### Edge Functions
- `supabase/functions/create-staff-user/index.ts`
- `supabase/functions/send-push/index.ts`
- `supabase/functions/generate-global-report/index.ts`

---

## 12. Componentes reutilizables conceptualmente en web

Copiar la **API** y **tokens visuales**, adaptar implementación a HTML/CSS:

- **Button** (variantes `primary | ghost | destructive`, tamaños `sm | md`, `leftIcon`, `fullWidth`, `loading`).
- **Card / GlassCard** (contenedor con radius + sombra Apple + tinted variant).
- **Input** (label + icono + estado error).
- **StatCard** (KPI: `label`, `value`, `icon`, `tone`, `hint`).
- **StatusBadge** (`tone: primary|success|warning|danger|info`).
- **Header** (`title`, `subtitle`, `back`).
- **Screen / PageContainer** (max-width auth, form, dashboard).
- **WebSidebar** + **WebTwoColumn** (ya diseñados para desktop; portables casi 1:1 a web).
- **ImpersonationBanner** (sticky top, tint primary).
- **NotificationsHUD** (toaster).
- **RoleGuard** (HOC → wrapper de layout en web).
- **Skeleton**, **Avatar**, **KnowCard**, **SupportRow**.

**Design tokens portables directos:**
- Familia tipográfica (Manrope), pesos (400/500/600/700).
- Paleta morada (`primary`, `primaryDark`, `primarySoft`, `surfaceTinted`) + neutros.
- Radios (`sm=8`, `md=12`, `lg=16`, `card=20`, `pill=999`).
- Espaciado 4pt/8pt grid.
- Sombras (`xs`, `sm`, `md`, `lg`).

---

## 13. Pantallas que necesitan adaptación específica para escritorio

Las pantallas móviles usan tabs inferiores y layouts verticales. En escritorio requieren:

- **Login** — layout centrado, ancho máximo ~440px, columna única. Ya se contempla vía `PageContainer maxWidth="auth"`.
- **Signup / Reset password / Verify email** — igual que login, un solo panel centrado.
- **Dashboard admin** — grid de 3 columnas (`(admin)/index.tsx` ya lo tiene). Portable.
- **Usuarios (admin)** — tabla ancha con filtros y modal lateral en vez de pantalla completa.
- **Finanzas (admin)** — tabla + gráficas + panel de detalle lateral.
- **Agenda del profesor** — vista semanal completa (7 columnas × slots), no scroll vertical de 1 día.
- **Monitor del supervisor** — grilla de tarjetas de clases en curso simultáneas + panel de alertas fijo.
- **Reservas** — wizard pasa de pantallas móviles a stepper horizontal con panel de resumen a la derecha.
- **Detalle de clase** (`class/[id]`) — timeline a la izquierda, materiales + reporte a la derecha (two-column).
- **Reporte global** — layout de dos columnas: input arriba, reporte generado con scroll fijo a la derecha.
- **Notificaciones** — split view (lista + detalle) en vez de push-to-detail.

**No requieren rediseño mayor:** perfiles, políticas, forgot/reset password, verify email.

---

## 14. Módulos con mock o fallback (NO copiar directo a WordlishWeb)

Los siguientes servicios/archivos aún contienen datos simulados o rutas mock. En Web deben conectarse directamente a las tablas reales sin heredar el fallback:

- `services/mockData.ts` — datos semilla (estudiantes, profesores, reservas, reportes, KPIs admin).
- `services/mockDb.ts` — DB simulada en memoria (fallback usado en modo dev sin backend).
- `services/dashboardMockData.ts` — KPIs, clases en vivo, próximas, pagos pendientes, mensajes, alertas del dashboard admin.
- Rama **mock** de `services/authService.ts` (`MOCK_EMAIL_TO_ROLE`, `MOCK_MASTER_PASSWORD='123456'`, `mockGetTestAccounts`, `loginAs`). En web solo usar la rama **real**.

Otros puntos parciales (funcionales pero pendientes de integración real):

- `services/zoomService.ts` — hoy retorna enlaces estáticos, sin OAuth.
- `services/whatsappService.ts` / `soporteService.ts` — construyen URLs `wa.me`, sin API oficial.
- `services/pushService.ts` — funciona con Expo Push; para web usar Web Push (`navigator.serviceWorker` + `PushManager`) o dejar solo `in_app`.
- Botones "Nuevo profesor" en dashboards que aún redirigen a `users` sin abrir modal directo.
- Componentes con métricas hardcoded en `AdminDashboard` (weeklyActivity, monthlyProgress, upcomingEvents) — reemplazar por queries reales antes de portar.

**Regla para web:** cero mocks. Toda vista debe leer de Supabase con la sesión real; si no hay datos, mostrar estado vacío explícito.

---

## Notas finales

- **Auth provider**: Supabase Auth vía `@supabase/supabase-js`. Mismo cliente en móvil y web.
- **OTP**: 4 dígitos, expira en 3600 s. Web debe replicar exactamente.
- **Registro público**: solo crea `role='student'`. Cualquier otro rol se asigna server-side.
- **Impersonation**: no persistir, no serializar al servidor. Solo estado React en el cliente admin.
- **Realtime**: no soportado por el backend; usar polling (30 s) para dashboards en vivo.
- **Nunca** exponer `SUPABASE_SERVICE_ROLE_KEY` en bundle web; solo en Edge Functions.

Fin del contrato.
