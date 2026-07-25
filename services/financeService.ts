// ============================================================================
// Wordlish · Finance service.
//
// Fuente única de datos financieros mientras conectamos OnSpace Cloud.
// Ofrece tres dominios:
//   · Gastos (Expenses)     — costos operativos y suscripciones.
//   · Nómina (Payroll)      — pagos a profesores derivados de clases.
//   · Ingresos (Revenue)    — pagos recibidos de estudiantes.
//
// Y helpers que agregan métricas para el panel financiero admin:
//   · Totales por periodo (día · semana · mes · año).
//   · Utilidad = ingresos − gastos − nómina.
//   · Próximos cobros automáticos, suscripciones por vencer.
//   · Series mensuales para gráficos (12 meses).
//
// La API es intencionalmente cercana a lo que expondrá el backend Fase 3B+
// para minimizar el refactor cuando migremos a OnSpace Cloud.
// ============================================================================

export type ExpenseFrequency = 'once' | 'weekly' | 'monthly' | 'annual';
export type ExpenseStatus = 'active' | 'cancelled';
export type PayrollStatus = 'pending' | 'paid';
export type RevenueStatus = 'paid' | 'refunded' | 'expired';

export type ExpenseCategory =
  | 'software'
  | 'infrastructure'
  | 'ai'
  | 'marketing'
  | 'licencias'
  | 'servicios'
  | 'operacion'
  | 'otros';

export interface Expense {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;              // en `currency`
  currency: string;
  frequency: ExpenseFrequency;
  billingDate: string;         // ISO fecha del último cobro
  nextBillingDate: string;     // ISO próximo cobro (para once = misma)
  method: string;              // 'Tarjeta', 'PayPal', 'Transferencia' …
  status: ExpenseStatus;
  notes?: string;
}

export interface PayrollEntry {
  id: string;
  teacherId: string;
  teacherName: string;
  tier: 'essentials' | 'specialist';
  month: string;               // 'YYYY-MM'
  hoursIndividual: number;
  hoursGroup: number;
  hourlyIndividual: number;
  hourlyGroup: number;
  bonuses: number;
  deductions: number;
  total: number;               // calculado
  status: PayrollStatus;
  paidAt?: string;
}

export interface RevenueEntry {
  id: string;
  studentId: string;
  studentName: string;
  guardianName?: string;
  packageName: string;
  hoursBought: number;
  hoursConsumed: number;
  amount: number;              // en `currency`
  currency: string;
  method: string;
  status: RevenueStatus;
  paidAt: string;              // ISO
  subject?: string;
  teacherName?: string;
}

// ─── Etiquetas de presentación ──────────────────────────────────────────────
export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  software: 'Software',
  infrastructure: 'Infraestructura',
  ai: 'IA',
  marketing: 'Publicidad',
  licencias: 'Licencias',
  servicios: 'Servicios',
  operacion: 'Operación',
  otros: 'Otros',
};

export const EXPENSE_CATEGORY_ICON: Record<ExpenseCategory, string> = {
  software: 'apps-outline',
  infrastructure: 'server-outline',
  ai: 'sparkles-outline',
  marketing: 'megaphone-outline',
  licencias: 'ribbon-outline',
  servicios: 'construct-outline',
  operacion: 'briefcase-outline',
  otros: 'ellipsis-horizontal-outline',
};

export const EXPENSE_FREQUENCY_LABEL: Record<ExpenseFrequency, string> = {
  once: 'Único',
  weekly: 'Semanal',
  monthly: 'Mensual',
  annual: 'Anual',
};

// ─── Utilidades ─────────────────────────────────────────────────────────────
export function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('es-CO')}`;
  }
}

// Convierte cualquier gasto a costo mensual normalizado para comparaciones.
export function monthlyCost(e: Expense): number {
  if (e.status !== 'active') return 0;
  switch (e.frequency) {
    case 'once': return 0;
    case 'weekly': return e.amount * 4;
    case 'monthly': return e.amount;
    case 'annual': return e.amount / 12;
  }
}

// Anualiza (para vista de año fiscal).
export function annualCost(e: Expense): number {
  if (e.status !== 'active') return 0;
  switch (e.frequency) {
    case 'once': return e.amount; // se contabiliza 1 vez en el año registrado
    case 'weekly': return e.amount * 52;
    case 'monthly': return e.amount * 12;
    case 'annual': return e.amount;
  }
}

function daysBetween(iso: string, from = new Date()): number {
  const d = new Date(iso);
  return Math.ceil((d.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Datos mock — reflejan la realidad operativa de Wordlish.
// Se actualizarán cuando conectemos OnSpace Cloud (Fase 3B+).
// ============================================================================

const TODAY = new Date();
function iso(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }

export const expenses: Expense[] = [
  {
    id: 'e-zoom', name: 'Zoom Pro', category: 'operacion', amount: 15, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -12)),
    nextBillingDate: iso(addDays(TODAY, 18)), method: 'Tarjeta', status: 'active',
    notes: 'Cuenta principal de clases.',
  },
  {
    id: 'e-dom', name: 'Dominio wordlish.com', category: 'infrastructure', amount: 22, currency: 'USD',
    frequency: 'annual', billingDate: iso(addDays(TODAY, -300)),
    nextBillingDate: iso(addDays(TODAY, 65)), method: 'Tarjeta', status: 'active',
  },
  {
    id: 'e-host', name: 'Hosting Vercel', category: 'infrastructure', amount: 20, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -5)),
    nextBillingDate: iso(addDays(TODAY, 25)), method: 'Tarjeta', status: 'active',
  },
  {
    id: 'e-openai', name: 'OpenAI API', category: 'ai', amount: 60, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -3)),
    nextBillingDate: iso(addDays(TODAY, 27)), method: 'Tarjeta', status: 'active',
    notes: 'Chat asistente + generación de reportes.',
  },
  {
    id: 'e-claude', name: 'Anthropic Claude', category: 'ai', amount: 25, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -8)),
    nextBillingDate: iso(addDays(TODAY, 22)), method: 'Tarjeta', status: 'active',
  },
  {
    id: 'e-wa', name: 'WhatsApp Business API', category: 'servicios', amount: 40, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -14)),
    nextBillingDate: iso(addDays(TODAY, 16)), method: 'Tarjeta', status: 'active',
  },
  {
    id: 'e-gw', name: 'Google Workspace', category: 'software', amount: 18, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -6)),
    nextBillingDate: iso(addDays(TODAY, 24)), method: 'Tarjeta', status: 'active',
  },
  {
    id: 'e-tb', name: 'TutorBird', category: 'software', amount: 30, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -20)),
    nextBillingDate: iso(addDays(TODAY, 10)), method: 'Tarjeta', status: 'active',
  },
  {
    id: 'e-ads', name: 'Meta Ads', category: 'marketing', amount: 250, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -1)),
    nextBillingDate: iso(addDays(TODAY, 29)), method: 'Tarjeta', status: 'active',
  },
  {
    id: 'e-google-ads', name: 'Google Ads', category: 'marketing', amount: 180, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -2)),
    nextBillingDate: iso(addDays(TODAY, 28)), method: 'Tarjeta', status: 'active',
  },
  {
    id: 'e-canva', name: 'Canva Pro', category: 'software', amount: 13, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -18)),
    nextBillingDate: iso(addDays(TODAY, 12)), method: 'Tarjeta', status: 'active',
  },
  {
    id: 'e-ms', name: 'Microsoft 365', category: 'software', amount: 22, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -25)),
    nextBillingDate: iso(addDays(TODAY, 5)), method: 'Tarjeta', status: 'active',
  },
  {
    id: 'e-lic', name: 'Licencia contable', category: 'licencias', amount: 320, currency: 'USD',
    frequency: 'annual', billingDate: iso(addDays(TODAY, -320)),
    nextBillingDate: iso(addDays(TODAY, 45)), method: 'Transferencia', status: 'active',
  },
  {
    id: 'e-inet', name: 'Internet oficina', category: 'servicios', amount: 45, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -10)),
    nextBillingDate: iso(addDays(TODAY, 20)), method: 'Débito automático', status: 'active',
  },
  {
    id: 'e-notion', name: 'Notion Team', category: 'software', amount: 32, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -22)),
    nextBillingDate: iso(addDays(TODAY, 8)), method: 'Tarjeta', status: 'active',
  },
  {
    id: 'e-stripe', name: 'Comisiones Stripe (est.)', category: 'servicios', amount: 90, currency: 'USD',
    frequency: 'monthly', billingDate: iso(addDays(TODAY, -4)),
    nextBillingDate: iso(addDays(TODAY, 26)), method: 'Débito directo', status: 'active',
    notes: 'Se factura sobre volumen procesado.',
  },
];

export const payrollEntries: PayrollEntry[] = (() => {
  // Genera nómina del mes vigente + mes anterior con montos coherentes.
  const now = new Date();
  const cm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const pmKey = `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, '0')}`;
  const rows: PayrollEntry[] = [
    // Mes actual
    {
      id: 'pr-c1', teacherId: 't1', teacherName: 'Prof. Carlos Ríos', tier: 'specialist',
      month: cm, hoursIndividual: 36, hoursGroup: 6,
      hourlyIndividual: 30000, hourlyGroup: 35000,
      bonuses: 50000, deductions: 0,
      total: 36 * 30000 + 6 * 35000 + 50000,
      status: 'pending',
    },
    {
      id: 'pr-c2', teacherId: 't2', teacherName: 'Prof. María Luna', tier: 'essentials',
      month: cm, hoursIndividual: 25, hoursGroup: 3,
      hourlyIndividual: 25000, hourlyGroup: 27000,
      bonuses: 0, deductions: 20000,
      total: 25 * 25000 + 3 * 27000 - 20000,
      status: 'pending',
    },
    {
      id: 'pr-c3', teacherId: 't4', teacherName: 'Prof. Julián Rojas', tier: 'essentials',
      month: cm, hoursIndividual: 18, hoursGroup: 0,
      hourlyIndividual: 25000, hourlyGroup: 27000,
      bonuses: 0, deductions: 0,
      total: 18 * 25000,
      status: 'pending',
    },
    // Mes anterior
    {
      id: 'pr-p1', teacherId: 't1', teacherName: 'Prof. Carlos Ríos', tier: 'specialist',
      month: pmKey, hoursIndividual: 42, hoursGroup: 8,
      hourlyIndividual: 30000, hourlyGroup: 35000,
      bonuses: 80000, deductions: 0,
      total: 42 * 30000 + 8 * 35000 + 80000,
      status: 'paid', paidAt: iso(addDays(TODAY, -5)),
    },
    {
      id: 'pr-p2', teacherId: 't2', teacherName: 'Prof. María Luna', tier: 'essentials',
      month: pmKey, hoursIndividual: 30, hoursGroup: 4,
      hourlyIndividual: 25000, hourlyGroup: 27000,
      bonuses: 0, deductions: 0,
      total: 30 * 25000 + 4 * 27000,
      status: 'paid', paidAt: iso(addDays(TODAY, -5)),
    },
    {
      id: 'pr-p3', teacherId: 't3', teacherName: 'Prof. Ana Vega', tier: 'specialist',
      month: pmKey, hoursIndividual: 24, hoursGroup: 6,
      hourlyIndividual: 30000, hourlyGroup: 35000,
      bonuses: 30000, deductions: 15000,
      total: 24 * 30000 + 6 * 35000 + 30000 - 15000,
      status: 'paid', paidAt: iso(addDays(TODAY, -5)),
    },
  ];
  return rows;
})();

export const revenues: RevenueEntry[] = (() => {
  // Ingresos distribuidos entre hoy, esta semana, mes y meses previos.
  const daysAgo = (n: number) => iso(addDays(TODAY, -n));
  return [
    {
      id: 'rv-1', studentId: 's1', studentName: 'Lucía Estudiante', guardianName: 'Marta Acudiente',
      packageName: 'Paquete 8 horas', hoursBought: 8, hoursConsumed: 1, amount: 110, currency: 'USD',
      method: 'Tarjeta', status: 'paid', paidAt: daysAgo(0), subject: 'Inglés Básico', teacherName: 'Prof. Carlos Ríos',
    },
    {
      id: 'rv-2', studentId: 's5', studentName: 'Diego Pérez', packageName: 'Paquete 4 horas',
      hoursBought: 4, hoursConsumed: 0, amount: 60, currency: 'USD',
      method: 'Yappy', status: 'paid', paidAt: daysAgo(0), subject: 'Inglés Intermedio', teacherName: 'Prof. María Luna',
    },
    {
      id: 'rv-3', studentId: 's7', studentName: 'Sofía Marín', packageName: 'Paquete 12 horas',
      hoursBought: 12, hoursConsumed: 3, amount: 165, currency: 'USD',
      method: 'Transferencia', status: 'paid', paidAt: daysAgo(1), subject: 'Conversación', teacherName: 'Prof. Ana Vega',
    },
    {
      id: 'rv-4', studentId: 's8', studentName: 'Andrés Cárdenas', packageName: 'Paquete 8 horas',
      hoursBought: 8, hoursConsumed: 4, amount: 110, currency: 'USD',
      method: 'Tarjeta', status: 'paid', paidAt: daysAgo(3), subject: 'Inglés Business', teacherName: 'Prof. Carlos Ríos',
    },
    {
      id: 'rv-5', studentId: 's9', studentName: 'Laura Torres', packageName: 'Paquete 4 horas',
      hoursBought: 4, hoursConsumed: 4, amount: 60, currency: 'USD',
      method: 'Tarjeta', status: 'paid', paidAt: daysAgo(5), subject: 'Francés Intermedio', teacherName: 'Prof. María Luna',
    },
    {
      id: 'rv-6', studentId: 's10', studentName: 'Pablo Estudiante', guardianName: 'Marta Acudiente',
      packageName: 'Paquete 8 horas', hoursBought: 8, hoursConsumed: 2, amount: 110, currency: 'USD',
      method: 'Tarjeta', status: 'paid', paidAt: daysAgo(6), subject: 'Inglés Básico', teacherName: 'Prof. María Luna',
    },
    {
      id: 'rv-7', studentId: 's11', studentName: 'Camila Ríos', packageName: 'Paquete 12 horas',
      hoursBought: 12, hoursConsumed: 9, amount: 165, currency: 'USD',
      method: 'Yappy', status: 'paid', paidAt: daysAgo(10), subject: 'Inglés Intermedio', teacherName: 'Prof. Carlos Ríos',
    },
    {
      id: 'rv-8', studentId: 's12', studentName: 'Nicolás Bravo', packageName: 'Paquete 4 horas',
      hoursBought: 4, hoursConsumed: 3, amount: 60, currency: 'USD',
      method: 'Transferencia', status: 'paid', paidAt: daysAgo(12), subject: 'Conversación', teacherName: 'Prof. Ana Vega',
    },
    {
      id: 'rv-9', studentId: 's13', studentName: 'Valentina Ruiz', packageName: 'Paquete 24 horas',
      hoursBought: 24, hoursConsumed: 6, amount: 300, currency: 'USD',
      method: 'Tarjeta', status: 'paid', paidAt: daysAgo(18), subject: 'Inglés Business', teacherName: 'Prof. Carlos Ríos',
    },
    {
      id: 'rv-10', studentId: 's14', studentName: 'Julián Herrera', packageName: 'Paquete 8 horas',
      hoursBought: 8, hoursConsumed: 8, amount: 110, currency: 'USD',
      method: 'Tarjeta', status: 'paid', paidAt: daysAgo(25), subject: 'Inglés Básico', teacherName: 'Prof. María Luna',
    },
    {
      id: 'rv-11', studentId: 's15', studentName: 'Ana Sofía López', packageName: 'Paquete 4 horas',
      hoursBought: 4, hoursConsumed: 0, amount: 60, currency: 'USD',
      method: 'Tarjeta', status: 'refunded', paidAt: daysAgo(40),
    },
    {
      id: 'rv-12', studentId: 's16', studentName: 'Mateo Duarte', packageName: 'Paquete 8 horas',
      hoursBought: 8, hoursConsumed: 5, amount: 110, currency: 'USD',
      method: 'Tarjeta', status: 'paid', paidAt: daysAgo(55), subject: 'Inglés Intermedio', teacherName: 'Prof. Ana Vega',
    },
  ];
})();

// ============================================================================
// Agregaciones — utilizadas por el panel Admin · Pagos.
// ============================================================================

function isSameDay(iso1: string, d: Date): boolean {
  const a = new Date(iso1);
  return a.getFullYear() === d.getFullYear()
    && a.getMonth() === d.getMonth()
    && a.getDate() === d.getDate();
}

function isSameMonth(iso1: string, d: Date): boolean {
  const a = new Date(iso1);
  return a.getFullYear() === d.getFullYear() && a.getMonth() === d.getMonth();
}

function isSameYear(iso1: string, d: Date): boolean {
  return new Date(iso1).getFullYear() === d.getFullYear();
}

function isThisWeek(iso1: string, d: Date): boolean {
  const a = new Date(iso1);
  const diff = (d.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
}

// ─── Ingresos ───────────────────────────────────────────────────────────────
export function revenueSummary() {
  const now = new Date();
  const paid = revenues.filter((r) => r.status === 'paid');
  const day = paid.filter((r) => isSameDay(r.paidAt, now)).reduce((s, r) => s + r.amount, 0);
  const week = paid.filter((r) => isThisWeek(r.paidAt, now)).reduce((s, r) => s + r.amount, 0);
  const month = paid.filter((r) => isSameMonth(r.paidAt, now)).reduce((s, r) => s + r.amount, 0);
  const year = paid.filter((r) => isSameYear(r.paidAt, now)).reduce((s, r) => s + r.amount, 0);
  const totalHoursBought = paid.reduce((s, r) => s + r.hoursBought, 0);
  const totalHoursConsumed = paid.reduce((s, r) => s + r.hoursConsumed, 0);
  const activeStudents = new Set(paid.map((r) => r.studentId)).size;
  const averageTicket = paid.length ? Math.round(paid.reduce((s, r) => s + r.amount, 0) / paid.length) : 0;
  const revenuePerStudent = activeStudents ? Math.round(paid.reduce((s, r) => s + r.amount, 0) / activeStudents) : 0;
  return {
    day, week, month, year,
    totalHoursBought,
    totalHoursConsumed,
    hoursPending: totalHoursBought - totalHoursConsumed,
    activeStudents,
    averageTicket,
    revenuePerStudent,
  };
}

export function revenueBySubject(): { subject: string; amount: number }[] {
  const map = new Map<string, number>();
  revenues.filter((r) => r.status === 'paid' && r.subject).forEach((r) => {
    map.set(r.subject!, (map.get(r.subject!) ?? 0) + r.amount);
  });
  return [...map.entries()]
    .map(([subject, amount]) => ({ subject, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function revenueByTeacher(): { teacher: string; amount: number }[] {
  const map = new Map<string, number>();
  revenues.filter((r) => r.status === 'paid' && r.teacherName).forEach((r) => {
    map.set(r.teacherName!, (map.get(r.teacherName!) ?? 0) + r.amount);
  });
  return [...map.entries()]
    .map(([teacher, amount]) => ({ teacher, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function revenueByPackage(): { pkg: string; amount: number; units: number }[] {
  const map = new Map<string, { amount: number; units: number }>();
  revenues.filter((r) => r.status === 'paid').forEach((r) => {
    const prev = map.get(r.packageName) ?? { amount: 0, units: 0 };
    map.set(r.packageName, { amount: prev.amount + r.amount, units: prev.units + 1 });
  });
  return [...map.entries()]
    .map(([pkg, v]) => ({ pkg, ...v }))
    .sort((a, b) => b.amount - a.amount);
}

// ─── Gastos ─────────────────────────────────────────────────────────────────
export function expenseSummary() {
  const active = expenses.filter((e) => e.status === 'active');
  const month = active.reduce((s, e) => s + monthlyCost(e), 0);
  const year = active.reduce((s, e) => s + annualCost(e), 0);
  const upcoming = active
    .map((e) => ({ ...e, daysToNext: daysBetween(e.nextBillingDate) }))
    .filter((e) => e.daysToNext >= 0 && e.daysToNext <= 14)
    .sort((a, b) => a.daysToNext - b.daysToNext);
  return { month, year, upcoming };
}

export function expensesByCategory(): { category: ExpenseCategory; amount: number }[] {
  const map = new Map<ExpenseCategory, number>();
  expenses.filter((e) => e.status === 'active').forEach((e) => {
    map.set(e.category, (map.get(e.category) ?? 0) + monthlyCost(e));
  });
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

// ─── Nómina ─────────────────────────────────────────────────────────────────
export function payrollSummary() {
  const now = new Date();
  const cm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = payrollEntries.filter((p) => p.month === cm);
  const pending = currentMonth.filter((p) => p.status === 'pending').reduce((s, p) => s + p.total, 0);
  const paidThisMonth = currentMonth.filter((p) => p.status === 'paid').reduce((s, p) => s + p.total, 0);
  const teachers = new Set(currentMonth.map((p) => p.teacherId)).size || 1;
  const avgPerTeacher = Math.round((pending + paidThisMonth) / teachers);
  const hoursDelivered = currentMonth.reduce((s, p) => s + p.hoursIndividual + p.hoursGroup, 0);
  return { pending, paidThisMonth, avgPerTeacher, teachers, hoursDelivered, cm };
}

export function payrollListByMonth(month: string): PayrollEntry[] {
  return payrollEntries
    .filter((p) => p.month === month)
    .sort((a, b) => b.total - a.total);
}

export function listPayrollMonths(): string[] {
  return Array.from(new Set(payrollEntries.map((p) => p.month))).sort((a, b) => b.localeCompare(a));
}

// ─── Ingresos serie mensual · 12 meses ──────────────────────────────────────
export function monthlyRevenueSeries(): { label: string; value: number }[] {
  const now = new Date();
  const series: { label: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = revenues
      .filter((r) => r.status === 'paid' && isSameMonth(r.paidAt, d))
      .reduce((s, r) => s + r.amount, 0);
    series.push({
      label: d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
      value,
    });
  }
  return series;
}

// ─── Gastos serie mensual · 12 meses (aproximada) ───────────────────────────
export function monthlyExpenseSeries(): { label: string; value: number }[] {
  // Como los gastos son recurrentes, cada mes suma el monthlyCost total.
  const baseMonthly = expenses
    .filter((e) => e.status === 'active')
    .reduce((s, e) => s + monthlyCost(e), 0);
  const now = new Date();
  const series: { label: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    // Simula variación ±15% para hacer visible el gráfico
    const variation = 1 + Math.sin(i) * 0.12;
    series.push({
      label: d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
      value: Math.round(baseMonthly * variation),
    });
  }
  return series;
}

// ─── Flujo de caja combinado (ingresos − gastos − nómina promedio) ──────────
export function cashFlowSeries(): { label: string; revenue: number; expense: number; profit: number }[] {
  const rev = monthlyRevenueSeries();
  const exp = monthlyExpenseSeries();
  const now = new Date();
  const cm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const payrollThis = payrollEntries
    .filter((p) => p.month === cm)
    .reduce((s, p) => s + p.total, 0);
  // Aprox nómina como % de ingresos por mes previo
  return rev.map((r, i) => {
    const expense = exp[i]?.value ?? 0;
    const payrollShare = payrollThis ? Math.round(payrollThis * 0.7 * (0.8 + (i / 11) * 0.4)) : 0;
    const totalOut = expense + payrollShare;
    return {
      label: r.label,
      revenue: r.value,
      expense: totalOut,
      profit: r.value - totalOut,
    };
  });
}

// ─── Utilidad ──────────────────────────────────────────────────────────────
export function profitSummary() {
  const rev = revenueSummary();
  const exp = expenseSummary();
  const nom = payrollSummary();
  return {
    month: rev.month - exp.month - nom.pending - nom.paidThisMonth,
    year: rev.year - exp.year,
    revenueMonth: rev.month,
    expenseMonth: exp.month,
    payrollMonth: nom.pending + nom.paidThisMonth,
    revenueYear: rev.year,
    expenseYear: exp.year,
  };
}

// ─── Etiquetas rápidas ──────────────────────────────────────────────────────
export function humanDaysToNext(iso1: string): string {
  const d = daysBetween(iso1);
  if (d < 0) return 'Vencido';
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  if (d <= 7) return `En ${d} días`;
  if (d <= 30) return `En ${d} d`;
  const months = Math.round(d / 30);
  return `En ${months} m`;
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

// ============================================================================
// Mutaciones · en memoria. Se reemplazarán por llamadas a OnSpace Cloud
// (Fase 3B) sin cambiar la API pública.
// ============================================================================

export function addExpense(input: Omit<Expense, 'id'>): Expense {
  const e: Expense = { ...input, id: `e-${Date.now().toString(36)}` };
  expenses.unshift(e);
  return e;
}

export function updateExpense(
  id: string,
  patch: Partial<Omit<Expense, 'id'>>,
): void {
  const target = expenses.find((e) => e.id === id);
  if (!target) return;
  Object.assign(target, patch);
}

export function deleteExpense(id: string): void {
  const idx = expenses.findIndex((e) => e.id === id);
  if (idx >= 0) expenses.splice(idx, 1);
}

export function markPayrollPaid(id: string): void {
  const p = payrollEntries.find((x) => x.id === id);
  if (!p) return;
  p.status = 'paid';
  p.paidAt = new Date().toISOString().slice(0, 10);
}

export function markPayrollPending(id: string): void {
  const p = payrollEntries.find((x) => x.id === id);
  if (!p) return;
  p.status = 'pending';
  p.paidAt = undefined;
}

export function listPayrollTeachers(): { id: string; name: string }[] {
  const map = new Map<string, string>();
  payrollEntries.forEach((p) => map.set(p.teacherId, p.teacherName));
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Distribuye el costo de nómina del periodo entre las materias, usando
// como proxy las horas consumidas registradas en ingresos. Es la mejor
// aproximación mientras `class_records` no persista `subject_id`.
export function payrollBySubject(
  month?: string,
): { subject: string; amount: number; hours: number }[] {
  const list = month
    ? payrollEntries.filter((p) => p.month === month)
    : payrollEntries;
  if (list.length === 0) return [];
  const totalCost = list.reduce((s, p) => s + p.total, 0);
  const totalHours = list.reduce(
    (s, p) => s + p.hoursIndividual + p.hoursGroup,
    0,
  );
  if (totalHours === 0) return [];

  const bySubj = new Map<string, number>();
  revenues
    .filter((r) => r.status === 'paid' && r.subject)
    .forEach((r) => {
      bySubj.set(r.subject!, (bySubj.get(r.subject!) ?? 0) + r.hoursConsumed);
    });
  const totalRevHours = [...bySubj.values()].reduce((s, v) => s + v, 0);
  if (totalRevHours === 0) return [];

  return [...bySubj.entries()]
    .map(([subject, h]) => {
      const share = h / totalRevHours;
      return {
        subject,
        amount: Math.round(totalCost * share),
        hours: Math.round(totalHours * share),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}
