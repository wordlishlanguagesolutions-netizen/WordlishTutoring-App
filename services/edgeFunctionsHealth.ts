import { getSupabaseClient } from '@/template';

// ============================================================================
// edgeFunctionsHealth · Verificacion de despliegue de Edge Functions.
//
// Envia un ping intencionalmente invalido a cada function (payload sin
// los campos requeridos) para confirmar que la function esta desplegada
// y responde. Cualquier codigo HTTP (400, 401, 403, 500, etc.) indica
// que la function existe; solo un fetch error o 404 significa que no
// esta desplegada.
//
// GARANTIA NO DESTRUCTIVA:
//   · create-staff-user       → payload sin email → falla en validacion
//                               'invalid_email' ANTES de invocar
//                               auth.admin.createUser.
//   · send-push               → payload sin userId/title/body → falla en
//                               'missing_fields' ANTES de leer push_tokens
//                               o llamar a Expo Push API.
//   · generate-global-report  → payload sin studentId → falla en
//                               'missing_student' ANTES de consultar
//                               reports o llamar a la IA.
//
// Ninguno de estos pings crea, envia, actualiza o elimina registros.
// ============================================================================

export type EdgeFunctionId =
  | 'create-staff-user'
  | 'send-push'
  | 'generate-global-report';

export type EdgeFunctionStatus =
  | 'healthy'       // Desplegada y responde (2xx o 4xx/5xx que no sean 401/403/404).
  | 'unauthorized'  // Responde pero rechaza el JWT (401/403).
  | 'not_deployed'  // 404 o mensaje de "not found".
  | 'error';        // Fetch error, timeout u otro problema de red.

export interface EdgeFunctionHealth {
  id: EdgeFunctionId;
  label: string;
  status: EdgeFunctionStatus;
  latencyMs: number | null;
  httpStatus?: number;
  message?: string;
}

const LABELS: Record<EdgeFunctionId, string> = {
  'create-staff-user': 'Alta de staff',
  'send-push': 'Push notifications',
  'generate-global-report': 'Reporte global IA',
};

// Payloads garantizados no destructivos: cada function los rechaza con 400
// en la validacion mas temprana, sin efectos secundarios en Cloud.
const PING_PAYLOADS: Record<EdgeFunctionId, Record<string, unknown>> = {
  'create-staff-user': { action: 'diagnostic_ping' },
  'send-push': { diagnostic: true },
  'generate-global-report': { diagnostic: true },
};

async function pingOne(id: EdgeFunctionId): Promise<EdgeFunctionHealth> {
  const supabase = getSupabaseClient();
  const start = Date.now();
  try {
    const { data, error } = await supabase.functions.invoke(id, {
      body: PING_PAYLOADS[id],
    });
    const latencyMs = Date.now() - start;

    if (error) {
      const anyErr = error as any;
      const name = anyErr?.name || '';
      const ctx = anyErr?.context;
      const httpStatus: number | undefined =
        typeof ctx?.status === 'number' ? ctx.status : undefined;

      // FunctionsHttpError → la function respondio con non-2xx. Aunque no
      // sea 2xx, cualquier respuesta HTTP confirma que la function esta
      // desplegada y respondio al invoke.
      if (name === 'FunctionsHttpError' || typeof httpStatus === 'number') {
        let bodyText = '';
        try {
          if (typeof ctx?.text === 'function') {
            bodyText = (await ctx.text()) ?? '';
          }
        } catch {
          bodyText = '';
        }
        const detail = shortDetail(bodyText);

        if (httpStatus === 404) {
          return {
            id,
            label: LABELS[id],
            status: 'not_deployed',
            latencyMs,
            httpStatus,
            message: detail || 'Funcion no encontrada. Revisa el deploy.',
          };
        }
        if (httpStatus === 401 || httpStatus === 403) {
          return {
            id,
            label: LABELS[id],
            status: 'unauthorized',
            latencyMs,
            httpStatus,
            message: detail || 'La funcion responde pero rechaza tu sesion.',
          };
        }
        // 400/405/500/etc → function alive y validacion esperada.
        return {
          id,
          label: LABELS[id],
          status: 'healthy',
          latencyMs,
          httpStatus,
          message: detail || `HTTP ${httpStatus} · validacion esperada`,
        };
      }

      // FunctionsFetchError / red / DNS → probablemente no desplegada.
      const msg = anyErr?.message || 'Error de red al invocar la funcion.';
      const looksLikeMissing = /not found|404|no such function|failed to fetch|networkerror/i.test(
        msg,
      );
      return {
        id,
        label: LABELS[id],
        status: looksLikeMissing ? 'not_deployed' : 'error',
        latencyMs,
        message: msg,
      };
    }

    // 200 OK inesperado (por ejemplo si en el futuro se agrega un modo
    // diagnostico) tambien es healthy.
    return {
      id,
      label: LABELS[id],
      status: 'healthy',
      latencyMs,
      httpStatus: 200,
      message:
        typeof data === 'object' && data !== null
          ? '2xx ok'
          : String(data ?? '').slice(0, 80),
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      id,
      label: LABELS[id],
      status: 'error',
      latencyMs,
      message: err?.message || 'Excepcion inesperada al invocar la funcion.',
    };
  }
}

export async function pingAllEdgeFunctions(): Promise<EdgeFunctionHealth[]> {
  const ids: EdgeFunctionId[] = [
    'create-staff-user',
    'send-push',
    'generate-global-report',
  ];
  // Pings en paralelo. Cada function suele responder en <500 ms.
  return Promise.all(ids.map(pingOne));
}

function shortDetail(text: string): string {
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    const err = parsed?.error || parsed?.message;
    if (err) return String(err).slice(0, 90);
  } catch {
    // no-op: texto plano.
  }
  return text.slice(0, 90);
}
