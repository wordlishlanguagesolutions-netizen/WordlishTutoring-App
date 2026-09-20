import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

// ============================================================================
// Herramienta temporal · Dry Run del banco de preguntas.
// - Usa el JWT de la sesión actual (lo maneja el cliente de Supabase).
// - Nunca se lee, muestra, copia ni guarda el JWT en el frontend.
// - service_role sólo vive en la Edge Function (no se expone aquí).
// - Sólo dry_run: true. No hay botón de importación definitiva.
// ============================================================================

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmW69K9OuXFGVAETg5Wy-OVrHhaui6rin2X0C6S2dEAgBKesBypwlebMpDo33h3w/pub?output=csv';

type Stats = {
  totalCount: number;
  uniqueItemIds: number;
  duplicateCount: number;
  rejectedCount: number;
  emptyRequiredFields: number;
  conversionErrorsCount: number;
  firstItem: string | null;
  lastItem: string | null;
  firstRow: Record<string, unknown> | null;
  lastRow: Record<string, unknown> | null;
  errors: Array<{ line: number; item_id?: string; message: string }>;
  duplicates: Array<{ line: number; item_id: string; firstSeenLine: number }>;
  emptyFields: Array<{ line: number; item_id?: string; missing: string[] }>;
  conversionErrors: Array<{ line: number; item_id?: string; field: string; message: string }>;
};

export default function DiagnosticImport() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [runAt, setRunAt] = useState<string | null>(null);

  const runDryRun = async () => {
    setLoading(true);
    setError(null);
    setStats(null);
    setRunAt(new Date().toLocaleTimeString('es-PA'));
    try {
      const supabase = getSupabaseClient();

      // 1) Obtener la sesión actual del proyecto sgrughlymzihochvsgru.
      //    Jamás leemos, mostramos, copiamos ni guardamos el access_token.
      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();
      if (sessionErr) {
        setError('Sesión no disponible');
        return;
      }
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        setError('Sesión no disponible');
        return;
      }

      // 2) Invocar con Authorization: Bearer session.access_token explícito.
      //    Con esto la Edge Function siempre recibe el token del usuario,
      //    nunca la anon key. El token viaja sólo como header.
      const { data, error: fnErr } = await supabase.functions.invoke(
        'import-diagnostic-questions',
        {
          body: {
            dry_run: true,
            csv_url: CSV_URL,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (fnErr) {
        let msg = fnErr.message;
        if (fnErr instanceof FunctionsHttpError) {
          try {
            const status = fnErr.context?.status ?? 500;
            const text = await fnErr.context?.text();
            msg = `[${status}] ${text || fnErr.message}`;
          } catch {
            msg = `${fnErr.message || 'Error de respuesta'}`;
          }
        }
        setError(msg);
        return;
      }

      if (!data || data.ok !== true) {
        setError(data?.error || 'La Edge Function respondió sin ok.');
        return;
      }

      const s = data.stats ?? {};
      setStats({
        totalCount: Number(s.totalCount ?? s.total ?? 0),
        uniqueItemIds: Number(s.uniqueItemIds ?? 0),
        duplicateCount: Number(s.duplicateCount ?? s.duplicatesCount ?? 0),
        rejectedCount: Number(s.rejectedCount ?? 0),
        emptyRequiredFields: Number(s.emptyRequiredFields ?? s.emptyFieldsCount ?? 0),
        conversionErrorsCount: Number(s.conversionErrorsCount ?? 0),
        firstItem: s.firstItem ?? null,
        lastItem: s.lastItem ?? null,
        firstRow: s.firstRow ?? null,
        lastRow: s.lastRow ?? null,
        errors: Array.isArray(s.errors) ? s.errors : [],
        duplicates: Array.isArray(s.duplicates) ? s.duplicates : [],
        emptyFields: Array.isArray(s.emptyFields) ? s.emptyFields : [],
        conversionErrors: Array.isArray(s.conversionErrors) ? s.conversionErrors : [],
      });
    } catch (e) {
      setError((e as Error)?.message ?? 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header
        title="Dry Run"
        subtitle="Banco de preguntas · herramienta temporal"
      />

      <View style={styles.noteBox}>
        <Ionicons name="information-circle" size={16} color={colors.info} />
        <Text style={styles.noteText}>
          Sólo lectura. No se insertará ninguna fila. La importación definitiva
          se habilitará después de tu confirmación.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Origen (CSV público)</Text>
        <Text style={styles.fieldValue} numberOfLines={3}>{CSV_URL}</Text>

        <Text style={styles.fieldLabel}>Parámetros</Text>
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>dry_run: true</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>role: admin | supervisor</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>auth: sesión actual</Text>
          </View>
        </View>

        <Pressable
          onPress={runDryRun}
          disabled={loading}
          style={({ pressed }) => [
            styles.runBtn,
            loading && { opacity: 0.6 },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Ionicons
            name={loading ? 'hourglass' : 'play'}
            size={16}
            color={colors.textOnPrimary}
          />
          <Text style={styles.runBtnText}>
            {loading ? 'Ejecutando Dry Run…' : 'Ejecutar Dry Run'}
          </Text>
        </Pressable>

        {runAt ? (
          <Text style={styles.runAt}>Última ejecución {runAt}</Text>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {stats ? (
        <>
          <Text style={styles.section}>Resumen</Text>
          <View style={styles.grid}>
            <Metric label="totalCount" value={stats.totalCount} />
            <Metric label="uniqueItemIds" value={stats.uniqueItemIds} />
            <Metric
              label="duplicateCount"
              value={stats.duplicateCount}
              tone={stats.duplicateCount > 0 ? 'warning' : 'success'}
            />
            <Metric
              label="rejectedCount"
              value={stats.rejectedCount}
              tone={stats.rejectedCount > 0 ? 'danger' : 'success'}
            />
            <Metric
              label="emptyRequiredFields"
              value={stats.emptyRequiredFields}
              tone={stats.emptyRequiredFields > 0 ? 'danger' : 'success'}
            />
            <Metric
              label="conversionErrorsCount"
              value={stats.conversionErrorsCount}
              tone={stats.conversionErrorsCount > 0 ? 'warning' : 'success'}
            />
          </View>

          <Text style={styles.section}>Primera y última pregunta</Text>
          <View style={styles.pairRow}>
            <View style={styles.pairCol}>
              <Text style={styles.pairLabel}>firstItem</Text>
              <Text style={styles.pairValue}>{stats.firstItem ?? '—'}</Text>
            </View>
            <View style={styles.pairCol}>
              <Text style={styles.pairLabel}>lastItem</Text>
              <Text style={styles.pairValue}>{stats.lastItem ?? '—'}</Text>
            </View>
          </View>

          <Text style={styles.section}>firstRow</Text>
          <RowPreview row={stats.firstRow} />

          <Text style={styles.section}>lastRow</Text>
          <RowPreview row={stats.lastRow} />

          {stats.duplicates.length > 0 ? (
            <>
              <Text style={styles.section}>
                Duplicados ({stats.duplicates.length})
              </Text>
              <View style={styles.list}>
                {stats.duplicates.slice(0, 20).map((d, i) => (
                  <Text key={i} style={styles.listItem} numberOfLines={2}>
                    · línea {d.line} · {d.item_id} · duplicado de línea {d.firstSeenLine}
                  </Text>
                ))}
              </View>
            </>
          ) : null}

          {stats.emptyFields.length > 0 ? (
            <>
              <Text style={styles.section}>
                Campos obligatorios vacíos ({stats.emptyFields.length})
              </Text>
              <View style={styles.list}>
                {stats.emptyFields.slice(0, 20).map((e, i) => (
                  <Text key={i} style={styles.listItem} numberOfLines={2}>
                    · línea {e.line}
                    {e.item_id ? ` · ${e.item_id}` : ''} · faltan{' '}
                    {(e.missing ?? []).join(', ')}
                  </Text>
                ))}
              </View>
            </>
          ) : null}

          {stats.conversionErrors.length > 0 ? (
            <>
              <Text style={styles.section}>
                Errores de conversión ({stats.conversionErrors.length})
              </Text>
              <View style={styles.list}>
                {stats.conversionErrors.slice(0, 20).map((e, i) => (
                  <Text key={i} style={styles.listItem} numberOfLines={2}>
                    · línea {e.line}
                    {e.item_id ? ` · ${e.item_id}` : ''} · {e.field}: {e.message}
                  </Text>
                ))}
              </View>
            </>
          ) : null}

          {stats.errors.length > 0 ? (
            <>
              <Text style={styles.section}>
                Errores por línea ({stats.errors.length})
              </Text>
              <View style={styles.list}>
                {stats.errors.slice(0, 20).map((e, i) => (
                  <Text key={i} style={styles.listItem} numberOfLines={2}>
                    · línea {e.line}
                    {e.item_id ? ` · ${e.item_id}` : ''} · {e.message}
                  </Text>
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const TONES = {
    neutral: { bg: colors.surface, fg: colors.text, border: colors.border },
    success: { bg: colors.successSoft, fg: colors.success, border: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning, border: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.danger },
  };
  const t = TONES[tone];
  return (
    <View style={[styles.metric, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[styles.metricValue, { color: t.fg }]}>{value}</Text>
      <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function RowPreview({ row }: { row: Record<string, unknown> | null }) {
  if (!row) {
    return (
      <View style={styles.rowEmpty}>
        <Text style={typography.caption}>Sin fila para mostrar.</Text>
      </View>
    );
  }
  const entries = Object.entries(row).slice(0, 12);
  return (
    <View style={styles.rowBox}>
      {entries.map(([k, v]) => (
        <View key={k} style={styles.rowLine}>
          <Text style={styles.rowKey} numberOfLines={1}>{k}</Text>
          <Text style={styles.rowValue} numberOfLines={4}>
            {formatValue(v)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v.length > 0 ? v : '—';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

const styles = StyleSheet.create({
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.infoSoft,
    borderWidth: 1,
    borderColor: colors.info,
    marginBottom: spacing.lg,
  },
  noteText: { flex: 1, fontSize: 12, color: colors.info, fontWeight: '600' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  fieldValue: { fontSize: 12, color: colors.textSubtle, fontWeight: '500' },
  chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 11, fontWeight: '700', color: colors.textSubtle },

  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  runBtnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 14 },
  runAt: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    marginBottom: spacing.lg,
  },
  errorText: { flex: 1, fontSize: 13, color: colors.danger, fontWeight: '600' },

  section: {
    ...typography.h3,
    fontSize: 15,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    flexBasis: '31%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  metricValue: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  pairRow: { flexDirection: 'row', gap: spacing.sm },
  pairCol: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pairLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pairValue: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4 },

  rowBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 2,
  },
  rowEmpty: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowLine: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowKey: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rowValue: { fontSize: 12, color: colors.text, fontWeight: '500', marginTop: 2 },

  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
  },
  listItem: { fontSize: 11, color: colors.textSubtle, fontWeight: '500' },
});
