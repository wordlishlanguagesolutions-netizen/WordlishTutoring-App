import { useContext } from 'react';
import { ImpersonationContext, type ImpersonationContextType } from '@/contexts/ImpersonationContext';

export function useImpersonation(): ImpersonationContextType {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return ctx;
}
