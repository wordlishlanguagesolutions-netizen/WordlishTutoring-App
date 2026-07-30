import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import {
  linkedStudents,
  currentGuardian,
  PAYMENT_STATUS,
  reportsHistory,
} from '@/services/mockData';
import { useAuth } from '@/hooks/useAuth';
import { contactAdvisor } from '@/services/supportService';

// ============================================================================
// Home del acudiente · Filosofía Wordlish · v2.0
// ----------------------------------------------------------------------------
// Toda la experiencia vive en esta pantalla:
//   · Una sola tarjeta principal con la clase actual/próxima/finalizada.
//   · Si hay screenshot del profesor, es el elemento visual dominante.
//   · Debajo: chip de estado, materia, profesor, fecha/hora.
//   · Debajo: bitácora unificada (resumen + tarea + material) de esa clase.
//   · Info secundaria discreta: horas, pago, soporte.
// Sin duplicados, sin pestañas paralelas, una sola acción por pantalla.
// ============================================================================

type LinkedStudent = typeof linkedStudents[number];
const IMMINENT_MIN = 15;
const CLASS_DURATION_MIN = 60;

type Stage = 'scheduled' | 'in_progress' | 'ended';

// Reglas:
//   m > 15                   → 'scheduled' (todavia no inicia, sin screenshot)
//   -CLASS_DURATION_MIN..15  → 'in_progress' (durante la sesion, el profesor
//                              ya tomo screenshot al iniciar)
//   m <= -CLASS_DURATION_MIN → 'ended' (clase terminada, se ve reporte)
function deriveStage(s: LinkedStudent): Stage {
  const m = s.nextStartsInMin;
  if (m > IMMINENT_MIN) return 'scheduled';
  if (m > -CLASS_DURATION_MIN) return 'in_progress';
  return 'ended';
}

export default function GuardianHome() {
  const router = useRouter();
  const { logout } = useAuth();
  const [activeId, setActiveId] = useState<string>(linkedStudents[0].id);

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const active =
    linkedStudents.find((s) => s.id === activeId) ?? linkedStudents[0];
  const payStatus = PAYMENT_STATUS[active.paymentStatus];
  const stage = deriveStage(active);

  const isLive = stage === 'in_progress';
  const isEnded = stage === 'ended';

  // La bitácora se toma del último reporte del estudiante. Aparece siempre
  // que exista un screenshot de la clase (in_progress o ended); si la clase
  // todavia no inicia (scheduled), no se muestra screenshot ni bitácora.
  const lastReport = reportsHistory[0];
  const hasEvidence = (isLive || isEnded) && Boolean(lastReport?.screenshotUrl);
  const heroReport = hasEvidence ? lastReport : null;
  const heroScreenshot = heroReport?.screenshotUrl ?? null;
  const materials = heroReport
    ? [...(heroReport.materials ?? []), ...(heroReport.attachments ?? [])]
    : [];

  const status = isEnded
    ? { label: 'Finalizada', dot: colors.textMuted, tint: colors.surfaceAlt, fg: colors.textSubtle }
    : isLive
    ? { label: 'Clase en curso', dot: colors.success, tint: colors.successSoft, fg: colors.success }
    : { label: 'Próxima clase', dot: colors.primary, tint: colors.primarySoft, fg: colors.primaryDark };

  const subject = heroReport ? heroReport.topic : active.nextSubject;
  const teacher = (heroReport ? heroReport.teacher : active.nextTeacher).replace(
    /^Prof\.?\s*/,
    'Profesor ',
  );
  const dateLabel = heroReport ? heroReport.date : active.next;

  const openDetail = heroReport
    ? () => router.push(`/reports/${heroReport.id}` as any)
    : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Identidad */}
        <View style={styles.top}>
          <Avatar
            name={currentGuardian.name}
            uri={currentGuardian.avatar}
            size={52}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Hola,</Text>
            <Text style={styles.name} numberOfLines={1}>
              {currentGuardian.firstName}
            </Text>
          </View>
          <Pressable
            onPress={logout}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityLabel="Salir"
          >
            <Ionicons name="log-out-outline" size={18} color={colors.primaryDark} />
          </Pressable>
        </View>

        {/* Selector de estudiantes (solo si hay más de uno) */}
        {linkedStudents.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pickerRow}
            style={{ marginBottom: spacing.md }}
          >
            {linkedStudents.map((s) => {
              const isActive = s.id === activeId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setActiveId(s.id)}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <Avatar name={s.name} uri={s.avatar} size={20} />
                  <Text
                    style={[
                      styles.chipText,
                      isActive && { color: colors.textOnPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {s.firstName}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Tarjeta principal unificada · toda la vida de la clase */}
        <Pressable
          onPress={openDetail}
          disabled={!openDetail}
          style={({ pressed }) => [
            styles.classCard,
            pressed && openDetail ? { opacity: 0.97 } : null,
          ]}
        >
          {heroScreenshot ? (
            <Image
              source={{ uri: heroScreenshot }}
              style={styles.hero}
              contentFit="cover"
              transition={200}
            />
          ) : null}

          <View style={styles.cardBody}>
            <View style={[styles.statusChip, { backgroundColor: status.tint }]}>
              <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
              <Text style={[styles.statusText, { color: status.fg }]}>
                {status.label}
              </Text>
            </View>

            <Text style={styles.subject} numberOfLines={1}>{subject}</Text>
            <Text style={styles.teacher} numberOfLines={1}>{teacher}</Text>

            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.primaryDark} />
              <Text style={styles.metaText}>{dateLabel}</Text>
            </View>

            {heroReport ? (
              <View style={styles.bitacora}>
                {/* Resumen del profesor */}
                <View style={styles.blockGroup}>
                  <Text style={styles.blockLabel}>Resumen del profesor</Text>
                  <Text style={styles.blockBody}>{heroReport.progress}</Text>
                </View>

                {/* Tarea */}
                {heroReport.homework ? (
                  <View style={styles.blockGroup}>
                    <Text style={styles.blockLabel}>Tarea</Text>
                    <Text style={styles.blockBody}>{heroReport.homework}</Text>
                  </View>
                ) : null}

                {/* Material de la clase */}
                {materials.length > 0 ? (
                  <View style={styles.blockGroup}>
                    <Text style={styles.blockLabel}>
                      Material de la clase
                    </Text>
                    <View style={{ gap: 6 }}>
                      {materials.map((m, i) => (
                        <View key={i} style={styles.materialRow}>
                          <View style={styles.materialIcon}>
                            <Ionicons
                              name="document-text-outline"
                              size={12}
                              color={colors.primaryDark}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.materialTitle} numberOfLines={1}>
                              {m.title}
                            </Text>
                            <Text style={styles.materialMeta}>
                              {m.kind}{m.size ? ` · ${m.size}` : ''}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={styles.openRow}>
                  <Text style={styles.openText}>Ver bitácora completa</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
                </View>
              </View>
            ) : null}
          </View>
        </Pressable>

        {/* Info secundaria · discreta · enruta al Dashboard Mi plan */}
        <View style={styles.secondaryRow}>
          <Pressable
            onPress={() => router.push('/(guardian)/payments' as any)}
            style={({ pressed }) => [styles.badge, pressed && { opacity: 0.85 }]}
            hitSlop={6}
          >
            <Ionicons name="hourglass-outline" size={12} color={colors.primaryDark} />
            <Text style={styles.badgeText}>{active.remaining} h disponibles</Text>
            <Ionicons name="chevron-forward" size={11} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(guardian)/payments' as any)}
            style={({ pressed }) => [styles.badge, pressed && { opacity: 0.85 }]}
            hitSlop={6}
          >
            <View
              style={[
                styles.badgeDot,
                {
                  backgroundColor:
                    payStatus.tone === 'success' ? colors.success : colors.warning,
                },
              ]}
            />
            <Text style={styles.badgeText}>{payStatus.label}</Text>
            <Ionicons name="chevron-forward" size={11} color={colors.textMuted} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => contactAdvisor('guardian', { screen: 'guardian-home' })}
          style={({ pressed }) => [styles.supportBtn, pressed && { opacity: 0.9 }]}
          accessibilityLabel="Contactar soporte"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primaryDark} />
          <Text style={styles.supportText}>Contactar soporte</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  hello: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pickerRow: { gap: 8, paddingRight: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: {
    color: colors.textSubtle,
    fontWeight: '700',
    fontSize: 14,
    maxWidth: 120,
  },

  // Tarjeta unica
  classCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.sm,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceAlt,
  },
  cardBody: { padding: spacing.lg, gap: spacing.sm },
  statusChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginBottom: 2,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  subject: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  teacher: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    marginTop: -2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: { color: colors.textSubtle, fontSize: 14, fontWeight: '600' },

  // Bitacora dentro de la tarjeta
  bitacora: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  blockGroup: { gap: 4 },
  blockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  blockBody: { color: colors.textSubtle, fontSize: 14, lineHeight: 20 },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  materialIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  materialMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  openText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },

  // Info secundaria
  secondaryRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.textSubtle },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },

  supportBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  supportText: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' },
});
