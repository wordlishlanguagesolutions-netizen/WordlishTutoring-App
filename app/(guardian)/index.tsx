import React, { useEffect, useState } from 'react';
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
import { Avatar } from '@/components/ui';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { linkedStudents, currentGuardian, PAYMENT_STATUS } from '@/services/mockData';
import { useAuth } from '@/hooks/useAuth';
import { openZoom, getZoomUrl } from '@/services/zoomService';
import { publicClassStatus, type InternalClassStage } from '@/constants/designPhilosophy';

// ============================================================================
// Home del acudiente · Filosofía Wordlish · v1.1
// ----------------------------------------------------------------------------
// Reglas aplicadas:
//   3. El acudiente sólo percibe tranquilidad.
//   4. Traducimos procesos → resultados (nunca "Material pendiente").
//   5. Sin duplicados: "Reservar" y "Reportes" ya viven en la barra inferior.
//   6. Una sola acción principal por pantalla ("Ver clase" cuando aplica).
//   8. Solo mostramos excepciones. Si todo está bien, no mostramos nada.
//  11. Fondo blanco, bordes finos, morado únicamente para la acción principal.
//  12. Regla de los 3 segundos: identidad + selector + estado de la clase.
// ============================================================================

type LinkedStudent = typeof linkedStudents[number];
const IMMINENT_MIN = 15;
const CLASS_DURATION_MIN = 60;

// Traduce el estado interno del backend en un stage público.
// El acudiente nunca ve "material pendiente" ni "screenshot pendiente":
// solo resultados como "Clase en curso", "Asistencia confirmada", etc.
function deriveStage(s: LinkedStudent): InternalClassStage {
  const startsInMin = s.nextStartsInMin;
  if (startsInMin > IMMINENT_MIN) return 'scheduled';
  if (startsInMin > 0 && s.nextTeacherOnline) return 'teacher_online';
  if (startsInMin > 0) return 'starting_soon';
  if (Math.abs(startsInMin) < CLASS_DURATION_MIN) {
    // La clase ya comenzó. Si el profesor ya subió screenshot, mostramos
    // "Asistencia confirmada"; si no, mostramos "Clase en curso" (nunca
    // exponemos que falta el screenshot).
    return s.nextMaterialStatus === 'received'
      ? 'attendance_confirmed'
      : 'in_progress';
  }
  return 'ended';
}

export default function GuardianHome() {
  const router = useRouter();
  const { logout } = useAuth();
  const [activeId, setActiveId] = useState<string>(linkedStudents[0].id);

  // Refresco pasivo cada 30 s para que el estado avance sin intervención.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const active =
    linkedStudents.find((s) => s.id === activeId) ?? linkedStudents[0];
  const payStatus = PAYMENT_STATUS[active.paymentStatus];
  const stage = deriveStage(active);
  const publicStatus = publicClassStatus(stage);

  const showLiveButton =
    stage === 'in_progress' ||
    stage === 'attendance_confirmed' ||
    stage === 'teacher_online' ||
    stage === 'starting_soon';

  // Abre el enlace oficial de Zoom desde services/zoomService (única
  // fuente de verdad, leída de public.app_settings.zoom.official_link).
  const handleEnter = () => openZoom(getZoomUrl());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ============ Identidad ============ */}
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
            style={styles.logoutBtn}
            accessibilityLabel="Salir"
          >
            <Ionicons name="log-out-outline" size={18} color={colors.primaryDark} />
          </Pressable>
        </View>

        {/* ============ Selector de estudiante · discreto ============ */}
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

        {/* ============ Estado compacto · saldo + pago ============ */}
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Saldo</Text>
            <Text style={styles.statusValue}>
              {active.remaining} de {active.total} h
            </Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Pago</Text>
            <View style={styles.statusValueRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      payStatus.tone === 'success' ? colors.success : colors.warning,
                  },
                ]}
              />
              <Text style={styles.statusValue}>{payStatus.label}</Text>
            </View>
          </View>
        </View>

        {/* ============ Próxima clase · tarjeta blanca minimalista ============ */}
        <Text style={styles.section}>Próxima clase</Text>
        <View style={styles.classCard}>
          <View style={styles.classHeader}>
            <View style={styles.subjectIcon}>
              <Ionicons name="book-outline" size={18} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.classSubject} numberOfLines={1}>
                {active.nextSubject}
              </Text>
              <Text style={styles.classTeacher} numberOfLines={1}>
                {active.nextTeacher.replace(/^Prof\.?\s*/, 'Profesor ')}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.primaryDark} />
              <Text style={styles.metaText}>{active.next}</Text>
            </View>
          </View>

          {/* Una sola acción principal: aparece únicamente cuando la clase
              está a menos de 15 min o en curso. Regla 6 + Regla 8. */}
          {showLiveButton ? (
            <Pressable
              onPress={handleEnter}
              style={({ pressed }) => [
                styles.enterBtn,
                (stage === 'in_progress' || stage === 'attendance_confirmed') &&
                  styles.enterBtnLive,
                pressed && { opacity: 0.92 },
              ]}
            >
              {stage === 'in_progress' || stage === 'attendance_confirmed' ? (
                <View style={styles.liveDot} />
              ) : (
                <Ionicons name="videocam" size={16} color={colors.textOnPrimary} />
              )}
              <Text style={styles.enterText}>
                {stage === 'in_progress' || stage === 'attendance_confirmed'
                  ? 'Ver clase en vivo'
                  : 'Abrir clase'}
              </Text>
            </Pressable>
          ) : null}

          {/* Mensaje inferior discreto · resultados, no procesos.
              Silenciamos por completo cuando no hay nada relevante (Regla 8). */}
          {publicStatus ? (
            <View style={styles.hintRow}>
              <Ionicons
                name={publicStatus.icon as any}
                size={13}
                color={
                  publicStatus.tone === 'success'
                    ? colors.success
                    : colors.textMuted
                }
              />
              <Text
                style={[
                  styles.hintText,
                  publicStatus.tone === 'success' && { color: colors.success },
                ]}
                numberOfLines={1}
              >
                {publicStatus.label}
              </Text>
            </View>
          ) : null}
        </View>

        {/*
          Se eliminan intencionalmente los botones "Reservar clase" y
          "Ver mis reservas": ambas funciones ya viven en la barra
          inferior. Regla 5: sin duplicados.
        */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // Identidad
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  hello: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Selector de estudiantes · chips discretos
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

  // Estado compacto
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  statusItem: { flex: 1 },
  statusDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  statusValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  statusValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },

  // Sección
  section: {
    ...typography.h3,
    fontSize: 17,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },

  // Tarjeta próxima clase · blanca, borde fino, sombra ligera
  classCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    ...shadow.sm,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classSubject: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  classTeacher: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: colors.textSubtle,
    fontSize: 15,
    fontWeight: '600',
  },

  // Botón principal · único elemento morado sólido
  enterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  enterBtnLive: { backgroundColor: colors.success },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textOnPrimary,
  },
  enterText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },

  // Hint inferior · texto discreto, sin recuadros
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  hintText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
});
