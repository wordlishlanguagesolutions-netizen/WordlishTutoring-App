# Wordlish · Estado real de la conexión con OnSpace Cloud

**Fecha del reporte**: julio 2026

## 1. Módulos ya conectados a Cloud

| Módulo | Persistencia | Detalle |
|---|---|---|
| Auth (email + password) | ✅ Cloud (dual) | `services/authService.ts` tiene rama real vs mock. **Requiere `EXPO_PUBLIC_AUTH_MODE=real` en `.env`** para activarse. Con mock: 5 correos de prueba. |
| Gastos (Expenses) | ✅ Cloud real | `repositories/expenses.ts` + tabla `public.expenses` (RLS admin/supervisor). El panel Admin › Pagos › Gastos hidrata al montar y persiste crear/editar/eliminar. |

## 2. Tablas creadas o utilizadas en este ciclo

- **Creada**: `public.expenses` (id, name, category, amount, currency, frequency, billing_date, next_billing_date, method, status, notes, timestamps, RLS admin/supervisor). Seed inicial de 16 filas.
- **En uso preexistente**: `user_profiles`, `bookings`, `class_records`, `payments`, `teacher_payrolls`, `teacher_rates` — sólo desde el flujo de Auth. El resto de módulos no las lee/escribe todavía.

## 3. Módulos que aún requieren trabajo (siguen en `mockDb` / `mockData`)

| Módulo | Archivos afectados | Razón |
|---|---|---|
| Reservas | `repositories/bookings.ts`, `contexts/BookingsContext.tsx`, `app/(student|guardian)/book.tsx`, `app/booking/*` | El repo, el context y todas las pantallas leen/escriben `mockDb.bookings`. Migrar exige convertir el context a async y refactorizar todas las mutaciones. |
| Clases (expediente) | `repositories/classes.ts`, `services/classService.ts`, `app/class/[id].tsx` | Ídem — `classService` orquesta 15+ transiciones sobre el store en memoria. |
| Reportes | `repositories/reports.ts`, `app/reports/[id].tsx`, `app/(student|guardian)/progress.tsx` | Reads de `mockData.reportsHistory`. |
| Materiales / Screenshots | `repositories/{materials,screenshots}.ts` | Además necesitan integración con `expo-image-picker` y buckets de Storage. |
| Notificaciones | `repositories/notifications.ts`, `contexts/NotificationsContext.tsx`, `contexts/TeacherNotificationsContext.tsx` | Contextos generan notifs en memoria; falta persistir en `public.notifications`. |
| Paquetes / Pagos de estudiantes | `repositories/{packages,payments}.ts`, `app/(admin)/packages.tsx`, `app/(student|guardian)/payments.tsx` | Aún declaran catálogo hardcoded. |
| Disponibilidad de profes | `repositories/availability.ts` | Semilla en `mockDb.availability`. |
| Nómina | `repositories/payrolls.ts`, `services/financeService.ts` (payroll section) | La tabla `teacher_payrolls` existe en Cloud pero el service usa filas en memoria. |
| Ingresos (Revenue) | `services/financeService.ts` (revenue section) | Debe leer de `payments` en Cloud. |
| Tarifas anuales de profesor | `services/teacherRatesConfig.ts`, `app/(admin)/settings.tsx` | Requiere una tabla `tier_yearly_rates` que aún no existe (la actual `teacher_rates` es por-profesor). |
| Usuarios / detalle admin | `app/(admin)/users.tsx` | Actualmente arma perfiles con datos de `mockData`, no consulta `user_profiles`/`teachers`/`students`/`guardians`. |
| Dashboard admin | `services/dashboardMockData.ts`, `app/(admin)/index.tsx` | Todo el dashboard (nuevas reservas, clases en vivo, alertas) es mock estático. |
| Supervisor | `app/(supervisor)/*` | Alertas e historial de mock. |
| `hooks/usePermissions.tsx` | | Resuelve el rol contra `mockDb.users`; con auth real ya viene del perfil. |

## 4. Qué información se guarda realmente en la nube

- **Sesiones y credenciales** de usuarios registrados (cuando `AUTH_MODE=real`).
- **Perfiles** en `user_profiles` (trigger `handle_new_user` los crea al signup).
- **Gastos operativos** (`expenses`) — creados/editados/eliminados desde el panel Admin › Pagos.

Todo lo demás vive en memoria del cliente y **se pierde al recargar**.

## 5. Qué falta para producción

### Bloqueantes técnicos
1. **Activar auth real**: definir `EXPO_PUBLIC_AUTH_MODE=real` en `.env` y crear las cuentas iniciales (admin, supervisor). El `.env` no es editable desde esta sesión; el usuario debe agregarlo manualmente.
2. **Migrar repositorios**: reescribir los 11 repos restantes con firma async replicando el patrón de `repositories/expenses.ts`.
3. **Convertir contexts a async**: `BookingsContext`, `NotificationsContext`, etc. deben cargar al montar y persistir mutaciones al backend.
4. **Reemplazar imports de `mockData`** en 25+ pantallas por hooks que consuman los nuevos repositorios.
5. **Uploads reales**: `expo-document-picker` + `expo-image-picker` para materiales, screenshots, comprobantes de pago y recibos de nómina, subiendo a los buckets ya creados.
6. **Edge Functions**: recordatorios, cierre automático de clase, cálculo de nómina, dispatcher de notificaciones push.
7. **Zoom OAuth**: hoy los `zoom_url` son estáticos.

### Producto
- Onboarding post-registro (completar perfil, seleccionar rol).
- Módulo Promociones (tabla existe, UI dice "en construcción").
- Aprobación supervisor de pagos y nómina.
- Exportación CSV/PDF real desde Pagos.
- Accesibilidad completa.
- Tests unitarios y e2e.

## 6. Limitación técnica de esta sesión

No puedo modificar `.env` (archivo bloqueado). Para activar el modo real de autenticación:

```
# .env (editar manualmente)
EXPO_PUBLIC_AUTH_MODE=real
```

Y crear el primer admin ejecutando en OnSpace Cloud Dashboard › Users:
- Email: `admin@wordlish.com`
- Password: (el que definas)
- Después ejecutar en Data › SQL:
  ```sql
  update public.user_profiles
     set role = 'admin', account_type = 'staff'
   where email = 'admin@wordlish.com';
  ```

## 7. Ruta recomendada (siguientes fases)

| Fase | Alcance | Estimación |
|---|---|---|
| 3B | Repos + context de **Bookings** y **ClassRecords** a Cloud. Async + optimistic UI. | Alto |
| 3C | **Reports** + **Materials** + **Screenshots** con Storage buckets y uploads reales. | Alto |
| 3D | **Payments** + **HourPackages** + **Payroll** + `financeService` (revenue/payroll) a Cloud. | Medio |
| 3E | **Notifications** persistidas + Edge Functions (reminders, autoclose, payroll compute, push dispatcher). | Alto |
| 4 | Zoom OAuth, gateway de pago real, tests, accesibilidad. | Alto |

Cada fase debe convertir sus repos a async y refactorizar las pantallas consumidoras. **No es viable en una sola respuesta**: son 12 repos, 5 contexts y 25+ pantallas con lógica de negocio compleja. Recomiendo abordar una fase por vez, empezando por **3B (Bookings)** porque es el flujo con mayor impacto de usuario.
