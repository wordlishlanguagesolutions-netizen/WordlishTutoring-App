import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { Card, Avatar, StatusBadge } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { Booking, BOOKING_STATUS, dateUtils } from '@/services/mockData';

interface BookingCardProps {
  booking: Booking;
  showStudent?: boolean;
  compact?: boolean;
}

export function BookingCard({ booking, showStudent, compact }: BookingCardProps) {
  const router = useRouter();
  const status = BOOKING_STATUS[booking.status];
  const displayName = showStudent ? booking.studentName : booking.teacherName;
  const displayAvatar = showStudent ? booking.studentAvatar : booking.teacherAvatar;

  // Variante compacta para el listado de "Mis reservas": una sola fila,
  // suficiente para mostrar materia, fecha, hora, contraparte y estado
  // en la mitad de altura del formato original.
  if (compact) {
    return (
      <Pressable onPress={() => router.push(`/booking/${booking.id}` as any)}>
        <View style={styles.compactCard}>
          <Avatar name={displayName} uri={displayAvatar} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.compactSubject} numberOfLines={1}>
              {booking.subject}
            </Text>
            <Text style={styles.compactMeta} numberOfLines={1}>
              {dateUtils.formatDisplay(booking.date)} · {booking.time} · {displayName}
            </Text>
          </View>
          <StatusBadge tone={status.tone} label={status.label} icon={status.icon} />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={() => router.push(`/booking/${booking.id}` as any)}>
      <Card>
        <View style={styles.header}>
          <Avatar name={displayName} uri={displayAvatar} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyStrong}>{booking.subject}</Text>
            <Text style={typography.caption}>{displayName}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSubtle} />
            <Text style={styles.metaText}>{dateUtils.formatDisplay(booking.date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.textSubtle} />
            <Text style={styles.metaText}>{booking.time}</Text>
          </View>
        </View>
        <View style={{ marginTop: spacing.md }}>
          <StatusBadge tone={status.tone} label={status.label} icon={status.icon} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metaRow: { flexDirection: 'row', gap: spacing.lg },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.textSubtle, fontSize: 13, fontWeight: '600' },

  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  compactMeta: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
  },
});
