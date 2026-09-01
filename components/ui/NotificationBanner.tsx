import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, typography, radius } from '@/constants/theme';

export type BannerTone = 'danger' | 'warning' | 'info' | 'success';

interface Props {
  tone: BannerTone;
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const TONES: Record<BannerTone, { bg: string; fg: string }> = {
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  info: { bg: colors.infoSoft, fg: colors.info },
  success: { bg: colors.successSoft, fg: colors.success },
};

export function NotificationBanner({
  tone,
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: Props) {
  const t = TONES[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg, borderLeftColor: t.fg }]}>
      <View style={styles.iconBubble}>
        <Ionicons name={icon as any} size={22} color={t.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: t.fg }]}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: t.fg },
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={6}
          >
            <Text style={styles.ctaText}>{actionLabel}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.textOnPrimary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  message: {
    ...typography.caption,
    color: colors.textSubtle,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  ctaText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 13 },
});
