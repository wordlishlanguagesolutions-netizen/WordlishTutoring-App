// ============================================================================
// Edge Function · generate-global-report
//
// Reporte Global del Estudiante (Beta) · solo admin.
//
// Recibe:
//   {
//     studentId: string,
//     studentName: string,
//     periodDays: number | null,   // null = historial completo
//     subjectFilter: string | null // null = todas
//   }
//
// Flujo:
//   1. Valida caller autenticado y con rol admin (via user_profiles).
//   2. Con service role, lee reports del estudiante en el periodo/materia.
//   3. Optimiza contexto: solo campos necesarios, recorta 25 reportes.
//   4. Llama OnSpace AI (gemini-2.5-flash-lite, cheapest) con prompt
//      estructurado en 8 secciones (aviso: sin diagnósticos médicos).
//   5. Devuelve JSON con las secciones, meta y consumo.
//
// Notas:
//   - No modifica reports ni ningun otro registro academico.
//   - Registra en audit_logs si es posible, sin bloquear la respuesta.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  studentId?: string;
  studentName?: string;
  periodDays?: number | null;
  subjectFilter?: string | null;
}

interface ReportRow {
  id: string;
  submitted_at: string | null;
  topic: string | null;
  progress: string | null;
  objectives: string | null;
  strengths: string | null;
  improvements: string | null;
  homework: string | null;
  rating: number | null;
  class_records?: {
    subject?: { name?: string | null } | null;
    scheduled_date?: string | null;
  } | null;
}

interface AiSections {
  studentInfo: string;
  summary: string;
  topicsCovered: string;
  strengths: string;
  followUp: string;
  evolution: string;
  recommendations: string;
  nextSteps: string;
}

const MODEL = 'google/gemini-2.5-flash-lite';
const MAX_REPORTS = 25;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return json({ error: 'unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const aiKey = Deno.env.get('ONSPACE_AI_API_KEY') ?? '';
    const aiBase = Deno.env.get('ONSPACE_AI_BASE_URL') ?? '';

    // 1. Auth + role check.
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user: caller }, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !caller) return json({ error: 'unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profErr } = await admin
      .from('user_profiles')
      .select('id, role')
      .eq('id', caller.id)
      .maybeSingle();
    if (profErr || !profile) return json({ error: 'profile_not_found' }, 403);
    if (profile.role !== 'admin') return json({ error: 'forbidden_admin_only' }, 403);

    // 2. Parse body.
    const payload = (await req.json().catch(() => ({}))) as RequestBody;
    const studentId = (payload.studentId ?? '').trim();
    const studentName = (payload.studentName ?? '').trim() || 'Estudiante';
    const periodDays =
      typeof payload.periodDays === 'number' && payload.periodDays > 0
        ? Math.floor(payload.periodDays)
        : null;
    const subjectFilter =
      typeof payload.subjectFilter === 'string' && payload.subjectFilter.trim().length > 0
        ? payload.subjectFilter.trim()
        : null;
    if (!studentId) return json({ error: 'missing_student' }, 400);

    // 3. Fetch reports.
    let query = admin
      .from('reports')
      .select(
        'id, submitted_at, topic, progress, objectives, strengths, improvements, homework, rating, class_records(scheduled_date, subject:subjects(name))',
      )
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })
      .limit(MAX_REPORTS);

    if (periodDays) {
      const since = new Date(Date.now() - periodDays * 24 * 3600 * 1000).toISOString();
      query = query.gte('submitted_at', since);
    }

    const { data: rows, error: repErr } = await query;
    if (repErr) return json({ error: 'db_error', detail: repErr.message }, 500);

    let reports: ReportRow[] = (rows ?? []) as ReportRow[];
    if (subjectFilter) {
      reports = reports.filter(
        (r) => (r.class_records?.subject?.name ?? '').toLowerCase() === subjectFilter.toLowerCase(),
      );
    }

    if (reports.length === 0) {
      return json({
        error: 'no_reports',
        message: 'No hay reportes academicos para el estudiante en el periodo seleccionado.',
      }, 404);
    }

    // 4. Build compact context for the AI (only what matters).
    const compact = reports.map((r) => ({
      date: r.submitted_at ?? r.class_records?.scheduled_date ?? null,
      subject: r.class_records?.subject?.name ?? null,
      topic: trim(r.topic, 140),
      progress: trim(r.progress, 220),
      objectives: trim(r.objectives, 180),
      strengths: trim(r.strengths, 180),
      improvements: trim(r.improvements, 180),
      homework: trim(r.homework, 140),
      rating: r.rating,
    }));

    const subjectsInvolved = Array.from(
      new Set(compact.map((c) => c.subject).filter((s): s is string => !!s)),
    );
    const periodLabel = periodDays ? `Ultimos ${periodDays} dias` : 'Historial completo';
    const subjectLabel = subjectFilter ?? (subjectsInvolved.length > 1 ? 'Todas las materias' : subjectsInvolved[0] ?? 'Todas');

    if (!aiKey || !aiBase) {
      return json({ error: 'ai_not_configured' }, 500);
    }

    const sys =
      'Eres un asistente pedagogico de Wordlish. Sintetizas reportes academicos existentes en un unico informe global claro, respetuoso y util para el acudiente. NO haces diagnosticos medicos, psicologicos ni de trastornos de aprendizaje. NO inventas datos que no esten en los reportes. Escribes en espanol neutro, en tono profesional y calido. Devuelves EXCLUSIVAMENTE JSON valido con las claves solicitadas.';

    const user =
      `Estudiante: ${studentName}\nPeriodo analizado: ${periodLabel}\nMateria(s): ${subjectLabel}\nReportes disponibles: ${compact.length}\n\nA partir de los siguientes reportes academicos (JSON), genera un Reporte Global del Estudiante con exactamente estas 8 secciones (200-450 caracteres cada una, texto plano sin markdown ni listas):\n\n- studentInfo: informacion general y contexto academico\n- summary: resumen general del avance\n- topicsCovered: temas trabajados en el periodo\n- strengths: avances y fortalezas observadas\n- followUp: aspectos que requieren seguimiento (evita la palabra riesgo)\n- evolution: evolucion reciente durante el periodo\n- recommendations: recomendaciones academicas concretas\n- nextSteps: proximos pasos sugeridos\n\nResponde SOLO con JSON valido de la forma {"studentInfo":"...","summary":"...","topicsCovered":"...","strengths":"...","followUp":"...","evolution":"...","recommendations":"...","nextSteps":"..."}.\n\nReportes:\n${JSON.stringify(compact)}`;

    const aiResp = await fetch(`${aiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResp.ok) {
      const detail = await aiResp.text().catch(() => '');
      return json({ error: 'ai_error', detail: `${aiResp.status} ${detail.slice(0, 400)}` }, 502);
    }

    const aiJson = await aiResp.json().catch(() => null);
    const content: string = aiJson?.choices?.[0]?.message?.content ?? '';
    const usage = aiJson?.usage ?? null;

    const sections = parseSections(content);
    if (!sections) {
      return json({ error: 'ai_parse_failed', detail: content.slice(0, 400) }, 502);
    }

    // 5. Audit log (best effort, no blocking).
    try {
      await admin.from('audit_logs').insert({
        actor_user_id: caller.id,
        actor_role: 'admin',
        action: 'generate_global_report',
        entity: 'reports',
        entity_id: studentId,
        changes: {
          period_days: periodDays,
          subject_filter: subjectFilter,
          reports_used: compact.length,
          model: MODEL,
          usage,
        },
      });
    } catch (err) {
      console.warn('[generate-global-report] audit_logs insert failed', err);
    }

    return json({
      ok: true,
      studentId,
      studentName,
      period: periodLabel,
      periodDays,
      subjectLabel,
      subjectsInvolved,
      reportsUsed: compact.length,
      model: MODEL,
      generatedAt: new Date().toISOString(),
      usage,
      sections,
    });
  } catch (err: any) {
    return json({ error: 'internal', detail: err?.message ?? 'unknown' }, 500);
  }
});

function trim(v: string | null | undefined, n: number): string {
  const s = (v ?? '').toString().trim();
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '\u2026';
}

function parseSections(raw: string): AiSections | null {
  if (!raw) return null;
  let text = raw.trim();
  // Elimina fences ```json ... ```
  if (text.startsWith('```')) {
    text = text.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
  }
  try {
    const parsed = JSON.parse(text);
    const keys: Array<keyof AiSections> = [
      'studentInfo',
      'summary',
      'topicsCovered',
      'strengths',
      'followUp',
      'evolution',
      'recommendations',
      'nextSteps',
    ];
    const out: Partial<AiSections> = {};
    for (const k of keys) {
      const v = parsed?.[k];
      if (typeof v !== 'string' || v.trim().length === 0) return null;
      out[k] = v.trim();
    }
    return out as AiSections;
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
