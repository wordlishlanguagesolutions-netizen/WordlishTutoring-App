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

Estado actual: `avatar_url` esta NULL para los 5. La app muestra iniciales
sobre fondo lavanda (default de `components/ui/Avatar.tsx`).

**Por que no se cargaron automaticamente**: las imagenes enviadas son
tarjetas compuestas (2 profesores por imagen). No es posible dividirlas
programaticamente sin recorte manual.

### Opciones para subir fotos individuales

**Opcion A (recomendada): cada profesor sube su foto**
1. Profesor entra por primera vez con contrasena temporal.
2. Perfil > Editar foto -> galeria.
3. La app la sube al bucket `avatars` (RLS: solo el propio usuario).

**Opcion B: Mary actualiza `avatar_url` desde OnSpace Cloud Dashboard**
1. Recopilar 5 fotos individuales (recorte manual o originales sin componer).
2. Cloud > Data > user_profiles -> editar `avatar_url` con URL publica.

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
