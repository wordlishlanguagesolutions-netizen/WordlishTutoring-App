# Wordlish Beta · Checklist E2E Paridad App/Web

Version 1.0 · 2026-08-17

Objetivo: verificar que la misma cuenta ve identicos datos en app movil
(Wordlish) y web (WordlishWeb), ambos conectados al mismo backend Cloud
(`sgrughlymzihochvsgru`).

## Prerequisitos

- [ ] Edge Functions verificadas via `Admin > Ajustes > Diagnostico Edge Functions`.
- [ ] Snapshot Cloud sin bloqueos rojos en `Admin > Ajustes > Integridad Cloud`.
- [ ] Al menos 1 profesor real puede loguearse (Doroty, Dani, Juli, Jose o Cami).
- [ ] Al menos 1 acudiente/estudiante real disponible para reservar.
- [ ] Mary Florian (admin) accede a ambos clientes con la misma cuenta.

## Instrucciones

- Ejecutar en ventanas separadas: app movil (o simulador) + WordlishWeb.
- Marcar OK cuando ambos muestren el mismo resultado.
- Marcar ERROR con descripcion breve del diff.
- Beta aprobado solo si los 13 items marcan OK.

---

## Items

### 1. Login
- [ ] App: login con `mary73308@hotmail.com` -> dashboard admin.
- [ ] Web: mismo login -> mismo dashboard.
- Esperado: mismo perfil, mismo rol, misma foto (si existe).

### 2. Roles y navegacion
- [ ] App: tabs inferiores muestra Dashboard, Usuarios, Pagos, Paquetes, Ajustes.
- [ ] Web: sidebar muestra Dashboard, Usuarios, Pagos, Paquetes, Tickets, Ajustes.
- Esperado: mismas rutas accesibles, mismos roles disponibles.

### 3. Profesores visibles
- [ ] App: reservas (como estudiante) muestra los 5 profesores.
- [ ] Web: misma vista muestra los 5 con misma bio.
- Esperado: Doroty, Dani, Juli, Jose, Cami en ambos.

### 4. Materias
- [ ] App: seleccionar "Matematicas" muestra Juli, Jose y Cami.
- [ ] Web: misma seleccion muestra los mismos 3.
- Esperado: filtro por materia paridad exacta.

### 5. Disponibilidad
- [ ] App: seleccionar Doroty > semana actual muestra 17:00-20:00 Lun-Dom.
- [ ] Web: mismo profesor y semana muestra mismos slots.
- Esperado: 28 slots visibles (7 dias x 4 horas).

### 6. Reservas
- [ ] App: reservar Doroty, martes 18:00, Frances, 1 hora.
- [ ] Web: refrescar -> reserva aparece en "Mis reservas".
- Esperado: reserva visible en ambos en <5 seg.

### 7. Slots ocupados
- [ ] App: reintentar reservar martes 18:00 con Doroty -> slot no disponible.
- [ ] Web: mismo intento -> misma restriccion.
- Esperado: slot bloqueado en ambos post-reserva.

### 8. Paquetes de horas
- [ ] App: crear paquete de 5 horas para el estudiante desde Admin > Paquetes.
- [ ] Web: refrescar Admin > Paquetes -> paquete visible con mismos datos.
- Esperado: id, horas restantes, expiracion identicos.

### 9. Pagos
- [ ] App: registrar pago manual del paquete recien creado.
- [ ] Web: verificar Admin > Pagos -> pago aparece en mismo estado.
- Esperado: mismo monto, mismo estado, misma fecha.

### 10. Reportes
- [ ] App: (como profesor Doroty) redactar reporte draft de la clase reservada.
- [ ] Web: (como admin) refrescar Reportes -> draft visible.
- Esperado: contenido identico, estado 'draft' en ambos.

### 11. Alertas
- [ ] App: (como supervisor) Monitor > Alertas del sistema.
- [ ] Web: misma vista -> mismas alertas.
- Esperado: numero de alertas open coincide.

### 12. Tickets
- [ ] App: cualquier usuario abre soporte via SupportRow (WhatsApp).
- [ ] Web: (como admin) refrescar Tickets -> ticket recien creado visible.
- Esperado: subject, categoria, canal identicos.

### 13. Logout
- [ ] App: cerrar sesion desde Perfil -> pantalla de login.
- [ ] Web: mismo flujo -> misma pantalla de login.
- Esperado: sesion invalidada en ambos, cache limpia.

---

## Criterios de aprobacion

- 13/13 OK: **LISTO PARA BETA**.
- 1-3 ERROR no criticos (10, 11, 12): **CONDICIONALMENTE LISTO**.
- 4+ ERROR o cualquier critico (1, 5, 6, 7): **NO LISTO PARA BETA**.

## Bloqueos conocidos

- Fotos de perfil: profesores nuevos tienen `avatar_url` NULL. La app muestra
  iniciales. No bloquea beta.
- Push: solo Android APK. Web usa polling. No bloquea beta.
- Edge Function `generate-global-report`: opcional para beta.

## Registro de ejecucion

| Fecha | Ejecutor | Items OK | Items ERROR | Veredicto |
|-------|----------|----------|-------------|-----------|
|       |          |          |             |           |
