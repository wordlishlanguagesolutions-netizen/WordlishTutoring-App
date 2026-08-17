import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, radius } from '@/constants/theme';
import {
  checkCloudIntegrity,
  type IntegrityResult,
  type IntegrityStatus,
  type IntegrityMetric,
} from '@/services/cloudIntegrityService';

// ============================================================================
// Admin · Bloque de integridad Cloud.
//
// Consulta live conteos de las tablas core (13 metricas) y marca cada una en
// verde/amarillo/rojo. Auto-check al montar y refresh manual. No modifica
// datos.
//
// Ubicacion: Admin > Ajustes > Integridad Cloud (bajo ReadinessBanner).
// ============================================================================

type State =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ready'; result: IntegrityResult };

function statusColor(s: IntegrityStatus): string {
  if (s === 'ok') return colors.success;
  if (s === 'warning') return colors.warning;
  return colors.danger;
}
function statusBg(s: IntegrityStatus): string {
  if (s === 'ok') return colors.successSoft;
  if (s === 'warning') return colors.warningSoft;
  return colors.dangerSoft;
}
function statusIcon(s: IntegrityStatus): string {
  if (s === 'ok') return 'checkmark-circle';
  if (s === 'warning') return 'alert-circle';
  return 'close-circle';
}
function formatAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function CloudIntegrityBlock() {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const runCheck = useCallback(async () => {
    setState({ kind: 'checking' });
    const result = await checkCloudIntegrity();
    setState({ kind: 'ready', result });
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const checking = state.kind === 'checking';

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Ionicons name="server-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.title}>Snapshot Cloud</Text>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={runCheck}
          disabled={checking}
          hitSlop={8}
          style={({ pressed }) => [
            styles.refreshBtn,
            (pressed || checking) && { opacity: 0.6 },
          ]}
        >
          {checking ? (
            <ActivityIndicator size="small" color={colors.primaryDark} />
          ) : (
            <Ionicons name="refresh" size={14} color={colors.primaryDark} />
          )}
          <Text style={styles.refreshText}>
            {checking ? 'Actualizando' : 'Refrescar'}
          </Text>
        </Pressable>
      </View>

      {state.kind === 'ready' && state.result.ok ? (
        <>
          {state.result.hasBlockers ? (
            <View style={styles.blockerBanner}>
              <Ionicons name="warning" size={14} color={colors.danger} />
              <Text style={styles.blockerText}>
                Bloqueos detectados. Resuelve los items en rojo antes de invitar
                testers.
              </Text>
            </View>
          ) : (
            <View style={styles.okBanner}>
              <Ionicons name="checkmark-done" size={14} color={colors.success} />
              <Text style={styles.okText}>
                Backend sin bloqueos. Prerequisitos criticos cubiertos.
              </Text>
            </View>
          )}

          <View style={styles.grid}>
            {state.result.metrics.map((m) => (
              <MetricCard key={m.key} metric={m} />
            ))}
          </View>

          <Text style={styles.meta}>Verificado: {formatAt(state.result.at)}</Text>
        </>
      ) : state.kind === 'ready' && !state.result.ok ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>No se pudo consultar Cloud</Text>
            <Text style={styles.errorDesc}>
              {state.result.error ?? 'Error desconocido'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Consultando backend...</Text>
        </View>
      )}
    </View>
  );
}

function MetricCard({ metric }: { metric: IntegrityMetric }) {
  const color = statusColor(metric.status);
  const bg = statusBg(metric.status);
  const icon = statusIcon(metric.status);
  const isUnknown = metric.count < 0;

  return (
    <View style={[styles.metricCard, { borderColor: color }]}>
      <View style={styles.metricHead}>
        <View style={[styles.metricIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={14} color={color} />
        </View>
        <Text style={styles.metricLabel} numberOfLines={1}>
          {metric.label}
        </Text>
      </View>
      <Text style={[styles.metricCount, { color }]}>
        {isUnknown ? '—' : metric.count}
      </Text>
      {metric.hint ? (
        <Text style={styles.metricHint} numberOfLines={2}>
          {metric.hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontWeight: '700', fontSize: 14 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  refreshText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },

  blockerBanner: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  blockerText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
  okBanner: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
  },
  okText: {
    flex: 1,
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    width: '48%',
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: colors.surface,
    gap: 4,
  },
  metricHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricIcon: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricCount: {
    fontSize: 22,
    fontWeight: '800',
  },
  metricHint: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 13,
  },

  meta: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'right',
  },

  errorBox: {
    flexDirection: 'row',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  errorDesc: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
    lineHeight: 16,
  },

  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: { fontSize: 12, color: colors.textSubtle },
});
