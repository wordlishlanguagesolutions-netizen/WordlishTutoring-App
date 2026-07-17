import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { policiesAck } from '@/services/policiesAck';

// ============================================================================
// Tips para tu clase personalizada.
// Reemplaza a la casilla "He leído las políticas" del resumen de reserva.
// Al montarse marca al estudiante recibido por query param como que ya
// visualizó las políticas, habilitando la confirmación en el resumen.
// ============================================================================

interface Section {
  icon: string;
  title: string;
  rules: string[];
}

const SECTIONS: Section[] = [
  {
    icon: 'calendar-outline',
    title: 'Reserva y pago',
    rules: [
      'El pago confirma la reserva.',
      'Reprogramación hasta 1 hora antes en tutorías individuales.',
      'En cursos grupales no se pueden cancelar clases sueltas.',
    ],
  },
  {
    icon: 'folder-open-outline',
    title: 'Material',
    rules: [
      'Puedes subir archivos hasta 3 horas antes.',
      'Si no tienes archivos, escribe únicamente el tema.',
      'Si no recibimos nada, el profesor preparará la clase con la información disponible.',
    ],
  },
  {
    icon: 'time-outline',
    title: 'Puntualidad',
    rules: [
      'Espera al estudiante: 15 minutos.',
      'Tolerancia del profesor: 5 minutos.',
      'Si el estudiante no asiste, la hora se considera utilizada.',
    ],
  },
  {
    icon: 'refresh-outline',
    title: 'Cancelación y reprogramación',
    rules: [
      'Tutoría individual: reprograma o cancela hasta 1 hora antes.',
      'Curso grupal: no se pueden cancelar clases individuales.',
      'Si faltas a un curso grupal, la clase sigue para el resto del grupo.',
    ],
  },
  {
    icon: 'videocam-outline',
    title: 'Cámara obligatoria',
    rules: [
      'El estudiante debe encender la cámara durante la clase.',
      'Si no hay cámara, el supervisor registra una alerta.',
      'Es una regla de supervisión para cuidar al estudiante y al profesor.',
    ],
  },
  {
    icon: 'flag-outline',
    title: 'La clase termina a la hora programada',
    rules: [
      'La clase termina siempre a la hora acordada.',
      'Si el estudiante llega tarde, no se extiende la clase.',
      'Si el profesor llega tarde, compensa el tiempo dentro de la misma clase.',
    ],
  },
];

export default function PoliciesScreen() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();

  useEffect(() => {
    if (studentId) policiesAck.markViewed(studentId);
  }, [studentId]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.title}>Tips para tu clase</Text>
          <Text style={s.subtitle}>personalizada</Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
          gap: spacing.md,
        }}
      >
        <Text style={s.intro}>
          Estas son las reglas que hacen que cada clase salga bien. Léelas una
          vez y reserva tranquilo.
        </Text>

        {SECTIONS.map((sec) => (
          <View key={sec.title} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.iconBox}>
                <Ionicons
                  name={sec.icon as any}
                  size={20}
                  color={colors.primaryDark}
                />
              </View>
              <Text style={s.sectionTitle}>{sec.title}</Text>
            </View>

            <View style={s.rules}>
              {sec.rules.map((rule, i) => (
                <View key={i} style={s.ruleRow}>
                  <Ionicons
                    name="ellipse"
                    size={5}
                    color={colors.primary}
                    style={{ marginTop: 8 }}
                  />
                  <Text style={s.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="checkmark-circle" size={18} color={colors.textOnPrimary} />
          <Text style={s.backText}>Entendido</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  title: { ...typography.h2 },
  subtitle: {
    fontSize: 13,
    color: colors.textSubtle,
    fontWeight: '500',
    marginTop: 2,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: {
    ...typography.body,
    color: colors.textSubtle,
    marginBottom: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typography.h3, color: colors.text, flex: 1 },
  rules: { gap: spacing.md },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  ruleText: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
    fontSize: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  backText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
});
