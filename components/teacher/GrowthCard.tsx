import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadow } from '@/constants/theme';
import {
  GROWTH_INDICATORS,
  GROWTH_PROGRAM,
  SPECIAL_THRESHOLD,
  growthAverage,
  TeacherLevel,
} from '@/constants/teacherCulture';

// ============================================================================
// GrowthCard · progreso positivo hacia Special.
// No es una calificación. Es un objetivo motivador. Muestra un porcentaje
// promedio, cuatro indicadores discretos y un mensaje cálido cuando el
// profesor mantiene indicadores altos. Nunca amenaza, nunca advierte.
// ============================================================================

interface Props {
  currentLevel: TeacherLevel;
}

export function GrowthCard({ currentLevel }: Props) {
  const router = useRouter();
  const avg = growthAverage(GROWTH_INDICATORS);
  const isSpecial = currentLevel === 'special';
  const target = GROWTH_PROGRAM.special;

  const heroTitle = isSpecial
    ? 'Estás en el nivel Special'
    : 'Tu camino a Special';
  const heroSubtitle = isSpecial
    ? 'Gracias por sostener este nivel.'
    : avg >= SPECIAL_THRESHOLD
      ? 'Tu constancia te acerca cada semana.'
      : 'Cada clase suma a tu crecimiento.';

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={styles.badge}>
          <Ionicons name="star" size={12} color={colors.primaryDark} />
          <Text style={styles.badgeText}>
            {GROWTH_PROGRAM[currentLevel].name}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/teacher/standards' as any)}
          hitSlop={8}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.link}>Ver más</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{heroTitle}</Text>
      <Text style={styles.subtitle}>{heroSubtitle}</Text>

      {/* Barra de progreso hacia Special */}
      {!isSpecial ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, avg)}%` },
              ]}
            />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressLabel}>{avg}% de progreso</Text>
            <Text style={styles.progressTarget}>
              Meta {SPECIAL_THRESHOLD}% · {target.name}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Indicadores positivos */}
      <View style={styles.indicators}>
        {GROWTH_INDICATORS.map((ind) => (
          <View key={ind.id} style={styles.indicator}>
            <View style={styles.indicatorIcon}>
              <Ionicons
                name={ind.icon as any}
                size={14}
                color={colors.primaryDark}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.indicatorLabel}>{ind.label}</Text>
              <Text style={styles.indicatorHint} numberOfLines={1}>
                {ind.hint}
              </Text>
            </View>
            <Text style={styles.indicatorValue}>{ind.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    ...shadow.sm,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
  },
  link: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSubtle,
    marginTop: 2,
    fontWeight: '500',
  },
  progressWrap: {
    marginTop: spacing.md,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  progressTarget: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  indicators: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  indicatorIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  indicatorHint: {
    fontSize: 11,
    color: colors.textSubtle,
    marginTop: 1,
    fontWeight: '500',
  },
  indicatorValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
