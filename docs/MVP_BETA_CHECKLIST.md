# Wordlish · MVP Beta Checklist

Guia final para pasar a beta privada. No agregar funciones; solo verificar y
completar la infraestructura pendiente.

---

## 1. Infraestructura (bloqueantes P0)

### 1.1 SMTP · Resend
Necesario para que lleguen invitaciones de Staff, OTP de signup y codigos de
recuperacion de contrasena. Sin SMTP propio los correos van a spam o no llegan
(problema reportado con Hotmail).

Pasos (una sola vez):
1. Crear cuenta gratis en https://resend.com (100 correos/dia sin costo).
2. Verificar el dominio de envio (ej. `wordlish.com`) siguiendo los DNS que
   Resend indica: TXT (SPF), CNAME (DKIM). Propagacion 15-60 min.
3. Generar API Key en Resend > API Keys.
4. En el editor de OnSpace: panel derecho > Cloud > Users > Emails (PRO).
   - Host: `smtp.resend.com`
   - Puerto: `587`
   - Usuario: `resend`
   - Password: la API Key generada
   - From: `Wordlish <no-reply@tudominio.com>`
5. Personalizar plantillas en la misma seccion:
   - Signup OTP: dejar visible `{{ .Token }}`
   - Recovery OTP: dejar visible `{{ .Token }}`
   - Invite: link a `/reset-password?email={{ .Email }}`
6. Prueba: crear un usuario staff y confirmar que el correo llega a Gmail y
   Hotmail en la bandeja principal.

### 1.2 Edge Functions
Las 3 funciones existen en `supabase/functions/` pero deben registrarse en
OnSpace Cloud para que respondan a `.functions.invoke()`.

- `create-staff-user` · admin > usuarios > crear profesor / supervisor.
- `send-push` · notificaciones Android (requiere FCM V1).
- `generate-global-report` · dashboard admin > reporte global.

Pasos:
1. En el editor: panel derecho > Cloud > Edge Functions.
2. Confirmar que cada funcion aparece listada. Si no, redeploy desde la UI.
3. Test rapido en el navegador con `fetch` autenticado o desde el UI de la app.

### 1.3 Storage bucket policies · APLICADO ✅
SQL aplicado en esta sesion. Verifica:
- `payment-receipts`: solo owner + admin + supervisor pueden leer.
- `class-screenshots`: solo owner + admin + supervisor + participantes de la
  clase (teacher/student/guardian del `class_record`) pueden leer.
- `class-materials`: solo owner + admin + supervisor + participantes del
  material asociado pueden leer/escribir.

---

## 2. Cuenta admin principal (una sola vez)

1. Registrar tu correo desde `/signup` (crea perfil student por defecto).
2. Abrir `/bootstrap-admin`, ingresar el mismo correo.
3. La RPC `bootstrap_primary_admin` te promueve a `admin + is_primary_admin`.
4. Al confirmar, el sistema dispara `resetPasswordForEmail` para que
   establezcas la contrasena via OTP.
5. Iniciar sesion. El enlace `/bootstrap-admin` desaparece automaticamente
   cuando ya existe un admin principal (RPC `primary_admin_exists`).

**Importante**: cambia la contrasena que compartiste antes de este proceso.

---

## 3. Flujos E2E (5 roles)

### Admin
- [ ] Login como admin.
- [ ] Crear profesor desde Usuarios (con materias asignadas).
- [ ] Reenviar invitacion.
- [ ] Activar/desactivar usuario (probar que cuenta desactivada no puede iniciar sesion).
- [ ] Crear estudiante + vincular acudiente.
- [ ] Ver como Profesor/Supervisor/Estudiante/Acudiente (banner "Modo vista").
- [ ] Volver a Administracion.
- [ ] Cerrar sesion + verificar que no puede volver atras al dashboard.

### Profesor
- [ ] Recibir invitacion en correo (Resend activo).
- [ ] Establecer contrasena.
- [ ] Iniciar sesion via boton Staff.
- [ ] Ver solo sus clases y estudiantes.
- [ ] Intentar `/(admin)` por URL → redirect a `/(teacher)`.
- [ ] Completar reporte y enviarlo.
- [ ] Subir screenshot de clase.

### Supervisor
- [ ] Login staff.
- [ ] Ver monitor de clases en curso.
- [ ] Revisar historial.
- [ ] Intentar `/(admin)/finance` → redirect.

### Estudiante
- [ ] Signup publico → verifica OTP → dashboard student.
- [ ] Ver proxima clase, materia, profesor, horario.
- [ ] Abrir enlace de Zoom.
- [ ] Consultar reporte publicado.
- [ ] Intentar `/(teacher)` por URL → redirect.

### Acudiente
- [ ] Login (creado por admin o auto-registrado como guardian).
- [ ] Ver estudiantes vinculados.
- [ ] Consultar reporte y screenshot.
- [ ] Ver saldo de horas.

---

## 4. Seguridad · verificaciones minimas

- [x] Rutas protegidas por rol (RoleGuard en cada layout).
- [x] Cuenta con `active=false` no puede iniciar sesion.
- [x] Trigger `prevent_self_role_escalation` bloquea auto-promocion.
- [x] Handle_new_user fuerza student/guardian en signup publico.
- [x] Bucket policies filtran por owner + rol.
- [ ] Contrasena admin cambiada (accion manual).
- [ ] Bootstrap admin bloqueado tras primer uso (RPC devuelve `primary_admin_exists`).

---

## 5. Pendientes de baja prioridad (post-beta)

- Zoom OAuth (hoy: enlace estatico).
- Pasarela de pago real.
- iOS push.
- Realtime (hoy: polling 30s).
- UI de audit_logs.
- Migracion Cloud de modulos 5-24 (bookings, payments, reports usan mockDb como fallback).
- Cron para `expire_booking_holds()`.
- URLs firmadas con expiracion corta (2-3 min).

---

## Estado final

Tras completar 1.1 (SMTP), 1.2 (deploy) y ejecutar los flujos E2E de la
seccion 3 sin errores criticos: **Wordlish esta listo para Beta Privada.**

---

## MVP CONGELADO

A partir de esta version el MVP mobile queda congelado. No se agregan
funcionalidades nuevas. El foco pasa a:

1. Desarrollo de la pagina web.
2. Branding (logo e identidad visual).
3. Beta privada.
4. Correccion unicamente de errores detectados por usuarios reales.

### Ajustes finales aplicados en codigo (este cierre)

- `services/authService.ts` - guard de produccion: si el bundle release trae
  `EXPO_PUBLIC_AUTH_MODE=mock`, se fuerza `real` y se loguea error. Impide
  publicar produccion con autenticacion mock.
- `app/login.tsx` - se oculta el flash del enlace "Configurar Administrador
  principal" mientras `primaryAdminExists()` esta resolviendo.
- `app/(admin)/index.tsx` - se unifica el acceso duplicado (Estudiantes y
  Acudientes + Profesores) en un solo modulo "Usuarios" en el dashboard
  mobile.
- `services/paymentsService.ts` - Signed URL de comprobantes reducido de
  10 min a 3 min para minimizar exposicion.

### Bloqueantes externos (dashboard, no codigo)

1. SMTP Resend (seccion 1.1).
2. Deploy de las 3 Edge Functions (seccion 1.2).

Con esas dos tareas resueltas y los flujos E2E ejecutados, **Wordlish queda
oficialmente listo para iniciar la beta privada**.
