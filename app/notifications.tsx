import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification } from '@/types';

// ============================================================================
// Centro de Actividad · Wordlish
//
// Cierre final MVP: reutiliza NotificationsContext (grouped, priorityOf,
// requiresActionCount, markAsRead). Sin nueva persistencia, sin nuevas
// tablas, sin realtime propio. Presenta tres secciones colapsables:
//   Requiere accion / Importante / Informacion
// Cada notificacion navega a su actionRoute y se marca leida al tocarla.
// ============================================================================

type SectionKey = 'requires_action' | 'important' | 'info';

const SECTION_META: Record<
  SectionKey,
  { title: string; icon: string; color: string; bg: string; dot: string }
> = {
  requires_action: {
    title: 'Requiere accion',
    icon: 'alert-circle',
    color: colors.danger,
    bg: colors.dangerSoft,
    dot: colors.danger,
  },
  important: {
    title: 'Importante',
    icon: 'star',
    color: colors.warning,
    bg: colors.warningSoft,
    dot: colors.warning,
  },
  info: {
    title: 'Informacion',
    icon: 'information-circle',
    color: colors.info,
    bg: colors.infoSoft,
    dot: colors.info,
  },
};

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffMin < 60 * 24) return `Hace ${Math.floor(diffMin / 60)} h`;
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_ES[d.getMonth()]}`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { grouped, requiresActionCount, unreadCount, markAsRead, markAllAsRead, refresh } =
    useNotifications();

  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    requires_action: false,
    important: false,
    info: true,
  });

  const totals = useMemo(
    () => ({
      requires_action: grouped.requires_action.length,
      important: grouped.important.length,
      info: grouped.info.length,
    }),
    [grouped],
  );

  const toggle = (k: SectionKey) => setCollapsed((prev) => ({ ...prev, [k]: !prev[k] }));

  const handleTap = (n: Notification) => {
    if (!n.read) markAsRead(n.id);
    if (n.actionRoute) {
      router.push(n.actionRoute as any);
    }
  };

  const totalAll = totals.requires_action + totals.important + totals.info;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Wordlish</Text>
          <Text style={typography.h2}>Centro de Actividad</Text>
        </View>
        <Pressable onPress={refresh} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="refresh" size={18} color={colors.primaryDark} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/settings/notifications' as any)}
          hitSlop={10}
          style={s.iconBtn}
          accessibilityLabel="Preferencias de notificaciones"
        >
          <Ionicons name="settings-outline" size={18} color={colors.primaryDark} />
        </Pressable>
      </View>

      <View style={s.summaryRow}>
        <SummaryChip label="Requiere accion" count={requiresActionCount} tone="danger" />
        <SummaryChip label="No leidas" count={unreadCount} tone="primary" />
        {unreadCount > 0 ? (
          <Pressable onPress={markAllAsRead} hitSlop={8} style={s.markAllBtn}>
            <Ionicons name="checkmark-done" size={14} color={colors.primaryDark} />
            <Text style={s.markAllText}>Marcar todo</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {totalAll === 0 ? (
          <View style={s.empty}>
            <Ionicons name="notifications-outline" size={28} color={colors.textMuted} />
            <Text style={typography.h3}>Sin notificaciones</Text>
            <Text style={typography.caption}>Aqui apareceran tus alertas y avisos.</Text>
          </View>
        ) : null}

        {(['requires_action', 'important', 'info'] as SectionKey[]).map((key) => {
          const meta = SECTION_META[key];
          const items = grouped[key];
          if (items.length === 0) return null;
          const isCollapsed = collapsed[key];
          return (
            <View key={key} style={s.section}>
              <Pressable
                onPress={() => toggle(key)}
                style={({ pressed }) => [s.sectionHead, pressed && { opacity: 0.9 }]}
              >
                <View style={[s.sectionDot, { backgroundColor: meta.dot }]} />
                <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                <Text style={[s.sectionTitle, { color: meta.color }]}>{meta.title}</Text>
                <View style={[s.countPill, { backgroundColor: meta.bg }]}>
                  <Text style={[s.countPillText, { color: meta.color }]}>{items.length}</Text>
                </View>
                <Ionicons
                  name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={16}
                  color={colors.textMuted}
                />
              </Pressable>
              {!isCollapsed ? (
                <View style={s.sectionBody}>
                  {items.map((n) => (
                    <NotificationRow key={n.id} n={n} tone={meta.color} onPress={() => handleTap(n)} />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryChip({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: 'danger' | 'primary';
}) {
  const bg = tone === 'danger' ? colors.dangerSoft : colors.primarySoft;
  const fg = tone === 'danger' ? colors.danger : colors.primaryDark;
  return (
    <View style={[s.summaryChip, { backgroundColor: bg }]}>
      <Text style={[s.summaryChipCount, { color: fg }]}>{count}</Text>
      <Text style={[s.summaryChipLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

function NotificationRow({
  n,
  tone,
  onPress,
}: {
  n: Notification;
  tone: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.92 }]}>
      <View style={[s.rowIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={(n.icon as any) ?? 'notifications'} size={16} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.rowHead}>
          <Text style={[s.rowTitle, !n.read && { fontWeight: '800' }]} numberOfLines={1}>
            {n.title}
          </Text>
          {!n.read ? <View style={[s.unreadDot, { backgroundColor: tone }]} /> : null}
        </View>
        <Text style={s.rowMessage} numberOfLines={2}>
          {n.message}
        </Text>
        <View style={s.rowFoot}>
          <Text style={s.rowTime}>{formatWhen(n.createdAt)}</Text>
          {n.actionLabel ? (
            <>
              <Text style={s.rowSep}>·</Text>
              <Text style={[s.rowAction, { color: tone }]}>{n.actionLabel}</Text>
              <Ionicons name="chevron-forward" size={12} color={tone} />
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexWrap: 'wrap',
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  summaryChipCount: { fontSize: 13, fontWeight: '800' },
  summaryChipLabel: { fontSize: 12, fontWeight: '700' },
  markAllBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  markAllText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { flex: 1, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  countPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  countPillText: { fontSize: 11, fontWeight: '800' },
  sectionBody: { padding: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  rowMessage: { fontSize: 13, color: colors.textSubtle, marginTop: 2, lineHeight: 18 },
  rowFoot: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  rowTime: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  rowSep: { fontSize: 11, color: colors.textMuted },
  rowAction: { fontSize: 11, fontWeight: '800' },
});
