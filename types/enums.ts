// Wordlish · Enums de dominio (Fase 1)
// Fuente única de verdad para todos los estados y tipos discriminados.
// Mapean 1:1 a columnas ENUM de Supabase en Fase 2.

export type AccountType = 'student_guardian' | 'staff';

export type SpecificRole =
  | 'admin'
  | 'supervisor'
  | 'teacher'
  | 'student'
  | 'guardian';

export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'cancelled'
  | 'rescheduled'
  | 'completed'
  | 'student_absent'
  | 'technical_issue';

export type ClassRecordStatus =
  | 'scheduled'
  | 'in_progress'
  | 'ok'
  | 'no_screenshot'
  | 'teacher_late'
  | 'student_late'
  | 'no_camera'
  | 'technical'
  | 'completed'
  | 'cancelled'
  | 'student_absent';

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export type PaymentMethod =
  | 'card'
  | 'yappy'
  | 'cuanto'
  | 'transfer'
  | 'other';

export type NotificationType =
  | 'class_reminder_24h'
  | 'class_reminder_15m'
  | 'class_starting'
  | 'new_report'
  | 'new_material'
  | 'schedule_change'
  | 'teacher_absent'
  | 'class_cancelled'
  | 'class_rescheduled'
  | 'payment_pending'
  | 'payment_confirmed'
  | 'availability_pending'
  | 'booking_confirmed'
  | 'payroll_ready'
  | 'payroll_paid'
  | 'system';

export type NotificationChannel = 'in_app' | 'push' | 'whatsapp' | 'email';

export type NotificationDeliveryStatus =
  | 'queued'
  | 'delivered'
  | 'read'
  | 'failed';

export type AlertSeverity = 'info' | 'warning' | 'danger' | 'critical';

export type MaterialKind = 'PDF' | 'MP3' | 'MP4' | 'DOC' | 'IMG' | 'LINK';

// ============= LIQUIDACIONES =============
export type ClassKind = 'personal' | 'group';

export type PayrollStatus = 'draft' | 'reviewed' | 'paid';

export type PayrollAdjustmentKind = 'bonus' | 'deduction' | 'correction';

// ============= EXPEDIENTE DE CLASE (gestión) =============
// Eventos del timeline de una clase. Cualquier acción relevante
// se registra como ClassEvent y queda vinculada al ClassRecord.
export type ClassEventType =
  | 'booking_created'
  | 'payment_confirmed'
  | 'teacher_assigned'
  | 'substitute_assigned'
  | 'material_received'
  | 'topic_received'
  | 'class_started'
  | 'screenshot_received'
  | 'technical_issue'
  | 'student_absent'
  | 'teacher_absent'
  | 'no_camera'
  | 'student_late'
  | 'class_ended'
  | 'report_submitted'
  | 'report_read'
  | 'report_confirmed'
  | 'material_sent'
  | 'hours_deducted';

// Ciclo de vida del reporte post-clase
export type ReportStatus = 'draft' | 'sent' | 'read' | 'confirmed';

// Origen de un material adjunto a una clase
export type MaterialSource = 'student' | 'teacher';
