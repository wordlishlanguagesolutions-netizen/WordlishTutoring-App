// ============================================================================
// Edge Function · send-push
//
// Recibe:
//   { userId: string, type: string, title: string, body: string,
//     data?: Record<string, unknown> }
//
// Flujo:
//   1. Valida que el caller esta autenticado (evita abuso con anon key).
//   2. Con service role, lee todos los tokens del `userId` destinatario
//      cuya `platform = 'android'` (V1: solo Android; iOS/APNs deshabilitado).
//   3. Despacha via Expo Push API (https://exp.host/--/api/v2/push/send).
//   4. Limpia tokens marcados como DeviceNotRegistered / InvalidCredentials.
//
// No firma iOS ni Web. No envia email/whatsapp. Solo Android via FCM V1.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface PushRequestBody {
  userId?: string;
  type?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  channelId: string;
  priority: 'high';
  sound: 'default';
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

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
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Verifica que el caller es un usuario autenticado (bloquea abuso).
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user: caller },
      error: userError,
    } = await authClient.auth.getUser(token);
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await req.json().catch(() => ({}))) as PushRequestBody;
    const { userId, title, body, data } = payload;
    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'missing_fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Service role para leer tokens de otros usuarios y limpiar invalidos.
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: tokens, error: tokErr } = await admin
      .from('push_tokens')
      .select('id, token')
      .eq('user_id', userId)
      .eq('platform', 'android');
    if (tokErr) {
      return new Response(
        JSON.stringify({ error: 'db_error', detail: tokErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const list = (tokens ?? []) as Array<{ id: string; token: string }>;
    if (list.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, cleaned: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const messages: ExpoPushMessage[] = list.map((row) => ({
      to: row.token,
      title,
      body,
      data: data ?? {},
      channelId: 'default',
      priority: 'high',
      sound: 'default',
    }));

    let sent = 0;
    let cleaned = 0;
    const invalidTokens: string[] = [];

    // Expo acepta hasta 100 mensajes por request. Con pilotos pequenos
    // enviamos todo en un solo POST.
    try {
      const resp = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      const json = await resp.json().catch(() => null);
      const tickets: ExpoPushTicket[] = Array.isArray(json?.data)
        ? (json.data as ExpoPushTicket[])
        : [];
      tickets.forEach((t, idx) => {
        if (t.status === 'ok') {
          sent += 1;
          return;
        }
        const err = t.details?.error;
        if (
          err === 'DeviceNotRegistered' ||
          err === 'InvalidCredentials' ||
          err === 'MessageTooBig' ||
          err === 'MismatchSenderId'
        ) {
          const bad = list[idx]?.token;
          if (bad) invalidTokens.push(bad);
        }
      });
    } catch (err) {
      console.warn('[send-push] Expo fetch error', err);
    }

    if (invalidTokens.length > 0) {
      const { error: delErr } = await admin
        .from('push_tokens')
        .delete()
        .in('token', invalidTokens);
      if (!delErr) cleaned = invalidTokens.length;
    }

    return new Response(
      JSON.stringify({ ok: true, sent, cleaned }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'internal', detail: err?.message ?? 'unknown' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
