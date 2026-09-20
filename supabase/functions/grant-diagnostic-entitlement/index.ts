// =============================================================================
// grant-diagnostic-entitlement
// -----------------------------------------------------------------------------
// Purpose:
//   Receives inbound calls from the external Cuanto backend
//   (stvgbllymjrfiyalstvg) whenever `activate-cuanto-payment` confirms a paid
//   diagnostic session. Verifies a shared inbound secret, then upserts the
//   entitlement into `public.diagnostic_entitlements` using the service role
//   client, so the frontend never sees service_role nor secret values.
//
// Security:
//   - Requires header `X-Cuanto-Secret: <CUANTO_INBOUND_SECRET>`.
//     (Also accepts `Authorization: Bearer <secret>` for convenience.)
//   - CUANTO_INBOUND_SECRET must be configured in this project's Edge Function
//     secrets. The Cuanto side sends the same value.
//   - Never logs the secret. Never returns it in responses.
//
// Contract (JSON body from Cuanto):
//   {
//     "email": "student@example.com",         // required, normalized lowercase
//     "session_id": "cuanto-sess-xxxxx",      // maps to session_key in DB
//     "payment_reference": "PAY-2026-000123", // required, unique
//     "amount": 25.00,                        // required, >= 0
//     "discount": 5.00,                       // optional, defaults to 0
//     "status": "paid",                       // paid | pending | failed | refunded
//     "currency": "USD",                      // optional, defaults to USD
//     "expires_at": "2027-09-20T00:00:00Z"    // optional
//   }
//
// Response:
//   200 { ok: true, entitlement: { id, email, payment_reference, status, granted_at } }
//   4xx { ok: false, error: "..." }
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cuanto-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405);
  }

  try {
    // ---- 1) Verify shared inbound secret ----
    const inboundSecret = Deno.env.get('CUANTO_INBOUND_SECRET') ?? '';
    if (!inboundSecret) {
      console.error('[grant-diagnostic-entitlement] CUANTO_INBOUND_SECRET is not configured');
      return jsonError('Server not configured (missing CUANTO_INBOUND_SECRET)', 500);
    }

    const headerSecret =
      req.headers.get('x-cuanto-secret') ??
      req.headers.get('X-Cuanto-Secret') ??
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
      '';

    if (!constantTimeEqual(headerSecret, inboundSecret)) {
      console.warn('[grant-diagnostic-entitlement] Unauthorized inbound call');
      return jsonError('Unauthorized', 401);
    }

    // ---- 2) Parse and validate body ----
    let body: Record<string, unknown> | null = null;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return jsonError('Invalid JSON body', 400);
    }
    if (!body || typeof body !== 'object') {
      return jsonError('Invalid JSON body', 400);
    }

    const email = String(body.email ?? '').trim().toLowerCase();
    const sessionKey = body.session_id ? String(body.session_id).trim() : null;
    const paymentReference = body.payment_reference
      ? String(body.payment_reference).trim()
      : '';
    const amountRaw = body.amount;
    const discountRaw = body.discount ?? 0;
    const statusRaw = String(body.status ?? 'paid').trim().toLowerCase();
    const currency = String(body.currency ?? 'USD').trim().toUpperCase();
    const expiresAtRaw = body.expires_at ? String(body.expires_at) : null;

    if (!email || !email.includes('@')) return jsonError('email is required and must be valid', 400);
    if (!paymentReference) return jsonError('payment_reference is required', 400);

    const amount = Number(amountRaw);
    const discount = Number(discountRaw);
    if (!Number.isFinite(amount) || amount < 0) return jsonError('invalid amount', 400);
    if (!Number.isFinite(discount) || discount < 0) return jsonError('invalid discount', 400);

    const allowedStatus = new Set(['paid', 'pending', 'failed', 'refunded']);
    if (!allowedStatus.has(statusRaw)) {
      return jsonError(`invalid status "${statusRaw}"`, 400);
    }

    let expiresAt: string | null = null;
    if (expiresAtRaw) {
      const d = new Date(expiresAtRaw);
      if (Number.isNaN(d.getTime())) return jsonError('invalid expires_at', 400);
      expiresAt = d.toISOString();
    }

    // ---- 3) Upsert entitlement with service role ----
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const grantedAt = statusRaw === 'paid' ? new Date().toISOString() : null;
    const nowIso = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('diagnostic_entitlements')
      .upsert(
        {
          email,
          session_key: sessionKey,
          payment_reference: paymentReference,
          amount,
          discount,
          currency,
          status: statusRaw,
          source: 'cuanto',
          granted_at: grantedAt,
          expires_at: expiresAt,
          meta: {
            received_at: nowIso,
            raw: sanitize(body),
          },
          updated_at: nowIso,
        },
        { onConflict: 'payment_reference' },
      )
      .select('id, email, payment_reference, session_key, status, granted_at, expires_at')
      .single();

    if (error) {
      console.error('[grant-diagnostic-entitlement] Upsert failed', {
        message: error.message,
        code: (error as any).code,
      });
      return jsonError(`DB: ${error.message}`, 500);
    }

    console.log('[grant-diagnostic-entitlement] Entitlement upserted', {
      id: data?.id,
      status: data?.status,
      email_masked: maskEmail(email),
    });

    return json({ ok: true, entitlement: data });
  } catch (err) {
    console.error('[grant-diagnostic-entitlement] Fatal', err);
    return jsonError((err as Error).message || 'Internal error', 500);
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonError(message: string, status: number): Response {
  return json({ ok: false, error: message }, status);
}

// Constant time string comparison to avoid timing leaks.
function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Removes secrets from raw body before storing in meta.
function sanitize(input: Record<string, unknown>): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...input };
  const forbidden = ['secret', 'token', 'password', 'api_key', 'apikey', 'authorization'];
  for (const k of Object.keys(clone)) {
    if (forbidden.some((f) => k.toLowerCase().includes(f))) {
      clone[k] = '[REDACTED]';
    }
  }
  return clone;
}

function maskEmail(e: string): string {
  const at = e.indexOf('@');
  if (at <= 1) return '***';
  return `${e.slice(0, 2)}***${e.slice(at)}`;
}
