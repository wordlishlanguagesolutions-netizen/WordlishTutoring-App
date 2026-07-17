import React, {
  createContext, useState, useCallback, useMemo, ReactNode,
} from 'react';

export interface DraftBooking {
  studentId: string;
  studentName: string;
  studentAvatar: string;
  subject: string;
  teacherId: string;   // 'any' or a real id
  teacherName: string;
  teacherAvatar: string;
  date: string;
  time: string;
  holdId: string | null;
}

const empty: DraftBooking = {
  studentId: '', studentName: '', studentAvatar: '',
  subject: '',
  teacherId: '', teacherName: '', teacherAvatar: '',
  date: '', time: '', holdId: null,
};

export interface DraftBookingContextType {
  draft: DraftBooking;
  setStudent: (id: string, name: string, avatar: string) => void;
  setSubject: (subject: string) => void;
  setTeacher: (id: string, name: string, avatar: string) => void;
  setSchedule: (date: string, time: string) => void;
  setHoldId: (id: string | null) => void;
  reset: () => void;
}

export const DraftBookingContext = createContext<DraftBookingContextType | undefined>(undefined);

export function DraftBookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<DraftBooking>(empty);

  const setStudent = useCallback((id: string, name: string, avatar: string) => {
    setDraft((d) => ({ ...d, studentId: id, studentName: name, studentAvatar: avatar }));
  }, []);

  const setSubject = useCallback((subject: string) => {
    setDraft((d) => ({
      ...d, subject,
      teacherId: '', teacherName: '', teacherAvatar: '',
      date: '', time: '', holdId: null,
    }));
  }, []);

  const setTeacher = useCallback((id: string, name: string, avatar: string) => {
    setDraft((d) => ({
      ...d, teacherId: id, teacherName: name, teacherAvatar: avatar,
      date: '', time: '', holdId: null,
    }));
  }, []);

  const setSchedule = useCallback((date: string, time: string) => {
    setDraft((d) => ({ ...d, date, time }));
  }, []);

  const setHoldId = useCallback((id: string | null) => {
    setDraft((d) => ({ ...d, holdId: id }));
  }, []);

  const reset = useCallback(() => setDraft(empty), []);

  const value = useMemo<DraftBookingContextType>(() => ({
    draft, setStudent, setSubject, setTeacher, setSchedule, setHoldId, reset,
  }), [draft, setStudent, setSubject, setTeacher, setSchedule, setHoldId, reset]);

  return <DraftBookingContext.Provider value={value}>{children}</DraftBookingContext.Provider>;
}
