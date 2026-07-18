# Migraciones Wordlish · OnSpace Cloud

Todas las migraciones son idempotentes (usan `create if not exists`, `drop trigger if exists`, `on conflict do nothing`) y pueden re-ejecutarse sin efectos destructivos.

## Orden de ejecución (obligatorio)

1. `001_enums_and_helpers.sql` — Extensiones, enums, trigger de auditoría de fila, ampliación de `user_profiles`, funciones de rol y RLS de `user_profiles`.
2. `002_catalog_and_actors.sql` — `subjects`, `promotions`, `guardians`, `staff`.
3. `003_students_and_teachers.sql` — `students`, `student_guardians`, `teachers`, `teacher_subjects`, `teacher_availability`, `teacher_rates`.
4. `004_payments_packages_bookings_classes.sql` — `payments`, `hour_packages`, `bookings`, `class_records` (FKs diferidas resueltas al final).
5. `005_class_children.sql` — `class_events`, `screenshots`, `reports`, `materials`, `attendance`. Cierra FKs `class_records.screenshot_id` y `class_records.report_id`.
6. `006_notifications_and_meta.sql` — `notifications`, `system_alerts`, `push_tokens`, `policy_acknowledgements`.
7. `007_payrolls.sql` — `teacher_payrolls`, `payroll_adjustments`. Incluye trigger de bloqueo de update cuando `status='paid'`.
8. `008_audit_logs.sql` — Tabla `audit_logs`, función `write_audit_log()` y triggers en tablas críticas.
9. `009_storage.sql` — Buckets `avatars`, `class-screenshots`, `class-materials`, `payroll-receipts`, `payment-receipts` y sus políticas.
10. `010_seeders_dev.sql` — Catálogo mínimo de materias.

## Estado actual

Todas las migraciones ya fueron aplicadas contra OnSpace Cloud durante la Fase 2. Estos archivos quedan versionados como fuente de verdad para futuras recreaciones o migraciones a Supabase nativo.

## Advertencias

- **No se crean usuarios reales.** Cualquier `INSERT` en `user_profiles` fuera del trigger de `auth.users` requerirá rol admin.
- **Los datos siguen viniendo de `mockDb`** en el cliente. Los repositorios todavía no fueron migrados (Fase 3).
- Las RLS asumen que `user_profiles.role` está poblado. Si un usuario nuevo de `auth.users` aún no tiene fila con `role`, ninguna consulta funcionará hasta que la fila exista.
