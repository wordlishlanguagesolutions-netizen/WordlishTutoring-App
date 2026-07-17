import { useContext } from 'react';
import { TeacherNotificationsContext } from '@/contexts/TeacherNotificationsContext';

export function useTeacherNotifications() {
  const ctx = useContext(TeacherNotificationsContext);
  if (!ctx) {
    throw new Error(
      'useTeacherNotifications debe usarse dentro de TeacherNotificationsProvider'
    );
  }
  return ctx;
}
