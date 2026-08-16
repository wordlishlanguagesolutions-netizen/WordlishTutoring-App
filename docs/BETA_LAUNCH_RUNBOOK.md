# Wordlish · Beta Launch Runbook

> Guia operativa imprimible. Marca cada casilla al completar. No avances a la
> siguiente seccion hasta cerrar todas las casillas de la anterior. Cualquier
> fallo se anota en la seccion 5 (bitacora).

- **Version del MVP:** congelado (mobile).
- **Objetivo:** dejar Wordlish en Beta Privada.
- **Tiempo estimado total:** 90 - 120 minutos si SMTP y DNS responden bien.

---

## Seccion 1 · Preparacion (5 min)

- [ ] Tener acceso al Dashboard de OnSpace (panel derecho > Cloud).
- [ ] Tener acceso a la cuenta admin principal del proyecto.
- [ ] Tener a mano un correo real para pruebas (Gmail o Hotmail).
- [ ] Tener un dominio propio verificable (ej. `wordlish.com`) o dominio de prueba de Resend.
- [ ] Tener el APK instalado en al menos 1 dispositivo Android o simulador iOS.
- [ ] Cerrar sesiones previas en la app (limpiar cache si es Live Preview).

---

## Seccion 2 · SMTP Resend (30 - 45 min · bloqueante)

### 2.1 Cuenta Resend
- [ ] Crear cuenta gratis en https://resend.com (100 correos/dia).
- [ ] Confirmar el correo de registro.
- [ ] Ingresar al dashboard Resend.

### 2.2 Verificar dominio
- [ ] Resend > Domains > Add Domain.
- [ ] Copiar los registros DNS mostrados:
  - [ ] `TXT` (SPF)
  - [ ] `CNAME` DKIM 1
  - [ ] `CNAME` DKIM 2
  - [ ] `CNAME` DKIM 3
- [ ] Pegar cada registro en el panel DNS del dominio.
- [ ] Esperar propagacion (15 - 60 min). Refrescar Resend hasta ver "Verified".

### 2.3 API Key
- [ ] Resend > API Keys > Create API Key.
- [ ] Guardar la clave en un gestor de contrasenas (solo se ve una vez).

### 2.4 Configurar SMTP en OnSpace
- [ ] Panel derecho > Cloud > Users > Emails (PRO).
- [ ] Host: `smtp.resend.com`
- [ ] Puerto: `587`
- [ ] Usuario: `resend`
- [ ] Password: la API Key generada
- [ ] From: `Wordlish <no-reply@tudominio.com>`
- [ ] Guardar.

### 2.5 Personalizar plantillas
- [ ] Signup OTP: dejar visible `{{ .Token }}`, tono corto y directo.
- [ ] Recovery OTP: dejar visible `{{ .Token }}`.
- [ ] Invite: link a `/reset-password?email={{ .Email }}`.

### 2.6 Prueba real
- [ ] Desde `/signup` crear una cuenta con un Gmail de prueba. Confirmar que llega el OTP a bandeja principal (no spam).
- [ ] Repetir con un Hotmail de prueba. Confirmar bandeja principal.
- [ ] Desde `/forgot-password` disparar recovery. Confirmar llegada del OTP.
- [ ] Si algun correo cae a spam: revisar SPF/DKIM en https://mxtoolbox.com y anotar en seccion 5.

---

## Seccion 3 · Edge Functions (10 min · bloqueante)

- [ ] Panel derecho > Cloud > Edge Functions.
- [ ] Confirmar que aparecen listadas:
  - [ ] `create-staff-user`
  - [ ] `send-push`
  - [ ] `generate-global-report`
- [ ] Si falta alguna: presionar Deploy o reintentar publicacion.
- [ ] Verificar log inicial (Cloud > Log) sin errores rojos.

### Prueba rapida
- [ ] Desde admin > Usuarios > Crear profesor: confirmar que el edge `create-staff-user` responde 200 y el correo de invitacion llega (Resend + edge OK).
- [ ] Desde admin > Reporte global: confirmar que `generate-global-report` responde y devuelve texto.
- [ ] Con push instalado en Android: verificar que `send-push` no arroja error al enviar (log OnSpace).

---

## Seccion 4 · Bootstrap del admin principal (5 min · una sola vez)

- [ ] Abrir `/signup` en la app (correo del admin real).
- [ ] Verificar OTP y establecer contrasena.
- [ ] Abrir `/bootstrap-admin` e ingresar el mismo correo.
- [ ] Confirmar mensaje de exito (RPC `bootstrap_primary_admin`).
- [ ] Revisar bandeja: llega correo de reset OTP.
- [ ] Establecer contrasena definitiva.
- [ ] Cerrar sesion y volver a entrar como admin.
- [ ] Comprobar que en `/login` el enlace "Configurar Administrador principal" ya no aparece.
- [ ] Cambiar la contrasena de desarrollo que fue compartida.

---

## Seccion 5 · Flujos E2E por rol (40 - 60 min)

> Ejecutar cada checklist en orden. Cualquier fallo pausa la beta hasta corregir.

### 5.1 Admin
- [ ] Login como admin.
- [ ] Crear profesor con materias asignadas. Invitacion enviada.
- [ ] Reenviar invitacion.
- [ ] Activar / desactivar un usuario. Confirmar que el desactivado no puede iniciar sesion.
- [ ] Crear estudiante y vincular acudiente.
- [ ] Usar "Ver como" para cada rol (profesor, supervisor, estudiante, acudiente). Banner visible.
- [ ] Volver a Administracion.
- [ ] Editar ajustes (WhatsApp, Zoom, tarifas).
- [ ] Ver panel financiero (gastos + ingresos).
- [ ] Cerrar sesion y confirmar redirect a `/login`.

### 5.2 Profesor
- [ ] Recibir invitacion en correo (Resend activo).
- [ ] Establecer contrasena via `/reset-password`.
- [ ] Iniciar sesion desde login > Staff.
- [ ] Ver solo sus clases y estudiantes.
- [ ] Intentar `/(admin)` por URL: debe redirigir a `/(teacher)`.
- [ ] Aceptar una clase pendiente.
- [ ] Ingresar a Zoom desde la ficha de clase.
- [ ] Subir screenshot de clase.
- [ ] Completar y enviar reporte.
- [ ] Consultar pendientes.

### 5.3 Supervisor
- [ ] Login staff.
- [ ] Ver monitor de clases en curso.
- [ ] Revisar historial.
- [ ] Confirmar que puede ver todas las clases pero no editar tarifas.
- [ ] Intentar `/(admin)/finance` por URL: redirect.
- [ ] Verificar alertas del sistema (si hay eventos).

### 5.4 Estudiante
- [ ] Signup publico via `/signup`.
- [ ] Verificar OTP en correo.
- [ ] Redirect a dashboard student.
- [ ] Ver proxima clase, materia, profesor, horario.
- [ ] Reservar una clase nueva (wizard completo).
- [ ] Subir comprobante de pago.
- [ ] Abrir enlace de Zoom.
- [ ] Consultar reporte publicado.
- [ ] Marcar reporte como leido / confirmar.
- [ ] Intentar `/(teacher)` por URL: redirect.

### 5.5 Acudiente
- [ ] Login como guardian (creado por admin o auto-registrado).
- [ ] Ver estudiantes vinculados.
- [ ] Reservar clase para un estudiante.
- [ ] Consultar reporte y screenshot de un estudiante.
- [ ] Ver saldo de horas del estudiante.
- [ ] Consultar historial de pagos.
- [ ] Contactar por WhatsApp desde el modulo autorizado.

---

## Seccion 6 · Verificaciones de seguridad (10 min)

- [ ] RoleGuard bloquea rutas cruzadas (probado en cada rol).
- [ ] `active=false` bloquea login inmediato.
- [ ] Trigger `prevent_self_role_escalation` bloquea auto-promocion (probar como estudiante > cambiar rol devuelve error).
- [ ] Bucket `payment-receipts`: solo owner + admin + supervisor.
- [ ] Bucket `class-screenshots`: solo participantes + admin + supervisor.
- [ ] Bucket `class-materials`: solo participantes + admin + supervisor.
- [ ] Signed URLs expiran a los 3 minutos (esperar y reintentar acceso).
- [ ] Contrasena admin fue cambiada tras el bootstrap.
- [ ] `/bootstrap-admin` retorna "ya configurado" tras primer uso.

---

## Seccion 7 · Bitacora de la beta

Anota aqui cualquier hallazgo. Un fallo bloqueante suspende la beta.

| Fecha | Rol | Paso | Resultado esperado | Resultado real | Accion tomada | Estado |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  | 🟢/🟡/🔴 |
|  |  |  |  |  |  | 🟢/🟡/🔴 |
|  |  |  |  |  |  | 🟢/🟡/🔴 |
|  |  |  |  |  |  | 🟢/🟡/🔴 |
|  |  |  |  |  |  | 🟢/🟡/🔴 |

Estados:
- 🟢 OK · sin bloqueo.
- 🟡 Menor · continuar, agendar fix.
- 🔴 Bloqueante · suspender beta hasta corregir.

---

## Seccion 8 · Criterios de salida (Go / No-Go)

Wordlish pasa oficialmente a **Beta Privada** cuando:

- [ ] Seccion 2 (SMTP) completa sin correos en spam.
- [ ] Seccion 3 (Edge Functions) completa, las 3 activas.
- [ ] Seccion 4 (Bootstrap admin) completa, contrasena de desarrollo cambiada.
- [ ] Seccion 5 (E2E) sin filas 🔴 en la bitacora.
- [ ] Seccion 6 (Seguridad) todas las casillas cerradas.

Firmar salida:

- Admin principal: __________________________ · Fecha: __________
- Responsable QA: __________________________ · Fecha: __________

---

## Seccion 9 · Post-beta (no bloqueante)

Registrar para el siguiente ciclo:

- [ ] Zoom OAuth (hoy: enlace estatico).
- [ ] Pasarela de pago real (Stripe / Wompi / PagueloFacil).
- [ ] Push iOS (APNs).
- [ ] Realtime (hoy: polling 30s).
- [ ] UI de audit_logs.
- [ ] Migracion Cloud de modulos 5 - 24 (bookings, payments, reports).
- [ ] Cron para `expire_booking_holds()`.
- [ ] Landing y dashboards web (proyecto WordlishWeb).

---

**Fin del runbook.** Guardar copia firmada en la carpeta de operaciones tras el Go.
