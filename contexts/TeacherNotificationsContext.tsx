
import React, {
  createContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { teacherActiveClass } from '@/services/mockData';

export type NotificationTone = 'danger' | 'warning' | 'info' | 'success';

export interface TeacherNotification {
  id: string;
  tone: NotificationTone;
  icon: string;
  title: string;
  message: string;
  cta?: { label: string; route: string };
}

// Umbrales del sistema de pendientes (web, sin push movil).
// Screenshot: se convierte en pendiente a partir de los 10 min sin evidencia.
// Escalado a supervisor: a los 20 min sigue sin subirse.
// Reporte: al finalizar la clase (ya cubierto por pendingReports); escala a
// supervisor si sigue sin enviarse tras 30 min. Se prepara sendEmailReminder
// como respaldo (stub que loggea; se puede reemplazar por un edge function
// de correo sin cambiar el consumidor).
export const SCREENSHOT_PENDING_MIN = 10;
export const SCREENSHOT_ESCALATE_MIN = 20;
export const REPORT_ESCALATE_MIN = 30;

interface Ctx {
  weekPublished: boolean;
  publishWeek: () => void;
  pendingReports: number;
  markReportSent: () => void;
  notifications: TeacherNotification[];
  unreadCount: number;
  deadline: { days: number; label: string; weekRange: string };
  // Pendientes automaticos derivados del tiempo real transcurrido.
  screenshotOverdue: boolean;      // >= 10 min sin screenshot
  screenshotEscalated: boolean;    // >= 20 min sin screenshot -> supervisor
  reportEscalated: boolean;        // reporte sigue pendiente pasado el umbral
  pendingTotal: number;            // total visible para badges
  sendEmailReminder: (
    kind: 'screenshot' | 'report',
    meta?: Record<string, string>,
  ) => void;
}

export const TeacherNotificationsContext = createContext<Ctx | undefined>(undefined);

export function TeacherNotificationsProvider({ children }: { children: ReactNode }) {
  const [weekPublished, setWeekPublished] = useState(false);
  const [pendingReports, setPendingReports] = useState(1);

  // Reloj: recomputa el estado de pendientes cada 30s sin regenerar los
  // datos base. Ligero en web y no depende de push nativas.
  const [tickSec, setTickSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTickSec((n) => n + 30), 30_000);
    return () => clearInterval(t);
  }, []);

  const deadline = { days: 2, label: 'viernes 17 jul', weekRange: '21 – 27 jul' };

  const publishWeek = useCallback(() => setWeekPublished(true), []);
  const markReportSent = useCallback(
    () => setPendingReports((n) => Math.max(0, n - 1)),
    []
  );

  // Minutos reales transcurridos desde el inicio de la clase activa.
  const liveElapsed = teacherActiveClass
    ? teacherActiveClass.minutesElapsed + Math.floor(tickSec / 60)
    : 0;
  const liveMissingScreenshot =
    Boolean(teacherActiveClass) && !teacherActiveClass.hasScreenshot;

  const screenshotOverdue =
    liveMissingScreenshot && liveElapsed >= SCREENSHOT_PENDING_MIN;
  const screenshotEscalated =
    liveMissingScreenshot && liveElapsed >= SCREENSHOT_ESCALATE_MIN;

  // Escalado del reporte: si tras 30 min de finalizada la clase sigue sin
  // enviarse, alerta al supervisor. Como los timeKey estan en mockData, aqui
  // simplificamos: escala cuando siguen pendientes tras el mismo tick que
  // mueve el reloj hacia adelante.
  const reportEscalated = pendingReports > 0 && tickSec >= 60 * REPORT_ESCALATE_MIN;

  // Envio de correo como respaldo economico. Stub que loggea; el metodo
  // esta pensado para conectarse mas adelante a un edge function de correo
  // sin tocar los consumidores.
  const sendEmailReminder = useCallback(
    (kind: 'screenshot' | 'report', meta?: Record<string, string>) => {
      // The ESLint directive `no-console` is unused because console.info is reported as not a problem.
      console.info('[TeacherNotifications] email reminder', { kind, meta });
    },
    [],
  );

  // Disparo idempotente del correo cuando aparece el pendiente y cuando
  // escala al supervisor. Reintentos evitados con refs.
  const emailedScreenshot = useRef(false);
  const emailedReport = useRef(false);
  const supervisorNotifiedScreenshot = useRef(false);
  const supervisorNotifiedReport = useRef(false);

  useEffect(() => {
    if (screenshotOverdue && !emailedScreenshot.current) {
      emailedScreenshot.current = true;
      sendEmailReminder('screenshot', {
        student: teacherActiveClass?.student ?? '',
        subject: teacherActiveClass?.subject ?? '',
      });
    }
    if (screenshotEscalated && !supervisorNotifiedScreenshot.current) {
      supervisorNotifiedScreenshot.current = true;
      // The ESLint directive `no-console` is unused because console.warn is reported as not a problem.
      console.warn('[TeacherNotifications] supervisor alert · screenshot');
    }
  }, [screenshotOverdue, screenshotEscalated, sendEmailReminder, teacherActiveClass]); // Added teacherActiveClass to deps

  useEffect(() => {
    if (pendingReports > 0 && !emailedReport.current) {
      emailedReport.current = true;
      sendEmailReminder('report');
    }
    if (reportEscalated && !supervisorNotifiedReport.current) {
      supervisorNotifiedReport.current = true;
      // The ESLint directive `no-console` is unused because console.warn is reported as not a problem.
      console.warn('[TeacherNotifications] supervisor alert · report');
    }
  }, [pendingReports, reportEscalated, sendEmailReminder]);

  const pendingTotal = pendingReports + (screenshotOverdue ? 1 : 0);

  const notifications = useMemo<TeacherNotification[]>(() => {
    const list: TeacherNotification[] = [];

    if (!weekPublished) {
      list.push({
        id: 'publish',
        tone: 'danger',
        icon: 'time',
        title: 'Publica tus horarios',
        message: `Semana ${deadline.weekRange}. Vence en ${deadline.days} días.`,
        cta: { label: 'Publicar ahora', route: '/(teacher)/agenda' },
      });
    }

    if (screenshotOverdue) {
      list.unshift({
        id: 'screenshot',
        tone: screenshotEscalated ? 'danger' : 'warning',
        icon: 'camera',
        title: screenshotEscalated
          ? 'Screenshot vencido · supervisor notificado'
          : 'Screenshot pendiente',
        message: `${teacherActiveClass?.student ?? ''} · ${liveElapsed} min sin evidencia`,
        cta: { label: 'Subir ahora', route: '/(teacher)/pendientes' },
      });
    }

    if (pendingReports > 0) {
      list.push({
        id: 'reports',
        tone: reportEscalated ? 'danger' : 'warning',
        icon: 'document-text',
        title: reportEscalated
          ? `${pendingReports} reporte vencido · supervisor notificado`
          : `${pendingReports} reporte pendiente`,
        message: 'Sara Morales · Conversación · 09 Jul',
        cta: { label: 'Llenar reporte', route: '/(teacher)/pendientes' },
      });
    }

    list.push({
      id: 'booking',
      tone: 'info',
      icon: 'add-circle',
      title: 'Nueva reserva confirmada',
      message: 'Diego Pérez reservó Inglés intermedio mañana 11:30',
      cta: { label: 'Ver detalle', route: '/(teacher)' },
    });

    list.push({
      id: 'reminder',
      tone: 'info',
      icon: 'notifications',
      title: 'Recordatorio de clase',
      message: 'Lucía Estudiante · Inglés básico · inicia en 15 min',
      cta: { label: 'Ir al aula', route: '/(teacher)/classroom' },
    });

    if (weekPublished) {
      list.unshift({
        id: 'published_ok',
        tone: 'success',
        icon: 'checkmark-circle',
        title: 'Horarios publicados',
        message: `Tu disponibilidad ${deadline.weekRange} ya es visible para los estudiantes.`,
      });
    }

    return list;
  }, [
    weekPublished,
    pendingReports,
    screenshotOverdue,
    screenshotEscalated,
    reportEscalated,
    liveElapsed,
    deadline, // Added deadline to dependencies
    teacherActiveClass // Added teacherActiveClass to dependencies
  ]);

  return (
    <TeacherNotificationsContext.Provider
      value={{
        weekPublished,
        publishWeek,
        pendingReports,
        markReportSent,
        notifications,
        unreadCount: notifications.length,
        deadline,
        screenshotOverdue,
        screenshotEscalated,
        reportEscalated,
        pendingTotal,
        sendEmailReminder,
      }}
    >
      {children}
    </TeacherNotificationsContext.Provider>
  );
}
