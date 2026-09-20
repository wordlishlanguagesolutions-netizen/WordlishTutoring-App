// =============================================================================
// import-diagnostic-questions
// -----------------------------------------------------------------------------
// Purpose: Import (or dry-run) the 500-question CSV bank into
//          public.diagnostic_questions. Admin only.
//
// Body (JSON) - accepts EITHER csv_content OR csv_url:
//   {
//     "csv_content": "<CSV as string>",   // optional if csv_url provided
//     "csv_url": "https://...pub?output=csv", // optional; server-side fetch
//     "dry_run": true,                    // default true
//     "delimiter": ","                    // default ","
//   }
//
// Response (dry_run):
//   { ok, dry_run: true, stats: { totalCount, uniqueItemIds, duplicateCount,
//     rejectedCount, emptyRequiredFields, conversionErrorsCount,
//     firstItem, lastItem, firstRow, lastRow, errors[], duplicates[],
//     emptyFields[], conversionErrors[], validCount, sample } }
//
// Response (real import): { ok, inserted, updated, stats }
//
// Auth: Requires Bearer JWT of an authenticated admin OR supervisor user.
//       service_role is never exposed to the frontend.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  try {
    // Auth: extract JWT
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return err('Unauthorized', 401);

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseAuth = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userRes?.user) return err('Unauthorized', 401);

    const supabaseAdmin = createClient(url, service);
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userRes.user.id)
      .single();

    if (!profile || !['admin', 'supervisor'].includes(String(profile.role))) {
      return err('Forbidden: admin or supervisor only', 403);
    }

    // Body
    let body: any = null;
    try { body = await req.json(); } catch { return err('Invalid JSON body', 400); }
    let csv = String(body?.csv_content ?? '');
    const csvUrl = body?.csv_url ? String(body.csv_url) : '';
    const dryRun = body?.dry_run !== false; // default true
    const delimiter = String(body?.delimiter ?? ',');

    // Fetch server-side if csv_url provided (handles redirects, no CORS)
    if (!csv.trim() && csvUrl) {
      try {
        const resp = await fetch(csvUrl, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Wordlish-Import/1.0',
            'Accept': 'text/csv,text/plain,*/*',
          },
        });
        if (!resp.ok) return err(`Failed to fetch csv_url: HTTP ${resp.status}`, 502);
        csv = await resp.text();
      } catch (e) {
        return err(`Failed to fetch csv_url: ${(e as Error).message}`, 502);
      }
    }

    if (!csv.trim()) return err('csv_content or csv_url is required', 400);

    // Parse + validate
    const parsed = parseCsv(csv, delimiter);
    if (!parsed.rows.length) return err('CSV has no data rows', 400);

    const stats = validate(parsed);

    if (dryRun) {
      const firstItem = stats.validRows[0]?.item_id ?? null;
      const lastItem = stats.validRows[stats.validRows.length - 1]?.item_id ?? null;
      return json({
        ok: true,
        dry_run: true,
        headers: parsed.headers,
        stats: {
          // Canonical names (current contract)
          totalCount: stats.total,
          uniqueItemIds: stats.uniqueItemIds,
          duplicateCount: stats.duplicates.length,
          rejectedCount: stats.errors.length,
          emptyRequiredFields: stats.emptyFields.length,
          conversionErrorsCount: stats.conversionErrors.length,
          firstItem,
          lastItem,
          firstRow: stats.validRows[0] ?? null,
          lastRow: stats.validRows[stats.validRows.length - 1] ?? null,
          // Legacy aliases (backwards compatible)
          total: stats.total,
          validCount: stats.validRows.length,
          errorsCount: stats.errors.length,
          duplicatesCount: stats.duplicates.length,
          emptyFieldsCount: stats.emptyFields.length,
          // Details (capped at 50 rows each)
          errors: stats.errors.slice(0, 50),
          duplicates: stats.duplicates.slice(0, 50),
          emptyFields: stats.emptyFields.slice(0, 50),
          conversionErrors: stats.conversionErrors.slice(0, 50),
          sample: stats.validRows.slice(0, 3),
        },
      });
    }

    // Real import
    let inserted = 0, updated = 0;
    const failed: Array<{ item_id: string; message: string }> = [];

    for (const row of stats.validRows) {
      const { data: existing } = await supabaseAdmin
        .from('diagnostic_questions')
        .select('id')
        .eq('item_id', row.item_id)
        .maybeSingle();

      const payload = {
        item_id: row.item_id,
        section: row.section || null,
        level: row.level || null,
        skill: row.skill || null,
        question_type: row.question_type || 'multiple_choice',
        question_text: row.question_text,
        options: row.options,
        correct_answer: row.correct_answer || null,
        points: row.points,
        difficulty: row.difficulty,
        tags: row.tags,
        audio_url: row.audio_url || null,
        image_url: row.image_url || null,
        explanation: row.explanation || null,
        active: row.active,
        updated_at: new Date().toISOString(),
        updated_by: userRes.user.id,
      };

      if (existing) {
        const { error: uErr } = await supabaseAdmin
          .from('diagnostic_questions').update(payload).eq('id', existing.id);
        if (uErr) failed.push({ item_id: row.item_id, message: uErr.message });
        else updated++;
      } else {
        const { error: iErr } = await supabaseAdmin
          .from('diagnostic_questions').insert({ ...payload, created_by: userRes.user.id });
        if (iErr) failed.push({ item_id: row.item_id, message: iErr.message });
        else inserted++;
      }
    }

    return json({
      ok: true,
      dry_run: false,
      inserted,
      updated,
      failedCount: failed.length,
      failed: failed.slice(0, 50),
      stats: {
        total: stats.total,
        uniqueItemIds: stats.uniqueItemIds,
        errorsCount: stats.errors.length,
        duplicatesCount: stats.duplicates.length,
      },
    });
  } catch (e) {
    console.error('[import-diagnostic-questions] fatal', e);
    return err((e as Error).message || 'Internal error', 500);
  }
});

// ------------- helpers -------------
function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function err(m: string, s: number): Response { return json({ ok: false, error: m }, s); }

interface ParsedRow { raw: Record<string, string>; lineNumber: number; }
interface ParsedCsv { headers: string[]; rows: ParsedRow[]; }

function parseCsv(content: string, delim: string): ParsedCsv {
  const lines: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      if (inQ && content[i + 1] === '"') { cur += '"'; i++; continue; }
      inQ = !inQ; continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQ) {
      lines.push(cur); cur = '';
      if (ch === '\r' && content[i + 1] === '\n') i++;
      continue;
    }
    cur += ch;
  }
  if (cur.length > 0) lines.push(cur);
  if (!lines.length) return { headers: [], rows: [] };

  const headers = splitRow(lines[0], delim).map((h) => h.trim());
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = splitRow(lines[i], delim);
    const raw: Record<string, string> = {};
    headers.forEach((h, j) => { raw[h] = (cells[j] ?? '').trim(); });
    rows.push({ raw, lineNumber: i + 1 });
  }
  return { headers, rows };
}

function splitRow(line: string, delim: string): string[] {
  const out: string[] = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; continue; }
      inQ = !inQ; continue;
    }
    if (ch === delim && !inQ) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function keyOf(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function pick(raw: Record<string, string>, ...names: string[]): string {
  const map: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) map[keyOf(k)] = v;
  for (const n of names) {
    const v = map[keyOf(n)];
    if (v !== undefined && v !== '') return v;
  }
  return '';
}

interface ValidRow {
  item_id: string; section: string; level: string; skill: string;
  question_type: string; question_text: string; options: unknown[];
  correct_answer: string; points: number; difficulty: number | null;
  tags: string[]; audio_url: string; image_url: string; explanation: string;
  active: boolean;
}

function validate(parsed: ParsedCsv) {
  const total = parsed.rows.length;
  const errors: Array<{ line: number; item_id?: string; message: string }> = [];
  const duplicates: Array<{ line: number; item_id: string; firstSeenLine: number }> = [];
  const emptyFields: Array<{ line: number; item_id?: string; missing: string[] }> = [];
  const conversionErrors: Array<{ line: number; item_id?: string; field: string; message: string }> = [];
  const validRows: ValidRow[] = [];
  const seen = new Map<string, number>();

  for (const row of parsed.rows) {
    const raw = row.raw;
    const item_id = pick(raw, 'item_id', 'itemid', 'id');
    const question_text = pick(raw, 'question_text', 'question', 'text', 'prompt');

    const missing: string[] = [];
    if (!item_id) missing.push('item_id');
    if (!question_text) missing.push('question_text');
    if (missing.length) {
      emptyFields.push({ line: row.lineNumber, item_id: item_id || undefined, missing });
      errors.push({
        line: row.lineNumber, item_id: item_id || undefined,
        message: `Missing required: ${missing.join(', ')}`,
      });
      continue;
    }

    if (seen.has(item_id)) {
      duplicates.push({ line: row.lineNumber, item_id, firstSeenLine: seen.get(item_id)! });
      errors.push({
        line: row.lineNumber, item_id,
        message: `Duplicate item_id (first at line ${seen.get(item_id)})`,
      });
      continue;
    }
    seen.set(item_id, row.lineNumber);

    // options: JSON array or pipe-separated
    let options: unknown[] = [];
    const optRaw = pick(raw, 'options', 'choices', 'answers');
    if (optRaw) {
      try {
        const p = JSON.parse(optRaw);
        options = Array.isArray(p) ? p : [p];
      } catch {
        options = optRaw.split('|').map((s) => s.trim()).filter(Boolean);
      }
    }

    const tagsRaw = pick(raw, 'tags', 'keywords');
    const tags = tagsRaw
      ? tagsRaw.split(/[|,;]/).map((s) => s.trim()).filter(Boolean)
      : [];

    const pointsRaw = pick(raw, 'points', 'weight');
    const pointsN = pointsRaw ? Number(pointsRaw) : 1;
    if (pointsRaw && !Number.isFinite(pointsN)) {
      conversionErrors.push({ line: row.lineNumber, item_id, field: 'points', message: `Invalid number: "${pointsRaw}"` });
    }
    const difficultyRaw = pick(raw, 'difficulty', 'level_num');
    const difficulty = difficultyRaw ? Number(difficultyRaw) : null;
    if (difficultyRaw && (difficulty === null || !Number.isFinite(difficulty))) {
      conversionErrors.push({ line: row.lineNumber, item_id, field: 'difficulty', message: `Invalid number: "${difficultyRaw}"` });
    }
    const activeRaw = (pick(raw, 'active', 'enabled') || 'true').toLowerCase();
    const active = ['true', '1', 'yes', 'si', 'sí', 'y'].includes(activeRaw);

    validRows.push({
      item_id,
      section: pick(raw, 'section', 'category', 'skill_area'),
      level: pick(raw, 'level', 'cefr', 'grade'),
      skill: pick(raw, 'skill', 'subskill'),
      question_type: pick(raw, 'question_type', 'type') || 'multiple_choice',
      question_text,
      options,
      correct_answer: pick(raw, 'correct_answer', 'correct', 'answer', 'key'),
      points: Number.isFinite(pointsN) ? pointsN : 1,
      difficulty: difficulty !== null && Number.isFinite(difficulty) ? difficulty : null,
      tags,
      audio_url: pick(raw, 'audio_url', 'audio'),
      image_url: pick(raw, 'image_url', 'image'),
      explanation: pick(raw, 'explanation', 'rationale', 'notes'),
      active,
    });
  }

  return { total, uniqueItemIds: seen.size, errors, duplicates, emptyFields, conversionErrors, validRows };
}
