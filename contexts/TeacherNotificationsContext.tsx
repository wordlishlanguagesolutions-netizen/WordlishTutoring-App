import React, { createContext, useState, ReactNode, useMemo, useCallback } from 'react';

export type NotificationTone = 'danger' | 'warning' | 'info' | 'success';

export interface TeacherNotification {
  id: string;
  tone: NotificationTone;
  icon: string;
  title: string;
  message: string;
  cta?: { label: string; route: string };
}

interface Ctx {
  weekPublished: boolean;
  publishWeek: () => void;
  pendingReports: number;
  markReportSent: () => void;
  notifications: TeacherNotification[];
  unreadCount: number;
  deadline: { days: number; label: string; weekRange: string };
}

export const TeacherNotificationsContext = createContext<Ctx | undefined>(undefined);

export function TeacherNotificationsProvider({ children }: { children: ReactNode }) {
  const [weekPublished, setWeekPublished] = useState(false);
  const [pendingReports, setPendingReports] = useState(1);

  const deadline = { days: 2, label: 'viernes 17 jul', weekRange: '21 – 27 jul' };

  const publishWeek = useCallback(() => setWeekPublished(true), []);
  const markReportSent = useCallback(
    () => setPendingReports((n) => Math.max(0, n - 1)),
    []
  );

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

    if (pendingReports > 0) {
      list.push({
        id: 'reports',
        tone: 'warning',
        icon: 'document-text',
        title: `${pendingReports} reporte pendiente`,
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
  }, [weekPublished, pendingReports]);

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
      }}
    >
      {children}
    </TeacherNotificationsContext.Provider>
  );
}
