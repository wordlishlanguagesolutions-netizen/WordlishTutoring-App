import { useContext } from 'react';
import {
  NotificationsContext,
  NotificationsContextType,
} from '@/contexts/NotificationsContext';

export function useNotifications(): NotificationsContextType {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      'useNotifications must be used within NotificationsProvider',
    );
  return ctx;
}
