# Wordlish Beta · Credenciales de Prueba

**Estado: PENDIENTE CONFIRMACION DE PARTICIPANTES**

Version 1.0 · 2026-08-17

Este documento lista las credenciales generadas para el beta. NO enviar a
nadie hasta que Mary Florian confirme cuales de los 5 profesores participan
efectivamente en la prueba de 20 dias.

---

## Profesores registrados en Cloud

Los 5 profesores fueron creados como registros operativos reales
(`auth.users` -> `user_profiles` -> `staff` -> `teachers` ->
`teacher_subjects` -> `teacher_availability`). Sus datos son los enviados
por Mary con las fotos de los perfiles de la web.

| Nombre    | Email                 | Materias                     | Contrasena temporal |
|-----------|-----------------------|------------------------------|---------------------|
| Doroty O. | doroty.o@wordlish.co  | Frances, Ingles, Espanol     | WordlishBeta2026!   |
| Dani G.   | dani.g@wordlish.co    | Ciencias, Quimica            | WordlishBeta2026!   |
| Juli Q.   | juli.q@wordlish.co    | Quimica, Matematicas         | WordlishBeta2026!   |
| Jose M.   | jose.m@wordlish.co    | Matematicas, Fisica          | WordlishBeta2026!   |
| Cami F.   | cami.f@wordlish.co    | Matematicas, Quimica         | WordlishBeta2026!   |

Todos con:
- tier: `essentials`
- grades: `bachillerato`, `universidad`
- hourly_rate: 25.00 USD (placeholder; ajustable en Ajustes > Tarifas)
- disponibilidad: Lun-Dom 17:00-20:00 (4 semanas desde 2026-08-17)
- bio: frase exacta de la tarjeta web

---

## Foto de perfil

Estado actual: `avatar_url` apunta a las imagenes enviadas por Mary
(hospedadas en `cdn-ai.onspace.ai`). Copia local de respaldo en
`assets/teachers/`.

| Profesor  | Archivo local          | Individual | Fuente        |
|-----------|------------------------|------------|---------------|
| Doroty O. | doroty.png             | Si         | CDN individual|
| Dani G.   | dani.jpeg              | Si         | CDN individual|
| Juli Q.   | juli.jpeg              | Si         | CDN individual|
| Jose M.   | jose.png               | Si         | CDN individual|
| Cami F.   | cami.png               | Si         | CDN individual|

**Estado**: los 5 profesores tienen retrato individual en `avatar_url`. No
quedan composites compartidas. Cada uno puede reemplazar la foto desde
Perfil > Editar foto (sube al bucket `avatars` con RLS propia).

---

## Participantes confirmados

Mary debe marcar con X los profesores que efectivamente participaran:

- [ ] Doroty O.
- [ ] Dani G.
- [ ] Juli Q.
- [ ] Jose M.
- [ ] Cami F.

Y agregar estudiantes/acudientes reales:

| Nombre completo | Rol | Email | Notas |
|-----------------|-----|-------|-------|
|                 |     |       |       |

---

## Flujo recomendado para invitar

Solo cuando la seccion anterior este completa:

```
Hola [nombre]!

Ya estas registrado en Wordlish para la beta de 20 dias.

Tu acceso:
  - App movil: descarga el APK que te comparte Mary (Android) o
               descarga OnSpace App y escanea QR (iOS).
  - Web: https://[url-wordlish-web]
  - Usuario: [email]
  - Contrasena: WordlishBeta2026!

En el primer login te pediremos:
  1. Cambiar la contrasena.
  2. Subir tu foto de perfil.
  3. Revisar disponibilidad (ya cargamos Lun-Dom 17-20).
  4. Confirmar materias.

Soporte: WhatsApp configurado en la app.
```

---

## Rotacion de contrasena

La contrasena temporal `WordlishBeta2026!` fue insertada directamente en
`auth.users` con `crypt(pw, gen_salt('bf'))`. Es funcional pero debe
cambiarse en primer login.

Si un profesor olvida la contrasena:
1. `/forgot-password` en app o web.
2. Recibe OTP via correo (Resend).
3. Ingresa OTP y elige nueva contrasena.

Requisito: Resend SMTP configurado. Verificar en
Admin > Ajustes > Diagnostico SMTP.

---

## Historial

- 1.0 (2026-08-17): Creacion con los 5 profesores del batch beta.
- 1.1 (2026-08-17): Retratos individuales completos para los 5 (Jose recibido).
