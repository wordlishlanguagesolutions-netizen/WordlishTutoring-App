import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StatusBar } from 'react-native';
import { Avatar, PageContainer, WebTwoColumn } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { openZoom, getZoomUrl } from '@/services/zoomService';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import {
  currentStudent,
  nextClass,
  packageInfo,
  latestPayment,
  PAYMENT_STATUS,
} from '@/services/mockData';
import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// Home del estudiante · Diseño premium minimalista.
// Fase 3: en desktop se distribuye en dos columnas (clase a la izquierda,
// resumen del plan a la derecha) manteniendo tarjetas compactas.
// Móvil y tablet: layout original intacto.
// ============================================================================

const IMMINENT_MIN = 15;
const CLASS_DURATION_MIN = 60;

type ClassPhase = 'far' | 'imminent' | 'live' | 'finished';

export default function StudentHome() {
  const router = useRouter();
  const { logout } = useAuth();
  const { isDesktop } = useResponsive();
  const payStatus = PAYMENT_STATUS[latestPayment.status];

  const hasNextClass = Boolean(nextClass);

  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  void nowTick;

  const minsLeft = hasNextClass ? nextClass.startsInMin : 0;

  const phase: ClassPhase = !hasNextClass
    ? 'far'
    : minsLeft > IMMINENT_MIN
    ? 'far'
    : minsLeft > 0
    ? 'imminent'
    : Math.abs(minsLeft) < CLASS_DURATION_MIN
    ? 'live'
    : 'finished';

  const attendanceRegistered =
    hasNextClass && nextClass.screenshotStatus === 'received';

  // Abre el enlace oficial de Zoom desde services/zoomService (única
  // fuente de verdad, leída de public.app_settings.zoom.official_link).
  const handleEnterClass = () => openZoom(getZoomUrl());

  const showLiveButton = phase === 'imminent' || phase === 'live';

  const bottomHint: { icon: string; text: string; tone: 'muted' | 'success' } =
    phase === 'live' && attendanceRegistered
      ? { icon: 'checkmark-circle', text: 'Asistencia registrada · Clase en curso.', tone: 'success' }
      : phase === 'live'
      ? { icon: 'radio', text: 'Clase en curso.', tone: 'muted' }
      : phase === 'finished'
      ? { icon: 'checkmark-circle', text: 'Clase finalizada correctamente.', tone: 'success' }
      : phase === 'imminent'
      ? { icon: 'time-outline', text: 'Tu profesor ya está preparando la sesión.', tone: 'muted' }
      : {
          icon: 'time-outline',
          text: `Tu clase comienza en ${minsLeft} minutos.`,
          tone: 'muted',
        };

  // ==================== Bloques reutilizables ====================
  const IdentityBlock = (
    <View style={styles.identityCard}>
      <Avatar name={currentStudent.name} uri={currentStudent.avatar} size={52} />
      <View style={{ flex: 1 }}>
        <Text style={styles.hello}>Hola,</Text>
        <Text style={styles.name} numberOfLines={1}>
          {currentStudent.firstName}
        </Text>
      </View>
      <Pressable onPress={logout} hitSlop={10} style={styles.logoutBtn}>
        <Ionicons name="log-out-outline" size={18} color={colors.primaryDark} />
      </Pressable>
    </View>
  );

  const StatusBlockCompact = (
    <View style={styles.statusRow}>
      <View style={styles.statusItem}>
        <Text style={styles.statusLabel}>Saldo del plan</Text>
        <Text style={styles.statusValue}>
          {packageInfo.remaining} de {packageInfo.total} h
        </Text>
      </View>
      <View style={styles.statusDivider} />
      <View style={styles.statusItem}>
        <Text style={styles.statusLabel}>Estado del pago</Text>
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
  );

  // Versión desktop del status: apilado vertical con más aire, tarjetas discretas.
  const StatusBlockStacked = (
    <View style={styles.statusStack}>
      <Text style={styles.sideTitle}>Tu plan</Text>
      <View style={styles.statusItemBox}>
        <Text style={styles.statusLabel}>Saldo del plan</Text>
        <Text style={styles.statusValueLg}>
          {packageInfo.remaining} de {packageInfo.total} h
        </Text>
      </View>
      <View style={styles.statusItemBox}>
        <Text style={styles.statusLabel}>Estado del pago</Text>
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
          <Text style={styles.statusValueLg}>{payStatus.label}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => router.push('/(student)/payments' as any)}
        style={({ pressed }) => [
          styles.sideLink,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.sideLinkText}>Ver Mi plan</Text>
        <Ionicons name="chevron-forward" size={12} color={colors.primaryDark} />
      </Pressable>
    </View>
  );

  const ClassBlock = hasNextClass ? (
    <>
      {!isDesktop && <Text style={styles.section}>Próxima clase</Text>}
      <View style={styles.classCard}>
        {isDesktop && (
          <Text style={styles.classLabel}>Próxima clase</Text>
        )}
        <View style={styles.classHeader}>
          <View style={styles.subjectIcon}>
            <Ionicons name="book-outline" size={18} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.classSubject} numberOfLines={1}>
              {nextClass.subject}
            </Text>
            <Text style={styles.classTeacher} numberOfLines={1}>
              Profesor {nextClass.teacher.replace(/^Prof\.?\s*/, '')}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.primaryDark} />
            <Text style={styles.metaText}>{nextClass.date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.primaryDark} />
            <Text style={styles.metaText}>{nextClass.time}</Text>
          </View>
        </View>

        <Pressable
          onPress={handleEnterClass}
          style={({ pressed }) => [
            styles.enterBtn,
            showLiveButton && styles.enterBtnLive,
            pressed && { opacity: 0.92 },
          ]}
        >
          {showLiveButton ? (
            <View style={styles.liveDot} />
          ) : (
            <Ionicons name="videocam" size={18} color={colors.textOnPrimary} />
          )}
          <Text style={styles.enterText}>
            {showLiveButton ? 'Entrar a mi clase' : 'Entrar a Zoom'}
          </Text>
        </Pressable>

        <View style={styles.hintRow}>
          <Ionicons
            name={bottomHint.icon as any}
            size={13}
            color={bottomHint.tone === 'success' ? colors.success : colors.textMuted}
          />
          <Text
            style={[
              styles.hintText,
              bottomHint.tone === 'success' && { color: colors.success },
            ]}
          >
            {bottomHint.text}
          </Text>
        </View>
      </View>
    </>
  ) : (
    <View style={styles.emptyCard}>
      <View style={styles.subjectIcon}>
        <Ionicons name="calendar-outline" size={22} color={colors.primaryDark} />
      </View>
      <Text style={styles.emptyText}>No tienes clases programadas.</Text>
      <Pressable
        onPress={() => router.push('/(student)/book' as any)}
        style={({ pressed }) => [styles.enterBtn, pressed && { opacity: 0.92 }]}
      >
        <Text style={styles.enterText}>Reservar clase</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageContainer maxWidth="home">
          {IdentityBlock}

          {isDesktop ? (
            <WebTwoColumn
              leftFlex={7}
              rightFlex={5}
              left={<View style={{ gap: spacing.md }}>{ClassBlock}</View>}
              right={StatusBlockStacked}
            />
          ) : (
            <>
              {StatusBlockCompact}
              {ClassBlock}
            </>
          )}
        </PageContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Identidad
  identityCard: {
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

  // Saldo + Pago móvil
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
  statusValueLg: { fontSize: 18, fontWeight: '700', color: colors.text },
  statusValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },

  // Status desktop stacked
  statusStack: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statusItemBox: { gap: 4 },
  sideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  sideLinkText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },

  // Sección
  section: {
    ...typography.h3,
    fontSize: 17,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },

  // Tarjeta clase
  classCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    ...shadow.sm,
  },
  classLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
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
  metaGrid: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
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
  enterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  enterBtnLive: {
    backgroundColor: colors.success,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textOnPrimary,
  },
  enterText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
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
  emptyCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
