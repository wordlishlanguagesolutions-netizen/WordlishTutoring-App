import { useContext } from 'react';
import { BookingsContext, BookingsContextType } from '@/contexts/BookingsContext';

export function useBookings(): BookingsContextType {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error('useBookings must be used within BookingsProvider');
  return ctx;
}
