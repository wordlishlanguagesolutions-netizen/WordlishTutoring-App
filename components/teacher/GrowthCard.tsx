import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadow } from '@/constants/theme';
import {
  GROWTH_INDICATORS,
  GROWTH_PROGRAM,
  SPECIAL_THRESHOLD,
  encouragementFor,
  growthAverage,
  TeacherLevel,
} from '@/constants/teacherCulture';

// ============================================================================
// GrowthCard · "Tu camino a Special".
// Tarjeta compacta con nivel actual, progreso positivo y cinco indicadores.
// Los textos son de una sola línea, máximo 8 palabras. Nunca amenaza, nunca
// advierte. Sólo motiva y reconoce.
// ============================================================================

interface Props {
  currentLevel: TeacherLevel;
}

export function GrowthCard({ currentLevel }: Props) {
  const router = useRouter();
  const avg = growthAverage(GROWTH_INDICATORS);
  const isSpecial = currentLevel === 'special';

  const heroTitle = isSpecial
    ? 'Estás en el nivel Special'
    : 'Tu camino a Special';
  const heroSubtitle = isSpecial
    ? 'Gracias por sostener este nivel.'
    : encouragementFor(avg);

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={styles.badge}>
          <Ionicons name="star" size={9} color={colors.primaryDark} />
          <Text style={styles.badgeText}>
            {GROWTH_PROGRAM[currentLevel].name}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/teacher/standards' as any)}
          hitSlop={8}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.link}>Guía</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{heroTitle}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {heroSubtitle}
      </Text>

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
          <Text style={styles.progressLabel}>{avg}%</Text>
        </View>
      ) : null}

      <View style={styles.indicators}>
        {GROWTH_INDICATORS.map((ind) => (
          <View key={ind.id} style={styles.indicator}>
            <Ionicons
              name={ind.icon as any}
              size={11}
              color={colors.primaryDark}
            />
            <Text style={styles.indicatorLabel} numberOfLines={1}>
              {ind.label}
            </Text>
            <View style={styles.indicatorDots} />
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
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    ...shadow.sm,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  link: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.15,
  },
  subtitle: {
    fontSize: 10,
    color: colors.textSubtle,
    marginTop: 1,
    fontWeight: '600',
  },
  progressWrap: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
    minWidth: 28,
    textAlign: 'right',
  },
  indicators: {
    marginTop: spacing.sm,
    gap: 2,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
  },
  indicatorLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  indicatorDots: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    borderStyle: 'dotted',
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4,
  },
  indicatorValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    minWidth: 30,
    textAlign: 'right',
  },
});
