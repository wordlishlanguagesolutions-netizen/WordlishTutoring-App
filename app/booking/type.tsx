import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';

// ============================================================================
// Paso 1: selección del tipo de servicio antes de elegir la materia.
// Rutas de destino:
//   - Tutoría individual → /booking/new (mantiene el flujo actual).
//   - Curso grupal      → /booking/groups (browsing mock, sin reserva real).
// ============================================================================

export default function BookingType() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Reservar</Text>
          <Text style={typography.h2}>¿Qué deseas reservar?</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      >
        <Text style={s.intro}>
          Elige el tipo de servicio. Cada uno tiene reglas distintas.
        </Text>

        <Pressable
          onPress={() => router.push('/booking/new' as any)}
          style={({ pressed }) => [
            s.card,
            pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          ]}
        >
          <View style={s.iconBox}>
            <Ionicons name="person" size={26} color={colors.primaryDark} />
          </View>
          <Text style={s.cardTitle}>Tutoría individual</Text>
          <Text style={s.cardDesc}>
            Uno a uno con tu profesor. Elige materia, fecha y hora. Cancela o
            reprograma hasta 1 hora antes.
          </Text>
          <View style={s.tagsRow}>
            <Tag icon="checkmark" text="Horario flexible" />
            <Tag icon="checkmark" text="Auto-asignación" />
          </View>
          <View style={s.arrow}>
            <Ionicons name="arrow-forward" size={18} color={colors.primaryDark} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push('/booking/groups' as any)}
          style={({ pressed }) => [
            s.card,
            pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
            { marginTop: spacing.md },
          ]}
        >
          <View style={s.iconBox}>
            <Ionicons name="people" size={26} color={colors.primaryDark} />
          </View>
          <Text style={s.cardTitle}>Curso grupal</Text>
          <Text style={s.cardDesc}>
            Aprende en grupo. Horario fijo y plan cerrado. Las clases siguen
            aunque un estudiante falte.
          </Text>
          <View style={s.tagsRow}>
            <Tag icon="calendar" text="Horario fijo" />
            <Tag icon="people" text="Cupos limitados" />
          </View>
          <View style={s.arrow}>
            <Ionicons name="arrow-forward" size={18} color={colors.primaryDark} />
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tag({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.tag}>
      <Ionicons name={icon as any} size={11} color={colors.primaryDark} />
      <Text style={s.tagText}>{text}</Text>
    </View>
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
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },

  intro: {
    ...typography.caption,
    color: colors.textSubtle,
    marginBottom: spacing.md,
    fontSize: 14,
  },

  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
    position: 'relative',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: { ...typography.h3, marginBottom: 6 },
  cardDesc: {
    ...typography.body,
    color: colors.textSubtle,
    fontSize: 14,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.md,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tagText: { color: colors.primaryDark, fontWeight: '600', fontSize: 12 },
  arrow: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
