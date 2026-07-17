import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, radius } from '@/constants/theme';

// ============================================================================
// DashboardTopBar · barra superior del panel administrativo.
// Buscador global, fecha, notificaciones y accesos rápidos.
// Exclusivo desktop. Sin acciones destructivas.
// ============================================================================

export interface QuickAction {
  key: string;
  label: string;
  icon: string;
  onPress?: () => void;
}

interface Props {
  query: string;
  onQueryChange: (v: string) => void;
  notificationsCount?: number;
  onNotificationsPress?: () => void;
  quickActions?: QuickAction[];
}

const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function DashboardTopBar({
  query,
  onQueryChange,
  notificationsCount = 0,
  onNotificationsPress,
  quickActions = [],
}: Props) {
  const [now] = useState(new Date());
  const dateLabel = useMemo(() => {
    const d = now;
    return `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  }, [now]);

  return (
    <View style={styles.bar}>
      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={15} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Buscar estudiantes, profesores, clases, pagos..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => onQueryChange('')} hitSlop={8}>
            <Ionicons name="close-circle" size={14} color={colors.textMuted} />
          </Pressable>
        ) : (
          <View style={styles.kbd}>
            <Text style={styles.kbdText}>⌘K</Text>
          </View>
        )}
      </View>

      {/* Date */}
      <View style={styles.dateBox}>
        <Ionicons name="calendar-outline" size={13} color={colors.textSubtle} />
        <Text style={styles.dateText} numberOfLines={1}>{dateLabel}</Text>
      </View>

      {/* Quick actions */}
      {quickActions.length > 0 ? (
        <View style={styles.quickWrap}>
          {quickActions.map((qa) => (
            <Pressable
              key={qa.key}
              onPress={qa.onPress}
              style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name={qa.icon as any} size={13} color={colors.primaryDark} />
              <Text style={styles.quickText} numberOfLines={1}>{qa.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Notifications */}
      <Pressable
        onPress={onNotificationsPress}
        style={({ pressed }) => [styles.notifBtn, pressed && { opacity: 0.85 }]}
        hitSlop={6}
      >
        <Ionicons name="notifications-outline" size={16} color={colors.text} />
        {notificationsCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notificationsCount > 9 ? '9+' : notificationsCount}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
  },
  searchBox: {
    flex: 1,
    minWidth: 280,
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    padding: 0,
  },
  kbd: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kbdText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSubtle,
    fontWeight: '600',
  },
  quickWrap: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  quickText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  notifBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
});
