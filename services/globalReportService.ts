// ============================================================================
// Wordlish · Global Report Service (Beta) · solo admin.
//
// Reutiliza infra existente: getSupabaseClient() + Edge Function
// `generate-global-report`. No crea tablas, no altera reports.
//
// Contrato:
//   generateGlobalReport(args) -> { ok, data?, error? }
//
// La IA solo se ejecuta cuando el admin pulsa Generar. No hay cache
// automatico ni pre-fetch. El componente cliente maneja loading state.
// ============================================================================

import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface GlobalReportSections {
  studentInfo: string;
  summary: string;
  topicsCovered: string;
  strengths: string;
  followUp: string;
  evolution: string;
  recommendations: string;
  nextSteps: string;
}

export interface GlobalReportData {
  studentId: string;
  studentName: string;
  period: string;
  periodDays: number | null;
  subjectLabel: string;
  subjectsInvolved: string[];
  reportsUsed: number;
  model: string;
  generatedAt: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
  sections: GlobalReportSections;
}

export interface GenerateArgs {
  studentId: string;
  studentName: string;
  periodDays: number | null;
  subjectFilter: string | null;
}

export type GlobalReportPeriod =
  | { key: '30'; label: 'Ultimos 30 dias'; days: 30 }
  | { key: '60'; label: 'Ultimos 60 dias'; days: 60 }
  | { key: '90'; label: 'Ultimos 90 dias'; days: 90 }
  | { key: 'all'; label: 'Historial completo'; days: null };

export const GLOBAL_REPORT_PERIODS: GlobalReportPeriod[] = [
  { key: '30', label: 'Ultimos 30 dias', days: 30 },
  { key: '60', label: 'Ultimos 60 dias', days: 60 },
  { key: '90', label: 'Ultimos 90 dias', days: 90 },
  { key: 'all', label: 'Historial completo', days: null },
];

export const SECTION_META: Array<{
  key: keyof GlobalReportSections;
  order: number;
  title: string;
  icon: string;
}> = [
  { key: 'studentInfo',      order: 1, title: 'Informacion general',              icon: 'person-circle-outline' },
  { key: 'summary',          order: 2, title: 'Resumen academico global',         icon: 'document-text-outline' },
  { key: 'topicsCovered',    order: 3, title: 'Temas trabajados',                 icon: 'book-outline' },
  { key: 'strengths',        order: 4, title: 'Avances y fortalezas',             icon: 'star-outline' },
  { key: 'followUp',         order: 5, title: 'Aspectos que requieren seguimiento', icon: 'flag-outline' },
  { key: 'evolution',        order: 6, title: 'Evolucion durante el periodo',     icon: 'trending-up-outline' },
  { key: 'recommendations',  order: 7, title: 'Recomendaciones academicas',       icon: 'bulb-outline' },
  { key: 'nextSteps',        order: 8, title: 'Proximos pasos sugeridos',         icon: 'arrow-forward-circle-outline' },
];

export const AI_DISCLAIMER =
  'Este reporte fue generado con apoyo de inteligencia artificial a partir de los registros academicos disponibles y fue disenado como herramienta de seguimiento.';

export async function generateGlobalReport(
  args: GenerateArgs,
): Promise<{ ok: boolean; data?: GlobalReportData; error?: string }> {
  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb.functions.invoke('generate-global-report', {
      body: {
        studentId: args.studentId,
        studentName: args.studentName,
        periodDays: args.periodDays,
        subjectFilter: args.subjectFilter,
      },
    });

    if (error) {
      let msg = error.message ?? 'Error al generar el reporte.';
      if (error instanceof FunctionsHttpError) {
        try {
          const status = (error.context as any)?.status ?? 500;
          const text = await (error.context as any)?.text?.();
          if (text) {
            try {
              const parsed = JSON.parse(text);
              if (parsed?.message) msg = parsed.message;
              else if (parsed?.error) msg = `[${status}] ${parsed.error}`;
            } catch {
              msg = `[${status}] ${text.slice(0, 200)}`;
            }
          }
        } catch {
          // no-op
        }
      }
      return { ok: false, error: msg };
    }

    if (!data || !data.sections) {
      return { ok: false, error: 'Respuesta invalida del servidor.' };
    }
    return { ok: true, data: data as GlobalReportData };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Error inesperado.' };
  }
}

// Construye un HTML print-ready para "Descargar PDF" en web (window.print)
// o compartir en mobile. Mantiene identidad visual sobria de Wordlish.
export function buildPrintableHtml(data: GlobalReportData): string {
  const fecha = new Date(data.generatedAt).toLocaleString('es-PA');
  const sections = SECTION_META.map((m) => ({
    title: m.title,
    body: data.sections[m.key],
  }));
  const rows = sections
    .map(
      (s, idx) => `
      <section class="section">
        <h2><span class="num">${idx + 1}.</span> ${escapeHtml(s.title)}</h2>
        <p>${escapeHtml(s.body)}</p>
      </section>`,
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Reporte Global - ${escapeHtml(data.studentName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1B1F2A; margin: 0; padding: 40px; background: #ffffff; }
  header { border-bottom: 3px solid #1B4CDE; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #1B4CDE; font-weight: 700; }
  h1 { font-size: 26px; margin: 6px 0 4px; }
  .meta { color: #556; font-size: 13px; margin-top: 4px; }
  .meta strong { color: #1B1F2A; }
  .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; margin: 16px 0 24px; font-size: 13px; }
  .info-grid div span { color: #667; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 2px; }
  .section { padding: 14px 0; border-bottom: 1px solid #E4E7EC; page-break-inside: avoid; }
  .section:last-of-type { border-bottom: none; }
  h2 { font-size: 15px; margin: 0 0 8px; color: #1B4CDE; }
  .num { color: #94A3B8; margin-right: 6px; font-weight: 600; }
  p { line-height: 1.55; margin: 0; font-size: 13px; color: #22262E; }
  footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E4E7EC; font-size: 11px; color: #667; line-height: 1.5; }
  @media print { body { padding: 24px; } .section { padding: 10px 0; } }
</style>
</head>
<body>
  <header>
    <div class="brand">Wordlish</div>
    <h1>Reporte Global del Estudiante</h1>
    <div class="meta">Generado el <strong>${escapeHtml(fecha)}</strong></div>
  </header>

  <div class="info-grid">
    <div><span>Estudiante</span>${escapeHtml(data.studentName)}</div>
    <div><span>Periodo analizado</span>${escapeHtml(data.period)}</div>
    <div><span>Materia(s)</span>${escapeHtml(data.subjectLabel)}</div>
    <div><span>Reportes utilizados</span>${data.reportsUsed}</div>
  </div>

  ${rows}

  <footer>
    ${escapeHtml(AI_DISCLAIMER)}
  </footer>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
