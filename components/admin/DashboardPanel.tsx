import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, radius } from '@/constants/theme';

// ============================================================================
// DashboardPanel · contenedor visual homogéneo para bloques del dashboard.
// Título, contador opcional, tono de acento y acción "ver todo".
// Diseñado para no competir visualmente entre columnas.
// ============================================================================

type Tone = 'neutral' | 'info' | 'warning' | 'danger' | 'success' | 'primary';

const TONE_COLORS: Record<Tone, { dot: string; text: string }> = {
  neutral: { dot: colors.textMuted, text: colors.textSubtle },
  info:    { dot: colors.info,      text: colors.info },
  warning: { dot: colors.warning,   text: colors.warning },
  danger:  { dot: colors.danger,    text: colors.danger },
  success: { dot: colors.success,   text: colors.success },
  primary: { dot: colors.primary,   text: colors.primaryDark },
};

interface Props {
  title: string;
  count?: number;
  tone?: Tone;
  icon?: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
  children: ReactNode;
}

export function DashboardPanel({
  title,
  count,
  tone = 'neutral',
  icon,
  onSeeAll,
  seeAllLabel = 'Ver todo',
  children,
}: Props) {
  const t = TONE_COLORS[tone];
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headLeft}>
          {icon ? (
            <Ionicons name={icon as any} size={13} color={t.text} />
          ) : (
            <View style={[styles.dot, { backgroundColor: t.dot }]} />
          )}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {count !== undefined ? (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          ) : null}
        </View>
        {onSeeAll ? (
          <Pressable
            onPress={onSeeAll}
            style={({ pressed }) => [styles.seeAll, pressed && { opacity: 0.7 }]}
            hitSlop={6}
          >
            <Text style={styles.seeAllText}>{seeAllLabel}</Text>
            <Ionicons name="chevron-forward" size={11} color={colors.primaryDark} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.1,
  },
  countBadge: {
    minWidth: 18,
    paddingHorizontal: 5,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSubtle,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  body: {
    padding: spacing.md,
  },
});
