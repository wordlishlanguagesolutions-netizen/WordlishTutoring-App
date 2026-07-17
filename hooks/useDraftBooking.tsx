import { useContext } from 'react';
import { DraftBookingContext, DraftBookingContextType } from '@/contexts/DraftBookingContext';

export function useDraftBooking(): DraftBookingContextType {
  const ctx = useContext(DraftBookingContext);
  if (!ctx) throw new Error('useDraftBooking must be used within DraftBookingProvider');
  return ctx;
}
