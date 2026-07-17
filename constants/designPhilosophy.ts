// ============================================================================
// Filosofía de diseño de Wordlish · Regla permanente · v1.1
// ============================================================================
// Este archivo NO exporta lógica de negocio. Es la documentación oficial que
// define cómo debe verse y comportarse cualquier pantalla nueva o modificada
// dentro de Wordlish. Antes de crear o refactorizar una vista, validar que
// cumpla estas reglas. Cualquier cambio a esta filosofía debe hacerse aquí
// primero para mantener una sola fuente de verdad.
// ============================================================================

/**
 * PRINCIPIOS FUNDAMENTALES
 *
 * 1. SIMPLICIDAD EXTREMA
 *    - Más fácil que WhatsApp. Si una acción requiere más de dos toques,
 *      probablemente está mal diseñada. Una persona mayor debe poder usarla.
 *
 * 2. MOSTRAR SOLO LO IMPORTANTE
 *    - Nunca mostrar procesos internos.
 *    - Nunca mostrar datos que generen ansiedad.
 *    - Nunca llenar pantallas con información repetida.
 *
 * 3. CADA PERFIL TIENE UNA EXPERIENCIA DISTINTA
 *    - Estudiante: solo estudiar. Próxima clase, entrar a Zoom, reservar,
 *      pagos, reportes. Sin procesos internos.
 *    - Acudiente: tranquilidad. Ve clase en curso, profesor conectado,
 *      estudiante presente, clase finalizada, reporte disponible. NUNCA:
 *      screenshot pendiente, reporte pendiente, material pendiente,
 *      tareas internas del profesor.
 *    - Profesor: solo acciones. Subir screenshot, completar reporte, marcar
 *      ausencia, problema técnico, abrir Zoom. Nada más.
 *    - Supervisor: ve toda la operación. Screenshots, reportes, materiales,
 *      retrasos, incidentes, estados, auditoría.
 *
 * 4. MOSTRAR RESULTADOS, NO PROCESOS
 *    - El cliente nunca ve una tarea pendiente del profesor.
 *    - Traducción obligatoria:
 *        Screenshot pendiente  → Clase en curso
 *        Reporte pendiente     → Reporte disponible
 *        Material pendiente    → (no mostrar)
 *
 * 5. REDUCIR DUPLICADOS
 *    - Si una función ya existe en la barra inferior, no repetirla en Inicio.
 *    - Inicio solo muestra accesos inmediatos, no navegación redundante.
 *
 * 6. UNA SOLA ACCIÓN PRINCIPAL
 *    - Cada pantalla responde una pregunta: ¿qué debo hacer ahora?
 *    - Un botón. Cuando termine, aparece el siguiente.
 *
 * 7. AUTOMATIZAR TODO LO POSIBLE
 *    - Profesor conectado, estudiante conectado, hora de inicio, hora de
 *      salida, screenshot recibido, tiempo de clase, asistencia y grabación
 *      se detectan automáticamente. El profesor interviene solo en
 *      excepciones.
 *
 * 8. MOSTRAR ÚNICAMENTE EXCEPCIONES
 *    - Todo se asume correcto. Solo aparecen botones cuando hay problema.
 *    - Si todo está bien: no mostrar nada.
 *
 * 9. REDUCIR PRESIÓN
 *    - El profesor no debe sentirse vigilado.
 *    - El acudiente no debe sentir que debe vigilar.
 *    - La aplicación transmite tranquilidad.
 *
 * 10. FLUJO NATURAL
 *     - La app se siente como un asistente, nunca como un sistema de control.
 *
 * 11. MENOS COLOR, MÁS JERARQUÍA
 *     - Fondo blanco. Bordes suaves.
 *     - Morado solo para acciones importantes.
 *     - Verde solo para confirmaciones.
 *     - Amarillo solo para alertas.
 *     - Rojo solo para errores críticos.
 *     - El color guía la vista, no decora.
 *
 * 12. REGLA DE LOS TRES SEGUNDOS
 *     - Al abrir cualquier pantalla, el usuario entiende en <3 s:
 *       dónde está, qué debe hacer, qué ocurrirá después.
 *     - Si necesita pensar, la pantalla debe simplificarse.
 *
 * 13. FILOSOFÍA WORDLISH
 *     - No diseñamos pantallas. Diseñamos tranquilidad.
 *     - No mostramos procesos. Mostramos confianza.
 *     - No hacemos que el usuario aprenda la app.
 *     - La app piensa por el usuario.
 *
 * 14. UBICACIÓN AUTOMÁTICA DE POLÍTICAS
 *     - Las políticas nunca se muestran en una pantalla única ni como
 *       reglamento general. Cada regla aparece únicamente cuando el
 *       usuario realiza la acción correspondiente.
 *     - Bienvenida: solo aceptación general, sin reglas específicas.
 *     - Reserva individual: cancelación y puntualidad.
 *     - Reserva grupal: horario fijo, no reprogramable, no reembolsable.
 *     - Subir material: mensaje positivo o mensaje suave según el tiempo.
 *     - Antes de la clase: recomendaciones rápidas, nunca reglamento.
 *     - Estudiante tarde: mensaje único de tolerancia.
 *     - Fin de clase individual: solo informar que llega el reporte.
 *     - Consulta de curso grupal: reportes periódicos.
 *     - Pagos: solo políticas de pago, nunca académicas.
 *     - Perfil: documento completo disponible bajo demanda.
 *     - Regla general: antes de mostrar cualquier política, la app se
 *       pregunta "¿esta información ayuda al usuario ahora?". Si la
 *       respuesta es no, no se muestra.
 *     - Los mensajes contextuales viven en constants/contextualPolicies.ts.
 */

// ============================================================================
// Helpers para traducir "procesos" internos a "resultados" visibles.
// Usar SIEMPRE que un rol cliente (estudiante o acudiente) vaya a ver un
// estado que en el backend representa una tarea del profesor.
// ============================================================================

export type InternalClassStage =
  | 'scheduled'          // Reservada, aún no comienza
  | 'starting_soon'      // Faltan <=15 min
  | 'teacher_online'     // Profesor conectado a Zoom
  | 'screenshot_pending' // Profesor debe subir screenshot
  | 'in_progress'        // Clase en curso
  | 'attendance_confirmed' // Screenshot recibido
  | 'ended'              // Zoom cerrado
  | 'report_pending'     // Profesor debe enviar reporte
  | 'report_available';  // Reporte visible

/**
 * Convierte el estado interno de una clase en el texto público que verá
 * un cliente (estudiante o acudiente). Nunca expone tareas pendientes
 * del profesor. Devuelve `null` cuando no hay nada relevante que mostrar
 * (silencio = tranquilidad).
 */
export function publicClassStatus(stage: InternalClassStage): {
  label: string;
  tone: 'muted' | 'success' | 'warning';
  icon: string;
} | null {
  switch (stage) {
    case 'scheduled':
      return null; // No abrumar con "esperando inicio"
    case 'starting_soon':
      return { label: 'Tu profesor prepara la sesión', tone: 'muted', icon: 'time-outline' };
    case 'teacher_online':
      return { label: 'Profesor conectado', tone: 'success', icon: 'radio-button-on' };
    case 'screenshot_pending':
      // Regla 4: traducir a resultado, no proceso.
      return { label: 'Clase en curso', tone: 'success', icon: 'radio' };
    case 'in_progress':
      return { label: 'Clase en curso', tone: 'success', icon: 'radio' };
    case 'attendance_confirmed':
      return { label: 'Asistencia confirmada', tone: 'success', icon: 'checkmark-circle' };
    case 'ended':
      return { label: 'Clase finalizada', tone: 'muted', icon: 'checkmark-done-circle' };
    case 'report_pending':
      // Regla 4: no mostrar procesos pendientes al cliente.
      return null;
    case 'report_available':
      return { label: 'Reporte disponible', tone: 'success', icon: 'document-text' };
  }
}

/**
 * Determina si una acción específica del profesor debe ser visible para
 * el acudiente. Siempre es `false`: el acudiente no ve tareas internas.
 */
export function isTeacherTaskVisibleToGuardian(): false {
  return false;
}
