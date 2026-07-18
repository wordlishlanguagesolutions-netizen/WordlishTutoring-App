# Wordlish Tutoring · Backend real (Fase 1 · Diseño)

> **Objetivo de esta fase:** dejar completamente diseñado el modelo de datos, sus estados, relaciones, índices y políticas RLS para OnSpace Cloud (compatible Supabase). **No se toca código de aplicación, `mockDb`, `authService` ni rutas.**

Documento vivo. Cualquier cambio de esquema debe reflejarse aquí antes de tocar la base real.

---

## 1. Convenciones globales

- **Base de datos:** PostgreSQL gestionado por OnSpace Cloud (API 100% Supabase).
- **Naming:** `snake_case` en tablas y columnas; nombres en singular para dimensiones (`user_profile`) y plural para hechos (`bookings`, `payments`).
- **Identificadores:** `uuid` v4 generados con `gen_random_uuid()` (extensión `pgcrypto`).
- **Timestamps:** todos `timestamptz`, siempre en UTC.
- **Enums:** se crean como tipos PostgreSQL `CREATE TYPE ... AS ENUM (...)`. Mapean 1:1 a `types/enums.ts`.
- **Soft delete:** no se usa. Se usa `active boolean` cuando aplica; los borrados destructivos van al `audit_logs`.
- **Denormalización:** solo campos snapshot documentados (nombres de usuario en bookings/reports, tarifa en payrolls). Nunca se sincronizan automáticamente.
- **Autoría:** todas las tablas tienen `created_at`, `updated_at`, `created_by`, `updated_by`. `*_by` referencian `auth.users(id)`. Se llenan por trigger + política.

### 1.1 Trigger genérico de auditoría de fila

```sql
CREATE OR REPLACE FUNCTION public.set_row_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := now();
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    NEW.updated_by := COALESCE(NEW.updated_by, auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
    NEW.updated_by := auth.uid();
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
  END IF;
  RETURN NEW;
END $$;
```

Se aplica a **todas** las tablas de negocio con:

```sql
CREATE TRIGGER trg_audit_<tabla>
BEFORE INSERT OR UPDATE ON public.<tabla>
FOR EACH ROW EXECUTE FUNCTION public.set_row_audit_fields();
```

### 1.2 Helper de rol vigente

Para RLS necesitamos saber el rol del solicitante sin joinear en cada policy. Se crea una función `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM user_profiles WHERE id = auth.uid();
$$;
```

Y funciones auxiliares booleanas:

```sql
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT public.current_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT public.current_user_role() IN ('admin', 'supervisor');
$$;

CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT public.current_user_role() IN ('admin', 'supervisor', 'teacher');
$$;
```

---

## 2. Enumeraciones (tipos)

Cada enum PostgreSQL mapea al enum TypeScript equivalente en `types/enums.ts`.

| Tipo SQL | Valores |
|---|---|
| `account_type` | `student_guardian`, `staff` |
| `specific_role` | `admin`, `supervisor`, `teacher`, `student`, `guardian` |
| `booking_status` | `pending_payment`, `confirmed`, `cancelled`, `rescheduled`, `completed`, `student_absent`, `technical_issue` |
| `class_record_status` | `scheduled`, `in_progress`, `ok`, `no_screenshot`, `teacher_late`, `student_late`, `no_camera`, `technical`, `completed`, `cancelled`, `student_absent` |
| `payment_status` | `paid`, `pending`, `failed`, `refunded` |
| `payment_method` | `card`, `yappy`, `cuanto`, `transfer`, `other` |
| `notification_type` | 16 valores (`class_reminder_24h` … `system`) |
| `notification_channel` | `in_app`, `push`, `whatsapp`, `email` |
| `notification_delivery_status` | `queued`, `delivered`, `read`, `failed` |
| `alert_severity` | `info`, `warning`, `danger`, `critical` |
| `material_kind` | `PDF`, `MP3`, `MP4`, `DOC`, `IMG`, `LINK` |
| `class_kind` | `personal`, `group` |
| `payroll_status` | `draft`, `reviewed`, `paid` |
| `payroll_adjustment_kind` | `bonus`, `deduction`, `correction` |
| `class_event_type` | 19 valores (ver `types/enums.ts`) |
| `report_status` | `draft`, `sent`, `read`, `confirmed` |
| `material_source` | `student`, `teacher` |
| `teacher_tier` | `essentials`, `special` |
| `package_status` | `active`, `expired`, `depleted`, `cancelled` |

**Estados válidos** (transiciones aplicadas por triggers o edge functions):

- **Booking:** `pending_payment → confirmed → completed | cancelled | rescheduled | student_absent | technical_issue`.
- **ClassRecord:** `scheduled → in_progress → completed | cancelled | student_absent`. Los sub-estados operativos (`no_screenshot`, `teacher_late`, `no_camera`, `technical`) se aplican mientras `in_progress`.
- **Payment:** `pending → paid | failed`; `paid → refunded`.
- **HourPackage:** `active → depleted` (remaining_hours=0) | `expired` (fecha pasada) | `cancelled` (admin).
- **Payroll:** `draft → reviewed → paid` (terminal, inmutable).
- **Report:** `draft → sent → read → confirmed`.

---

## 3. Tablas y relaciones

### 3.1 `user_profiles` — perfil canónico

Vínculo 1:1 con `auth.users`. Toda otra tabla usa esta referencia para RLS.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | igual a `auth.users.id` |
| `full_name` | `text` NOT NULL | |
| `first_name` | `text` NOT NULL | |
| `email` | `text` UNIQUE NOT NULL | |
| `phone` | `text` | |
| `avatar_url` | `text` | |
| `role` | `specific_role` NOT NULL | |
| `account_type` | `account_type` NOT NULL | |
| `active` | `boolean` DEFAULT true | |
| Auditoría | `created_at`, `updated_at`, `created_by`, `updated_by` | |

**Trigger onboarding:** `handle_new_user` en `auth.users` inserta fila mínima con `role='student'` por defecto. Admin la promueve.

**RLS:**
- SELECT: `is_admin()` OR `is_supervisor()` OR `id = auth.uid()` OR (guardian ve estudiantes vinculados) OR (staff ve alumnos con clase asignada).
- INSERT: `is_admin()` únicamente (además del trigger de sistema).
- UPDATE: `id = auth.uid()` (solo su fila, sin cambiar `role`/`account_type`) OR `is_admin()`.
- DELETE: prohibido (solo `active=false`).

---

### 3.2 `students`

Puede existir sin `user_id` (menores sin login propio).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `user_profiles(id)` NULLABLE | |
| `guardian_id` | `uuid` FK → `guardians(id)` NULLABLE | |
| `full_name`, `first_name` | `text` NOT NULL | |
| `avatar_url` | `text` | |
| `age` | `int` CHECK (age > 0) | |
| `grade` | `text` NOT NULL | |
| `school` | `text` | |
| `phone` | `text` | |
| `plan_tier` | `teacher_tier` DEFAULT `'essentials'` | Define visibilidad de profesores. |
| `active` | `boolean` DEFAULT true | |
| Auditoría | ... | |

**Índices:** `guardian_id`, `user_id`, `active`.

**RLS:** admin/supervisor todo; guardian ve solo sus estudiantes (`guardian_id = guardian_of(auth.uid())`); teacher ve estudiantes de clases asignadas; el propio estudiante ve su fila.

---

### 3.3 `guardians`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `user_profiles(id)` UNIQUE NOT NULL | |
| `full_name`, `first_name`, `email`, `phone` | `text` NOT NULL | |
| `avatar_url` | `text` | |
| Auditoría | ... | |

**RLS:** admin/supervisor todo; guardian ve su fila; teacher ve guardians de estudiantes en clases asignadas.

---

### 3.4 `student_guardians` — relación N:M

Un estudiante puede tener varios acudientes (padre, madre) y un acudiente varios estudiantes.

| Columna | Tipo | Notas |
|---|---|---|
| `student_id` | `uuid` FK → `students(id)` | PK compuesta |
| `guardian_id` | `uuid` FK → `guardians(id)` | PK compuesta |
| `relationship` | `text` | 'mother', 'father', 'other' |
| `primary` | `boolean` DEFAULT false | Uno primario por estudiante (índice único parcial). |
| Auditoría | ... | |

**Índice único parcial:** `UNIQUE (student_id) WHERE primary = true`.

---

### 3.5 `staff` — administradores, supervisores, profesores

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `user_profiles(id)` UNIQUE NOT NULL | |
| `full_name`, `first_name` | `text` NOT NULL | |
| `email`, `phone` | `text` | |
| `avatar_url` | `text` | |
| `role` | `specific_role` NOT NULL CHECK (role IN ('admin','supervisor','teacher')) | |
| `active` | `boolean` DEFAULT true | |
| Auditoría | ... | |

Redundancia intencional con `user_profiles`: aísla los datos operativos de staff sin exponer PII de student/guardian.

**RLS:** admin todo; supervisor SELECT; el propio staff SELECT su fila; teacher SELECT solo su fila.

---

### 3.6 `teachers`

Extiende `staff` con datos didácticos.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `staff_id` | `uuid` FK → `staff(id)` UNIQUE NOT NULL | |
| `user_id` | `uuid` FK → `user_profiles(id)` UNIQUE NOT NULL | |
| `tier` | `teacher_tier` NOT NULL DEFAULT `'essentials'` | |
| `subjects` | `text[]` NOT NULL DEFAULT '{}' | |
| `grades` | `text[]` NOT NULL DEFAULT '{}' | |
| `bio` | `text` | |
| `hourly_rate` | `numeric(10,2)` DEFAULT 0 | Snapshot histórico en `teacher_rates`. |
| `stats` | `jsonb` DEFAULT '{}' | Vista materializada opcional. |
| Auditoría | ... | |

**Índices:** GIN sobre `subjects`, GIN sobre `grades`, `tier`.

---

### 3.7 `subjects`

Catálogo maestro (evita cadenas libres).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `code` | `text` UNIQUE NOT NULL | 'math', 'english'... |
| `name` | `text` NOT NULL | |
| `active` | `boolean` DEFAULT true | |
| Auditoría | ... | |

**RLS:** SELECT público (usuarios autenticados). Escritura admin.

---

### 3.8 `teacher_subjects` (N:M) — opcional

Permite listar profesores por materia sin depender de `teachers.subjects[]`.

| `teacher_id` | `uuid` FK → `teachers(id)` |
| `subject_id` | `uuid` FK → `subjects(id)` |

PK compuesta. Índices ambos lados.

---

### 3.9 `teacher_availability`

Publicación semanal.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `teacher_id` | `uuid` FK → `teachers(id)` NOT NULL | |
| `week_start` | `date` NOT NULL | lunes ISO |
| `weekday` | `int` NOT NULL CHECK (weekday BETWEEN 0 AND 6) | |
| `slots` | `text[]` NOT NULL DEFAULT '{}' | `'HH:MM'` |
| `published_at` | `timestamptz` | null = borrador |
| Auditoría | ... | |

**Índice único:** `(teacher_id, week_start, weekday)`.

**RLS:** teacher gestiona la suya; admin/supervisor todo; student/guardian SELECT solo `published_at IS NOT NULL`.

---

### 3.10 `hour_packages`

Saldo de horas por estudiante.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `student_id` | `uuid` FK → `students(id)` NOT NULL | |
| `guardian_id` | `uuid` FK → `guardians(id)` NULLABLE | |
| `name` | `text` NOT NULL | 'Plan 8 horas' |
| `tier` | `teacher_tier` NOT NULL | Determina profesores accesibles. |
| `total_hours` | `numeric(6,2)` NOT NULL CHECK (>=0) | |
| `remaining_hours` | `numeric(6,2)` NOT NULL CHECK (>=0) | |
| `purchased_at` | `timestamptz` NOT NULL | |
| `expires_at` | `timestamptz` NOT NULL | |
| `payment_id` | `uuid` FK → `payments(id)` NULLABLE | |
| `status` | `package_status` NOT NULL DEFAULT `'active'` | |
| Auditoría | ... | |

**Índices:** `student_id`, `status`, `(student_id, status) WHERE status='active'`.

**Estados válidos** ya listados en §2. Transiciones se resuelven por trigger sobre `bookings.completed` y por `cron` diario para `expired`.

**RLS:** admin/supervisor todo; student ve las suyas; guardian ve las de sus estudiantes; teacher no ve packages (no le corresponden).

---

### 3.11 `bookings`

Reserva. Estructura fiel a `types/models.ts:Booking`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `student_id` | `uuid` FK → `students(id)` NOT NULL | |
| `guardian_id` | `uuid` FK → `guardians(id)` NULLABLE | |
| `teacher_id` | `uuid` FK → `teachers(id)` NOT NULL | |
| `substitute_id` | `uuid` FK → `teachers(id)` NULLABLE | |
| `subject_id` | `uuid` FK → `subjects(id)` NOT NULL | |
| `package_id` | `uuid` FK → `hour_packages(id)` NULLABLE | |
| `class_record_id` | `uuid` FK → `class_records(id)` NULLABLE | Creado en el mismo commit. |
| `kind` | `class_kind` NOT NULL DEFAULT `'personal'` | |
| `scheduled_date` | `date` NOT NULL | |
| `scheduled_time` | `time` NOT NULL | |
| `starts_at` | `timestamptz` GENERATED ALWAYS AS ((scheduled_date + scheduled_time)::timestamptz) STORED | |
| `duration_min` | `int` NOT NULL DEFAULT 60 | |
| `status` | `booking_status` NOT NULL DEFAULT `'pending_payment'` | |
| `zoom_url` | `text` | |
| `hour_consumed` | `boolean` NOT NULL DEFAULT false | |
| Snapshot denormalizado (opcional, para pantallas) | `student_name`, `teacher_name`, `student_avatar`, `teacher_avatar` | Se actualizan por trigger cuando cambia el perfil origen. |
| Auditoría | ... | |

**Índices:**
- `student_id`, `teacher_id`, `guardian_id`.
- `starts_at` (para dashboards y recordatorios).
- `(status, starts_at)`.
- Único parcial anti-doble-reserva: `UNIQUE (teacher_id, starts_at) WHERE status IN ('pending_payment','confirmed')`.

**RLS:**
- SELECT: admin/supervisor todo; teacher (id ∈ suyas); student (id ∈ suyas); guardian (id ∈ estudiantes vinculados).
- INSERT: student, guardian (por sí mismo o su estudiante), admin. Prohibido para teacher/supervisor.
- UPDATE: admin/supervisor todo; teacher solo campos operativos (`status → 'completed'`, snapshot de tiempos) vía RPC; student/guardian solo cancelación permitida por política.
- DELETE: prohibido (se registra cancelación).

---

### 3.12 `class_records`

Expediente único de clase (1:1 con booking). Se crea automáticamente al confirmar la reserva.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `booking_id` | `uuid` FK → `bookings(id)` UNIQUE NOT NULL | |
| `student_id`, `teacher_id`, `guardian_id`, `subject_id` | FKs | denormalizados para RLS. |
| `kind` | `class_kind` NOT NULL | |
| `scheduled_date`, `scheduled_time`, `starts_at` | igual que booking | |
| `status` | `class_record_status` NOT NULL DEFAULT `'scheduled'` | |
| `zoom_url`, `zoom_meeting_id` | `text` | |
| `started_at`, `ended_at`, `student_joined_at`, `teacher_joined_at` | `timestamptz` NULLABLE | |
| `screenshot_id` | `uuid` FK → `screenshots(id)` NULLABLE | |
| `report_id` | `uuid` FK → `reports(id)` NULLABLE | |
| `student_topic` | `text` | pre-clase |
| `student_material_submitted_at` | `timestamptz` | |
| `observations` | `text` | teacher |
| `supervisor_notes` | `text` | |
| `substitute_assigned` | `boolean` DEFAULT false | |
| Auditoría | ... | |

**Índices:**
- `booking_id`, `student_id`, `teacher_id`.
- `starts_at`, `(status, starts_at)`.
- Parcial: `(teacher_id) WHERE status = 'in_progress'`.

**RLS:** hereda las mismas reglas que `bookings`, con acceso adicional a supervisor sobre TODAS las clases del día.

---

### 3.13 `class_events` — timeline inmutable

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `class_record_id` | `uuid` FK → `class_records(id)` NOT NULL | |
| `type` | `class_event_type` NOT NULL | |
| `at` | `timestamptz` NOT NULL DEFAULT now() | |
| `actor_user_id` | `uuid` FK → `user_profiles(id)` NOT NULL | |
| `actor_role` | `specific_role` NOT NULL | |
| `message` | `text` | |
| `meta` | `jsonb` DEFAULT '{}' | |
| Auditoría | `created_at`, `created_by` (no `updated_*`, inmutable) | |

**Índices:** `class_record_id`, `(class_record_id, at DESC)`, `type`.

**RLS:** SELECT igual que `class_records`. INSERT: cualquier actor con acceso al class_record. UPDATE/DELETE: prohibido.

---

### 3.14 `screenshots`

Regla: pertenecen a un class_record.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `class_record_id` | `uuid` FK → `class_records(id)` NOT NULL | |
| `booking_id` | `uuid` FK → `bookings(id)` NOT NULL | |
| `teacher_id`, `student_id` | FKs | |
| `storage_path` | `text` NOT NULL | bucket `class-screenshots` |
| `captured_at` | `timestamptz` NOT NULL DEFAULT now() | |
| `verified` | `boolean` DEFAULT false | |
| Auditoría | ... | |

**Índices:** `class_record_id` UNIQUE (una por clase), `teacher_id`, `captured_at`.

**RLS:** teacher (autor) INSERT; supervisor/admin verifica; student/guardian solo SELECT metadatos.

---

### 3.15 `reports`

Regla: pertenecen a un class_record.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `class_record_id` | `uuid` FK → `class_records(id)` UNIQUE NOT NULL | |
| `booking_id`, `teacher_id`, `student_id` | FKs | |
| `topic`, `progress`, `objectives`, `strengths`, `improvements` | `text` NOT NULL | |
| `homework`, `guardian_notes` | `text` | |
| `rating` | `int` CHECK (rating BETWEEN 1 AND 5) | |
| `attachments` | `text[]` DEFAULT '{}' | paths de storage |
| `status` | `report_status` NOT NULL DEFAULT `'draft'` | |
| `submitted_at`, `read_at`, `confirmed_at` | `timestamptz` | |
| Auditoría | ... | |

**Índices:** `class_record_id` UNIQUE, `teacher_id`, `student_id`, `status`.

**RLS:** teacher CRUD sus reportes (mientras `status != 'confirmed'`); student/guardian SELECT + marca `read`/`confirmed`; admin/supervisor todo.

---

### 3.16 `materials`

Regla: pertenecen a un class_record.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `class_record_id` | `uuid` FK → `class_records(id)` NOT NULL | |
| `booking_id`, `teacher_id`, `student_id` | FKs | |
| `title` | `text` NOT NULL | |
| `description` | `text` | |
| `kind` | `material_kind` NOT NULL | |
| `storage_path` | `text` NOT NULL | bucket `class-materials` |
| `size_label` | `text` | '1.2 MB' |
| `source` | `material_source` NOT NULL | student = pre-clase; teacher = post-clase |
| Auditoría | ... | |

**Índices:** `class_record_id`, `(class_record_id, source)`, `teacher_id`.

**RLS:** author INSERT (student o teacher del class_record); todos los participantes del class_record SELECT.

---

### 3.17 `payments`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `student_id`, `guardian_id`, `package_id`, `booking_id` | FKs NULLABLE | |
| `concept` | `text` NOT NULL | |
| `amount` | `numeric(10,2)` NOT NULL CHECK (>=0) | |
| `currency` | `text` NOT NULL DEFAULT `'USD'` | |
| `status` | `payment_status` NOT NULL DEFAULT `'pending'` | |
| `method` | `payment_method` NOT NULL | |
| `paid_at` | `timestamptz` | |
| `external_reference` | `text` | ID Stripe/Yappy |
| `receipt_url` | `text` | |
| Auditoría | ... | |

**Índices:** `student_id`, `guardian_id`, `status`, `(status, created_at DESC)`, `external_reference` UNIQUE parcial cuando no nulo.

**RLS:** admin todo; supervisor SELECT; student/guardian ve solo suyos; teacher no ve pagos.

---

### 3.18 `promotions`

Catálogo administrativo para descuentos y planes promocionales.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `code` | `text` UNIQUE NOT NULL | |
| `name` | `text` NOT NULL | |
| `description` | `text` | |
| `kind` | `text` NOT NULL CHECK (kind IN ('percent','flat','plan')) | |
| `value` | `numeric(10,2)` | |
| `starts_at`, `ends_at` | `timestamptz` | |
| `max_uses`, `used_count` | `int` DEFAULT 0 | |
| `active` | `boolean` DEFAULT true | |
| Auditoría | ... | |

**RLS:** admin CRUD; resto SELECT solo `active AND now() BETWEEN starts_at AND ends_at`.

---

### 3.19 `attendance`

Registro atómico de asistencia por participante. Un class_record puede tener varias filas (grupal).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `class_record_id` | `uuid` FK NOT NULL | |
| `student_id` | `uuid` FK NOT NULL | |
| `status` | `text` NOT NULL CHECK (status IN ('attended','late','absent','excused')) | |
| `joined_at`, `left_at` | `timestamptz` | |
| `minutes_late` | `int` | |
| `notes` | `text` | |
| Auditoría | ... | |

**Índices únicos:** `(class_record_id, student_id)`.

**RLS:** admin/supervisor CRUD; teacher del class_record INSERT/UPDATE; student/guardian SELECT propia.

---

### 3.20 `notifications`

Centro por usuario.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → `user_profiles(id)` NOT NULL | |
| `type` | `notification_type` NOT NULL | |
| `title`, `message` | `text` NOT NULL | |
| `channel` | `notification_channel` NOT NULL DEFAULT `'in_app'` | |
| `delivery_status` | `notification_delivery_status` NOT NULL DEFAULT `'queued'` | |
| `read` | `boolean` DEFAULT false | |
| `read_at` | `timestamptz` | |
| `action_route`, `action_label` | `text` | |
| `ref_type` | `text` CHECK (ref_type IN ('booking','class','payment','report','material','payroll')) | |
| `ref_id` | `uuid` | |
| `scheduled_for` | `timestamptz` | |
| `tone`, `icon` | `text` | |
| Auditoría | ... | |

**Índices:** `(user_id, read)`, `(user_id, created_at DESC)`, `scheduled_for` parcial cuando no null.

**RLS:** el propio `user_id`; admin todo. INSERT: sistema (edge functions) o admin.

---

### 3.21 `system_alerts`

Para el supervisor. Independiente de `notifications`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `class_record_id`, `teacher_id`, `student_id` | FKs NULLABLE | |
| `type` | `text` NOT NULL | |
| `detail` | `text` | |
| `severity` | `alert_severity` NOT NULL | |
| `icon` | `text` | |
| `resolved` | `boolean` DEFAULT false | |
| `resolved_at` | `timestamptz` | |
| `resolved_by` | `uuid` FK → `user_profiles(id)` | |
| Auditoría | ... | |

**Índices:** `(resolved, severity, created_at DESC)`.

**RLS:** admin/supervisor CRUD; resto sin acceso.

---

### 3.22 `teacher_rates`

Snapshot histórico de tarifas.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `teacher_id` | `uuid` FK NOT NULL | |
| `personal_hour_rate`, `group_hour_rate`, `absence_pay_rate` | `numeric(10,2)` | |
| `currency` | `text` DEFAULT `'USD'` | |
| `effective_from` | `date` NOT NULL | |
| `effective_to` | `date` | |
| `active` | `boolean` DEFAULT true | |
| Auditoría | ... | |

**Índice único parcial:** `(teacher_id) WHERE active = true`.

**RLS:** admin CRUD; el teacher SELECT su fila.

---

### 3.23 `teacher_payrolls`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `teacher_id` | `uuid` FK NOT NULL | |
| `teacher_name_snapshot` | `text` NOT NULL | |
| `month` | `text` NOT NULL CHECK (month ~ '^\d{4}-\d{2}$') | |
| `period_start`, `period_end` | `date` NOT NULL | |
| `personal_classes_count`, `group_classes_count` | `int` DEFAULT 0 | |
| `payable_hours`, `payable_absences`, `cancellations` | `numeric(6,2)` DEFAULT 0 | |
| `rate_snapshot` | `jsonb` NOT NULL | |
| `computed_total` | `numeric(12,2)` NOT NULL DEFAULT 0 | |
| `final_total` | `numeric(12,2)` NOT NULL DEFAULT 0 | |
| `status` | `payroll_status` NOT NULL DEFAULT `'draft'` | |
| `reviewed_at`, `paid_at` | `timestamptz` | |
| `reviewed_by`, `paid_by` | `uuid` FK → `user_profiles(id)` | |
| `payment_receipt_url`, `payment_reference`, `notes` | `text` | |
| Auditoría | ... | |

**Índice único:** `(teacher_id, month)`.

**Regla dura:** `status = 'paid'` bloquea `UPDATE` (trigger `BEFORE UPDATE` rechaza).

**RLS:** admin CRUD; el teacher SELECT los suyos (estados `reviewed` y `paid`).

---

### 3.24 `payroll_adjustments`

Extraído del jsonb para trazabilidad y auditoría.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `payroll_id` | `uuid` FK NOT NULL | |
| `kind` | `payroll_adjustment_kind` NOT NULL | |
| `reason` | `text` NOT NULL | |
| `amount` | `numeric(12,2)` NOT NULL | positivo o negativo |
| Auditoría | ... | |

**Índice:** `payroll_id`.

---

### 3.25 `push_tokens`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK NOT NULL | |
| `platform` | `text` CHECK (platform IN ('ios','android','web')) NOT NULL | |
| `token` | `text` NOT NULL | |
| `last_seen_at` | `timestamptz` DEFAULT now() | |
| Auditoría | ... | |

**Índice único:** `(user_id, platform, token)`.

**RLS:** propio user_id CRUD; admin SELECT.

---

### 3.26 `policy_acknowledgements`

Registro por usuario de las políticas ya reconocidas.

| Columna | Tipo | Notas |
|---|---|---|
| `user_id` | `uuid` FK NOT NULL | |
| `policy_key` | `text` NOT NULL | `'booking'`, `'material'`, `'payments'`, `'group'`... |
| `acknowledged_at` | `timestamptz` DEFAULT now() | |
| PK compuesta | `(user_id, policy_key)` | |
| Auditoría | ... | |

**RLS:** propio user_id CRUD; admin SELECT.

---

### 3.27 `audit_logs`

Bitácora global. Se llena por triggers en tablas críticas y por edge functions.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `at` | `timestamptz` NOT NULL DEFAULT now() | |
| `actor_user_id` | `uuid` FK → `user_profiles(id)` | null si sistema |
| `actor_role` | `specific_role` | snapshot |
| `action` | `text` NOT NULL | 'insert','update','delete','login','logout','custom' |
| `entity` | `text` NOT NULL | nombre de tabla |
| `entity_id` | `uuid` NOT NULL | |
| `changes` | `jsonb` | `{ before: {...}, after: {...} }` |
| `ip` | `inet` | |
| `user_agent` | `text` | |

**Índices:**
- `(entity, entity_id, at DESC)`.
- `(actor_user_id, at DESC)`.
- `at DESC`.
- BRIN sobre `at` (histórico creciente).

**RLS:** admin SELECT; supervisor SELECT limitado a acciones no financieras; el resto sin acceso. INSERT solo vía trigger `SECURITY DEFINER`.

**Trigger genérico:**

```sql
CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role specific_role;
BEGIN
  SELECT role INTO v_role FROM user_profiles WHERE id = auth.uid();
  INSERT INTO audit_logs(actor_user_id, actor_role, action, entity, entity_id, changes)
  VALUES (
    auth.uid(),
    v_role,
    lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE((NEW).id, (OLD).id),
    jsonb_build_object(
      'before', CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
      'after',  CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END
    )
  );
  RETURN COALESCE(NEW, OLD);
END $$;
```

Se enlaza a: `bookings`, `class_records`, `reports`, `payments`, `hour_packages`, `teacher_payrolls`, `teachers`, `students`, `guardians`, `staff`, `promotions`, `teacher_rates`.

---

## 4. Diagrama de relaciones (resumen)

```
auth.users
   └─ user_profiles (1:1)
         ├─ students (1:N por user_id, opcional)
         ├─ guardians (1:1)
         ├─ staff (1:1)
         │    └─ teachers (1:1)
         │         ├─ teacher_availability (N)
         │         ├─ teacher_rates (N)
         │         ├─ teacher_subjects (N:M)
         │         └─ teacher_payrolls (N)
         └─ notifications, push_tokens, policy_acknowledgements

students ─┬─ student_guardians ─── guardians
          ├─ hour_packages
          ├─ bookings ── class_records ─┬─ class_events (N)
          │                              ├─ screenshots (0..1)
          │                              ├─ reports (0..1)
          │                              ├─ materials (N)
          │                              └─ attendance (N)
          └─ payments

promotions        (independiente, referenciable desde payments/hour_packages vía external_reference)
system_alerts     (independiente, referencia opcional a class_records/teachers)
audit_logs        (transversal, referencia entity_id polimórfico)
```

---

## 5. Índices adicionales por consulta frecuente

| Consulta | Índice |
|---|---|
| Próxima clase de un estudiante | `bookings(student_id, starts_at)` |
| Agenda del profesor | `bookings(teacher_id, starts_at)` |
| Dashboard admin: clases del día | `class_records(scheduled_date, status)` |
| Supervisor: clases en curso | `class_records(status) WHERE status='in_progress'` (parcial) |
| Screenshots vencidos | `class_records(screenshot_id, starts_at) WHERE screenshot_id IS NULL AND status IN ('scheduled','in_progress')` |
| Reportes pendientes | `reports(teacher_id, status) WHERE status='draft'` |
| Notificaciones no leídas | `notifications(user_id, read) WHERE read=false` |
| Nómina por mes | `teacher_payrolls(month, status)` |
| Búsqueda de usuarios | `user_profiles USING gin (to_tsvector('simple', full_name || ' ' || email))` |
| Auditoría por entidad | `audit_logs(entity, entity_id, at DESC)` |

---

## 6. RLS resumida por rol

| Rol | user_profiles | students / guardians | bookings | class_records | reports | payments | payrolls | audit_logs |
|---|---|---|---|---|---|---|---|---|
| **admin** | ALL | ALL | ALL | ALL | ALL | ALL | ALL | SELECT |
| **supervisor** | SELECT | SELECT | SELECT | ALL | SELECT | SELECT | SELECT | SELECT (limitada) |
| **teacher** | SELF | SELECT (asignados) | SELECT/UPDATE (suyas) | SELECT/UPDATE (suyas) | CRUD (suyos, no confirmed) | — | SELECT (suyas) | — |
| **student** | SELF | SELF | CRUD limitado (suyas) | SELECT (suyas) | SELECT + read/confirm | SELECT (suyos) | — | — |
| **guardian** | SELF | SELECT (vinculados) | CRUD por estudiante | SELECT | SELECT + read/confirm | SELECT (suyos) | — | — |

Detalle exhaustivo por tabla en §3.

---

## 7. Buckets de Storage (previstos)

| Bucket | Contenido | ACL |
|---|---|---|
| `avatars` | fotos de perfil | público SELECT, escritura autenticada solo sobre carpeta `auth.uid()` |
| `class-screenshots` | screenshots subidos por teachers | privado; SELECT por participantes del class_record vía signed URL |
| `class-materials` | material pre/post-clase | privado; SELECT por participantes |
| `payroll-receipts` | comprobantes de pago a profesor | privado; admin + teacher dueño |
| `payment-receipts` | comprobantes de pago del cliente | privado; admin + student/guardian dueño |

---

## 8. Datos que continuarán simulados tras Fase 1

En Fase 1 **solo se diseña la base**, no se migra código. Todo lo siguiente sigue en `services/mockDb.ts` y `services/mockData.ts`:

- Usuarios de prueba y contraseña maestra (`services/authService.ts`).
- Reservas semilla del estudiante y profesor.
- Clase activa del profesor y clases del día.
- Reportes pendientes y materiales semilla.
- Paquetes/planes activos.
- Historial de pagos.
- Indicadores de crecimiento del profesor (Special tier).
- Notificaciones internas.
- Datos del dashboard admin (`services/dashboardMockData.ts`).
- Push tokens (`services/pushService.ts`, memoria).
- Acknowledgements de políticas (`services/policiesAck.ts`).

La migración a las tablas descritas ocurrirá en las **Fases 2–5** una tras otra por dominio, cambiando el cuerpo de cada repositorio sin tocar hooks, contextos ni componentes.

---

## 9. Archivos modificados en esta fase

- `docs/BACKEND_SCHEMA.md` **(nuevo)** — este documento.

**No se tocaron:**
- `services/*` (incluye `authService`, `mockDb`, `mockData`).
- `repositories/*`.
- `contexts/*`, `hooks/*`, `components/*`, `app/*`.
- `.env`, `.env.example`, `package.json`, `babel.config.js`, `metro.config.js`.
- Ninguna ruta ni layout de navegación.

Compatibilidad Web / iOS / Android intacta.

---

## 10. Tablas creadas (planificadas) — checklist

- [x] `user_profiles`
- [x] `students`
- [x] `guardians`
- [x] `student_guardians`
- [x] `staff`
- [x] `teachers`
- [x] `subjects`
- [x] `teacher_subjects`
- [x] `teacher_availability`
- [x] `hour_packages`
- [x] `bookings`
- [x] `class_records`
- [x] `class_events`
- [x] `screenshots`
- [x] `reports`
- [x] `materials`
- [x] `attendance`
- [x] `payments`
- [x] `promotions`
- [x] `notifications`
- [x] `system_alerts`
- [x] `teacher_rates`
- [x] `teacher_payrolls`
- [x] `payroll_adjustments`
- [x] `push_tokens`
- [x] `policy_acknowledgements`
- [x] `audit_logs`

**27 tablas. 20 enums. Aproximadamente 45 índices y 27 conjuntos de políticas RLS.**

---

## 11. Riesgos y decisiones pendientes

1. **Consistencia entre `user_profiles.role` y las tablas específicas (`staff.role`, etc.).** Debe garantizarse por trigger que un cambio de rol en `user_profiles` mueva la fila especializada correspondiente. Alternativa: hacer que `role` sea derivado (vista). Decisión pendiente.
2. **Reservas grupales.** Hoy `bookings` asume 1 estudiante. Para grupales necesitamos tabla `group_class_enrollments (class_record_id, student_id, package_id)` o convertir `bookings` en multi-estudiante. Decisión pendiente antes de activar el módulo grupal en backend.
3. **Snapshot vs join.** `bookings.student_name` y afines evitan joins en móvil, pero requieren triggers de actualización cuando cambia el perfil. Alternativa: eliminar snapshots y forzar joins en las vistas. Recomendación: mantener snapshots por rendimiento y actualizarlos con trigger `AFTER UPDATE ON user_profiles`.
4. **Zoom integrado vs enlace estático.** Si se integra Zoom OAuth, se necesita tabla `zoom_meetings` con `host_user_id`, `meeting_id`, `join_url`, `start_url`, `password`, `expires_at`. No incluida en esta fase.
5. **Facturación vs pagos.** `payments` registra transacciones. Si hay que emitir facturas fiscales panameñas (DGI), se requerirá tabla `invoices` y numeración correlativa. No incluida en esta fase.
6. **Multi-tenancy.** El diseño asume una sola institución. Si Wordlish adopta multi-cliente, hará falta columna `tenant_id` en todas las tablas y RLS por tenant. Decidir antes de escalar comercialmente.
7. **Region / latencia.** OnSpace Cloud no permite elegir región. Para clientes fuera de LATAM la latencia podría ser un problema; documentado como riesgo aceptado.
8. **Retención de `audit_logs`.** Sin política de purga, la tabla crecerá indefinidamente. Se recomienda partición mensual por rango de `at` y purga automática a los 24 meses.
9. **Migración de datos mock.** Al pasar a real, los IDs mock (`mock-teacher`, `mock-student`) deberán reemplazarse por UUIDs reales. Requiere script de siembra idempotente.
10. **Backups.** OnSpace Cloud no expone backups programables. Se recomienda export diario `pg_dump` vía edge function a un bucket externo o Google Drive del administrador.

---

## 12. Confirmación de la Fase 1

- **Tablas diseñadas:** 27.
- **Enums diseñados:** 20.
- **Relaciones (FKs) principales documentadas:** > 40.
- **Índices propuestos:** 45+ (incluye únicos parciales, GIN, BRIN).
- **Políticas RLS definidas:** por tabla, con matriz resumida en §6.
- **Campos de auditoría estandarizados:** `created_at`, `updated_at`, `created_by`, `updated_by` + trigger único reutilizable.
- **`audit_logs` diseñado:** con trigger `SECURITY DEFINER` global y política de acceso restringido.
- **Sin cambios en código de aplicación, autenticación, base de datos activa, dependencias, rutas ni configuración técnica.**

Listo para pasar a **Fase 2 — Creación real de tablas y RLS en OnSpace Cloud** cuando el propietario lo apruebe.
