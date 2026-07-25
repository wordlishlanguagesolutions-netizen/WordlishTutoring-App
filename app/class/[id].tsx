import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Avatar, StatusBadge, ZoomButton, KnowCard } from '@/components/ui';
import { ClassTimeline } from '@/components/class';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { POLICY_COPY } from '@/constants/policies';
import { openZoom, getZoomUrlForBooking, getMeetingIdDisplay } from '@/services/zoomService';
import {
  PRE_CLASS_TIPS,
  STUDENT_LATE_MESSAGE,
  CLASS_FINISHED_MESSAGE,
} from '@/constants/contextualPolicies';
import { useClassManager } from '@/hooks/useClassManager';
import { useBookings } from '@/hooks/useBookings';
import { mockDb } from '@/services/mockDb';
import type { ReportStatus } from '@/types';

// ============================================================================
// Class File · vista unificada para estudiante, acudiente, profesor y admin.
// Mantiene la lógica actual del expediente y añade cards para la familia
// (Próxima acción, Antes de tu clase, Tu profesor, Horas disponibles y
// botón grande "Entrar a la clase" con disponibilidad de 10 minutos).
// No conecta APIs reales.
// ============================================================================

const TEN_MIN_MS = 10 * 60 * 1000;

// Las reglas visibles previas a la clase viven en POLICY_COPY.classFileMaterial
// (constants/policies.ts) y se renderizan con <KnowCard /> encima del área
// de material.

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
function fmtDuration(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
function fmtHm(ts: number): string {
  return new Date(ts).toLocaleTimeString('es-PA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function reportTone(s: ReportStatus): 'success' | 'info' | 'primary' | 'muted' {
  if (s === 'confirmed') return 'success';
  if (s === 'read') return 'info';
  if (s === 'sent') return 'primary';
  return 'muted';
}
function reportLabel(s: ReportStatus): string {
  if (s === 'confirmed') return 'Confirmado';
  if (s === 'read') return 'Leído';
  if (s === 'sent') return 'Enviado';
  return 'Pendiente';
}

interface NextActionInfo {
  text: string;
  icon: string;
}

function computeNextAction(args: {
  bookingStatus?: string;
  phase: 'before' | 'during' | 'after';
  hasMaterial: boolean;
  hasTopic: boolean;
  canUploadMaterial: boolean;
  materialLockAt: number;
  reportStatus?: ReportStatus;
}): NextActionInfo {
  if (args.bookingStatus === 'pending_payment') {
    return {
      text: 'Realiza el pago para confirmar tu reserva.',
      icon: 'card-outline',
    };
  }
  if (args.phase === 'after') {
    if (!args.reportStatus) {
      return { text: 'Esperando el reporte del profesor.', icon: 'time-outline' };
    }
    if (args.reportStatus === 'sent') {
      return { text: 'Tienes un reporte nuevo por leer.', icon: 'document-text' };
    }
    if (args.reportStatus === 'read') {
      return { text: 'Confirma el reporte cuando puedas.', icon: 'checkmark-done' };
    }
    return { text: 'Todo cerrado. Nos vemos en la próxima clase.', icon: 'checkmark-circle' };
  }
  if (args.phase === 'during') {
    return { text: 'Tu clase está en curso.', icon: 'videocam' };
  }
  // before
  if (!args.hasMaterial && !args.hasTopic && args.canUploadMaterial) {
    return {
      text: `Sube tu material antes de las ${fmtHm(args.materialLockAt)}.`,
      icon: 'cloud-upload-outline',
    };
  }
  if (!args.hasMaterial && !args.hasTopic) {
    return { text: 'Escribe el tema para tu próxima clase.', icon: 'create-outline' };
  }
  return { text: 'Todo listo para tu clase.', icon: 'checkmark-circle' };
}

export default function ClassManagementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const cm = useClassManager(id ?? '');
  const { remainingHours } = useBookings();

  const [materialTitle, setMaterialTitle] = useState<string>('');
  const [topicDraft, setTopicDraft] = useState<string>('');
  const [teacherMaterialTitle, setTeacherMaterialTitle] = useState<string>('');
  const [rTopic, setRTopic] = useState<string>('');
  const [rObj, setRObj] = useState<string>('');
  const [rStr, setRStr] = useState<string>('');
  const [rImp, setRImp] = useState<string>('');
  const [rHw, setRHw] = useState<string>('');
  const [rGn, setRGn] = useState<string>('');
  const [rAtt, setRAtt] = useState<string[]>([]);

  const teacherEntity = useMemo(
    () => mockDb.teachers.find((t) => t.id === cm.record?.teacherId),
    [cm.record?.teacherId],
  );

  if (!id || !cm.record) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Text style={typography.h2}>Class File no encontrado</Text>
          <Pressable onPress={() => router.back()} style={styles.primaryBtn}>
            <Text style={styles.primaryText}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!cm.canView) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={26} color={colors.textMuted} />
          <Text style={typography.h2}>Sin acceso</Text>
          <Text style={typography.caption}>No tienes permisos para este Class File.</Text>
          <Pressable onPress={() => router.back()} style={styles.primaryBtn}>
            <Text style={styles.primaryText}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { record, timers, materials, reports, screenshots, events, booking } = cm;
  const currentReport = reports[0];
  const studentMaterials = materials.filter((m) => m.source === 'student');
  const teacherMaterials = materials.filter((m) => m.source === 'teacher');
  const isStarted = !!record.startedAt;
  const isEnded = !!record.endedAt;
  const phase = timers?.phase ?? 'before';
  const isViewerFamily = cm.isStudent || cm.isGuardian;
  const hoursAvailable = remainingHours[record.studentId] ?? 0;
  const teacherSpecialty =
    teacherEntity?.subjects?.join(' · ') ?? record.subject ?? 'Idiomas';

  const canEnterClass =
    !!timers &&
    (timers.phase === 'during' ||
      (timers.phase === 'before' && timers.msUntilStart <= TEN_MIN_MS));

  const nextAction: NextActionInfo | null = isViewerFamily
    ? computeNextAction({
        bookingStatus: booking?.status,
        phase,
        hasMaterial: studentMaterials.length > 0,
        hasTopic: !!record.studentTopic,
        canUploadMaterial: timers?.canUploadMaterial ?? false,
        materialLockAt: timers?.materialLockAt ?? 0,
        reportStatus: currentReport?.status,
      })
    : null;

  const onBuyPackage = () => {
    if (cm.isStudent) {
      router.push('/(student)/payments' as any);
    } else if (cm.isGuardian) {
      router.push('/(guardian)/payments' as any);
    }
  };

  const onEnterClass = () => {
    // Enlace único de Wordlish desde app_settings.zoom.official_link.
    // Cuando Zoom OAuth por clase esté activo, getZoomUrlForBooking()
    // priorizará la URL guardada en el booking.
    openZoom(getZoomUrlForBooking(booking?.zoomUrl ?? null));
  };

  const submitReport = () => {
    if (!rTopic.trim()) {
      Alert.alert('Faltan datos', 'Completa al menos el tema visto.');
      return;
    }
    cm.submitReport({
      topic: rTopic.trim(),
      objectives: rObj.trim(),
      strengths: rStr.trim(),
      improvements: rImp.trim(),
      homework: rHw.trim(),
      guardianNotes: rGn.trim(),
      attachments: rAtt,
    });
    setRTopic('');
    setRObj('');
    setRStr('');
    setRImp('');
    setRHw('');
    setRGn('');
    setRAtt([]);
    Alert.alert('Reporte enviado', 'Se notificó al estudiante y al acudiente.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={typography.h2}>Class File</Text>
          <Text style={styles.headerSub}>Archivo de la clase</Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.serviceTag}>
            <Ionicons name="person" size={11} color={colors.primaryDark} />
            <Text style={styles.serviceTagText}>Tutoría individual</Text>
          </View>
          <Text style={styles.heroSubject}>{record.subject}</Text>
          <Text style={styles.heroTime}>
            {record.date} · {record.time}
          </Text>
          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            <View style={styles.rowCenter}>
              <Avatar
                name={booking?.studentName ?? ''}
                uri={booking?.studentAvatar}
                size={40}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLine}>{booking?.studentName}</Text>
                <Text style={styles.heroSub}>Estudiante</Text>
              </View>
            </View>
            {!isViewerFamily ? (
              <View style={styles.rowCenter}>
                <Avatar
                  name={booking?.teacherName ?? ''}
                  uri={booking?.teacherAvatar}
                  size={40}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroLine}>{booking?.teacherName}</Text>
                  <Text style={styles.heroSub}>Profesor</Text>
                </View>
              </View>
            ) : null}
          </View>
          {phase === 'before' && timers ? (
            <View style={styles.countBox}>
              <Ionicons name="time-outline" size={14} color={colors.textOnPrimary} />
              <Text style={styles.countText}>
                Empieza en {fmtDuration(timers.msUntilStart)}
              </Text>
            </View>
          ) : null}
          {phase === 'during' && timers ? (
            <View style={styles.countBox}>
              <View style={styles.liveDot} />
              <Text style={styles.countText}>
                Duración {fmtDuration(timers.msSinceStart)}
              </Text>
            </View>
          ) : null}
          {phase === 'after' ? (
            <View style={styles.countBox}>
              <Ionicons name="checkmark-circle" size={14} color={colors.textOnPrimary} />
              <Text style={styles.countText}>Finalizada</Text>
            </View>
          ) : null}
        </View>

        {/* PRÓXIMA ACCIÓN */}
        {isViewerFamily && nextAction ? (
          <View style={styles.nextAction}>
            <View style={styles.nextIcon}>
              <Ionicons
                name={nextAction.icon as any}
                size={20}
                color={colors.primaryDark}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>Próxima acción</Text>
              <Text style={styles.nextText}>{nextAction.text}</Text>
            </View>
          </View>
        ) : null}

        {/* ENTRAR A LA CLASE */}
        {isViewerFamily && phase !== 'after' ? (
          <View style={{ marginTop: spacing.md }}>
            <Pressable
              onPress={onEnterClass}
              disabled={!canEnterClass}
              style={({ pressed }) => [
                styles.enterBtn,
                !canEnterClass && { opacity: 0.55 },
                pressed && canEnterClass && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <Ionicons name="videocam" size={22} color={colors.textOnPrimary} />
              <Text style={styles.enterText}>Entrar a la clase</Text>
            </Pressable>
            {!canEnterClass ? (
              <Text style={styles.enterNote}>
                Disponible 10 minutos antes del inicio.
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* HORAS DISPONIBLES */}
        {isViewerFamily ? (
          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.balanceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.smallLabel}>Horas disponibles</Text>
                <View style={styles.balanceValue}>
                  <Text style={styles.balanceNumber}>{hoursAvailable}</Text>
                  <Text style={styles.balanceUnit}>horas</Text>
                </View>
              </View>
              <Pressable onPress={onBuyPackage} style={styles.buyBtn}>
                <Ionicons name="cart-outline" size={16} color={colors.textOnPrimary} />
                <Text style={styles.buyText}>Comprar paquete</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        {/* TU PROFESOR */}
        {isViewerFamily ? (
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.smallLabel}>Tu profesor</Text>
            <View style={[styles.rowCenter, { marginTop: spacing.sm }]}>
              <Avatar
                name={booking?.teacherName ?? ''}
                uri={booking?.teacherAvatar}
                size={48}
              />
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyStrong}>{booking?.teacherName}</Text>
                <Text style={typography.caption}>{teacherSpecialty}</Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* EVIDENCIA DE INGRESO · miniatura de la captura inicial */}
        {isViewerFamily && phase !== 'before' && screenshots.length > 0 ? (
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.smallLabel}>Evidencia de ingreso</Text>
            <View style={styles.evidenceRow}>
              <View style={styles.evidenceThumb}>
                <Ionicons name="camera" size={22} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyStrong}>Captura registrada</Text>
                <Text style={typography.caption}>
                  El profesor confirmó tu ingreso al inicio de la clase.
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Ubicación automática de políticas.
            - Antes de la clase: recomendaciones rápidas de conexión.
            - Estudiante tarde: mensaje único de tolerancia.
            - Al finalizar: nunca políticas, sólo aviso de reporte próximo. */}
        {isViewerFamily && phase === 'before' ? (
          <KnowCard
            title="Antes de tu clase"
            rules={PRE_CLASS_TIPS}
            style={{ marginTop: spacing.md }}
          />
        ) : null}

        {isViewerFamily &&
        phase === 'during' &&
        !timers?.msSinceStart ? null : null}

        {isViewerFamily &&
        phase === 'during' &&
        (timers?.msSinceStart ?? 0) > 0 &&
        (timers?.msSinceStart ?? 0) < POLICY_COPY.classFileMaterial.length * 0 ? null : null}

        {isViewerFamily && phase === 'after' ? (
          <View style={styles.nextAction}>
            <View style={styles.nextIcon}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={colors.primaryDark}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>Clase finalizada</Text>
              <Text style={styles.nextText}>{CLASS_FINISHED_MESSAGE}</Text>
            </View>
          </View>
        ) : null}

        {/* Solo cuando el estudiante llega tarde (clase iniciada dentro de
            los primeros minutos de tolerancia) mostramos el mensaje único. */}
        {isViewerFamily &&
        phase === 'during' &&
        (timers?.msSinceStart ?? 0) > 60 * 1000 &&
        !screenshots.length ? (
          <View style={styles.lateHint}>
            <Ionicons name="time-outline" size={14} color={colors.warning} />
            <Text style={styles.lateHintText}>{STUDENT_LATE_MESSAGE}</Text>
          </View>
        ) : null}

        {/* MATERIAL Y TEMA */}
        {phase === 'before' ? (
          <>
            <Text style={styles.section}>Material y tema</Text>
            <Card>
              {studentMaterials.length > 0 ? (
                <View style={{ gap: 6 }}>
                  <Text style={styles.smallLabel}>Archivos subidos</Text>
                  {studentMaterials.map((m) => (
                    <View key={m.id} style={styles.chip}>
                      <Ionicons
                        name="document-attach"
                        size={14}
                        color={colors.primaryDark}
                      />
                      <Text style={styles.chipText}>{m.title}</Text>
                    </View>
                  ))}
                  {record.studentMaterialSubmittedAt ? (
                    <Text style={[typography.caption, { marginTop: 4 }]}>
                      Subido a las{' '}
                      {fmtHm(new Date(record.studentMaterialSubmittedAt).getTime())}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {record.studentTopic ? (
                <View style={{ marginTop: studentMaterials.length ? spacing.md : 0 }}>
                  <Text style={styles.smallLabel}>Tema propuesto</Text>
                  <View style={styles.topicBox}>
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={14}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.topicText}>{record.studentTopic}</Text>
                  </View>
                </View>
              ) : null}

              {/* ACCIÓN 1: Subir archivo */}
              {cm.canUploadStudentMaterial ? (
                <View style={styles.actionBlock}>
                  <View style={styles.actionHeader}>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={16}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.actionTitle}>Subir archivo</Text>
                  </View>
                  <Text style={typography.caption}>
                    Opcional. Puedes subir cualquier archivo hasta 6h antes.
                  </Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      value={materialTitle}
                      onChangeText={setMaterialTitle}
                      placeholder="Nombre del archivo"
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                    />
                    <Pressable
                      onPress={() => {
                        const t = materialTitle.trim();
                        if (!t) return;
                        try {
                          cm.uploadStudentMaterial(t);
                          setMaterialTitle('');
                        } catch (e: any) {
                          Alert.alert('No se pudo subir', e?.message ?? '');
                        }
                      }}
                      style={styles.smallPrimary}
                    >
                      <Ionicons
                        name="cloud-upload-outline"
                        size={18}
                        color={colors.textOnPrimary}
                      />
                    </Pressable>
                  </View>
                  {timers ? (
                    <Text style={[typography.caption, { marginTop: 4 }]}>
                      Puedes subir archivos hasta las {fmtHm(timers.materialLockAt)}
                    </Text>
                  ) : null}
                </View>
              ) : cm.isStudent || cm.isGuardian ? (
                <View style={styles.lockCard}>
                  <View style={styles.lockHeader}>
                    <Ionicons name="lock-closed" size={16} color={colors.warning} />
                    <Text style={styles.lockTitle}>
                      {POLICY_COPY.materialClosed.title}
                    </Text>
                  </View>
                  {POLICY_COPY.materialClosed.lines.map((line, i) => (
                    <Text key={i} style={styles.lockLine}>
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}

              {/* ACCIÓN 2: Escribir tema */}
              {cm.canWriteTopic ? (
                <View style={styles.actionBlock}>
                  <View style={styles.actionHeader}>
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.actionTitle}>Escribir tema</Text>
                  </View>
                  <Text style={typography.caption}>
                    Sin adjuntos. Cuéntanos qué quieres trabajar.
                  </Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      value={topicDraft}
                      onChangeText={setTopicDraft}
                      placeholder="Ej: repasar past simple"
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                    />
                    <Pressable
                      onPress={() => {
                        const t = topicDraft.trim();
                        if (!t) return;
                        cm.setStudentTopic(t);
                        setTopicDraft('');
                      }}
                      style={styles.smallPrimary}
                    >
                      <Ionicons
                        name="save-outline"
                        size={18}
                        color={colors.textOnPrimary}
                      />
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {(cm.isStudent || cm.isGuardian) &&
              studentMaterials.length === 0 &&
              !record.studentTopic ? (
                <View style={styles.note}>
                  <Ionicons
                    name="information-circle-outline"
                    size={14}
                    color={colors.info}
                  />
                  <Text style={styles.noteText}>
                    El profesor preparará la clase con la información disponible.
                  </Text>
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        {/* DURANTE LA CLASE (profesor/admin) */}
        {cm.canManage && phase !== 'after' ? (
          <>
            <Text style={styles.section}>Durante la clase</Text>
            <Card>
              <ZoomButton
                variant="secondary"
                label={isStarted ? 'Volver a Zoom' : 'Entrar a Zoom'}
              />
              <View
                style={{ marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm }}
              >
                {!isStarted ? (
                  <Pressable onPress={() => cm.startClass()} style={styles.startBtn}>
                    <Ionicons name="play" size={16} color={colors.textOnPrimary} />
                    <Text style={styles.startText}>Iniciar clase</Text>
                  </Pressable>
                ) : !isEnded ? (
                  <Pressable
                    onPress={() =>
                      Alert.alert('Finalizar', '¿Cerrar la clase ahora?', [
                        { text: 'No', style: 'cancel' },
                        { text: 'Sí', onPress: () => cm.endClass() },
                      ])
                    }
                    style={styles.endBtn}
                  >
                    <Ionicons name="stop" size={16} color={colors.textOnPrimary} />
                    <Text style={styles.startText}>Finalizar clase</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.actionsGrid}>
                <ActionBtn
                  icon="camera"
                  label="Screenshot"
                  tone="primary"
                  onPress={() => cm.uploadScreenshot()}
                />
                <ActionBtn
                  icon="person-remove"
                  label="Estudiante ausente"
                  tone="danger"
                  onPress={() => cm.markStudentAbsent()}
                />
                <ActionBtn
                  icon="school-outline"
                  label="Profesor ausente"
                  tone="danger"
                  onPress={() => cm.markTeacherAbsent()}
                />
                <ActionBtn
                  icon="videocam-off-outline"
                  label="Sin cámara"
                  tone="warning"
                  onPress={() => cm.markNoCamera()}
                />
                <ActionBtn
                  icon="warning"
                  label="Problema técnico"
                  tone="warning"
                  onPress={() => cm.markTechnicalIssue()}
                />
              </View>
              {screenshots.length > 0 ? (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={typography.caption}>
                    Screenshots registrados: {screenshots.length}
                  </Text>
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        {/* POST CLASS: REPORTE */}
        {isEnded ? (
          <>
            <Text style={styles.section}>Reporte</Text>
            {!currentReport && cm.canManage ? (
              <Card>
                <Text style={typography.bodyStrong}>Redactar reporte</Text>
                <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                  <Field label="Tema visto" value={rTopic} onChange={setRTopic} />
                  <Field label="Objetivos" value={rObj} onChange={setRObj} />
                  <Field label="Fortalezas" value={rStr} onChange={setRStr} />
                  <Field label="Aspectos por mejorar" value={rImp} onChange={setRImp} />
                  <Field label="Tareas" value={rHw} onChange={setRHw} />
                  <Field
                    label="Observaciones para el acudiente"
                    value={rGn}
                    onChange={setRGn}
                    multiline
                  />
                </View>
                <View style={{ marginTop: spacing.md }}>
                  <Text style={typography.caption}>Adjuntos ({rAtt.length})</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginTop: 4,
                    }}
                  >
                    {rAtt.map((a, i) => (
                      <View key={i} style={styles.chip}>
                        <Ionicons name="attach" size={14} color={colors.primaryDark} />
                        <Text style={styles.chipText}>{a}</Text>
                      </View>
                    ))}
                    <Pressable
                      onPress={() =>
                        setRAtt((prev) => [
                          ...prev,
                          `adjunto-${Date.now().toString(36).slice(-4)}.pdf`,
                        ])
                      }
                      style={styles.chipAdd}
                    >
                      <Ionicons name="add" size={14} color={colors.primaryDark} />
                      <Text style={styles.chipText}>Adjuntar</Text>
                    </Pressable>
                  </View>
                </View>
                <Pressable onPress={submitReport} style={styles.primaryBtn}>
                  <Ionicons name="paper-plane" size={18} color={colors.textOnPrimary} />
                  <Text style={styles.primaryText}>Enviar reporte</Text>
                </Pressable>
              </Card>
            ) : currentReport ? (
              <Card>
                <View style={styles.rowSpread}>
                  <Text style={typography.bodyStrong}>{currentReport.topic}</Text>
                  <StatusBadge
                    tone={reportTone(currentReport.status)}
                    label={reportLabel(currentReport.status)}
                  />
                </View>
                <ReportField label="Objetivos" value={currentReport.objectives} />
                <ReportField label="Fortalezas" value={currentReport.strengths} />
                <ReportField
                  label="Aspectos por mejorar"
                  value={currentReport.improvements}
                />
                <ReportField label="Tareas" value={currentReport.homework ?? ''} />
                <ReportField
                  label="Para el acudiente"
                  value={currentReport.guardianNotes ?? ''}
                />
                {currentReport.attachments.length > 0 ? (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={typography.caption}>Adjuntos</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      {currentReport.attachments.map((a, i) => (
                        <View key={i} style={styles.chip}>
                          <Ionicons name="attach" size={14} color={colors.primaryDark} />
                          <Text style={styles.chipText}>{a}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
                {cm.canConfirmReport && currentReport.status === 'sent' ? (
                  <Pressable onPress={() => cm.markReportRead()} style={styles.secondaryBtn}>
                    <Ionicons name="eye" size={16} color={colors.primaryDark} />
                    <Text style={styles.secondaryText}>Marcar como leído</Text>
                  </Pressable>
                ) : null}
                {cm.canConfirmReport &&
                (currentReport.status === 'read' || currentReport.status === 'sent') ? (
                  <Pressable onPress={() => cm.confirmReport()} style={styles.primaryBtn}>
                    <Ionicons name="checkmark-done" size={18} color={colors.textOnPrimary} />
                    <Text style={styles.primaryText}>Confirmar reporte</Text>
                  </Pressable>
                ) : null}
              </Card>
            ) : (
              <Card>
                <Text style={typography.caption}>
                  El profesor aún no envía el reporte.
                </Text>
              </Card>
            )}

            {cm.canManage ? (
              <>
                <Text style={styles.section}>Enviar material</Text>
                <Card>
                  <View style={styles.inputRow}>
                    <TextInput
                      value={teacherMaterialTitle}
                      onChangeText={setTeacherMaterialTitle}
                      placeholder="Nombre del material"
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                    />
                    <Pressable
                      onPress={() => {
                        const t = teacherMaterialTitle.trim();
                        if (!t) return;
                        cm.sendTeacherMaterial(t);
                        setTeacherMaterialTitle('');
                      }}
                      style={styles.smallPrimary}
                    >
                      <Ionicons name="send" size={18} color={colors.textOnPrimary} />
                    </Pressable>
                  </View>
                  {teacherMaterials.length > 0 ? (
                    <View style={{ marginTop: spacing.sm, gap: 6 }}>
                      {teacherMaterials.map((m) => (
                        <View key={m.id} style={styles.chip}>
                          <Ionicons name="document" size={14} color={colors.primaryDark} />
                          <Text style={styles.chipText}>{m.title}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Card>
              </>
            ) : null}
          </>
        ) : null}

        {/* TIMELINE */}
        <Text style={styles.section}>Línea de tiempo</Text>
        <ClassTimeline events={events} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View>
      <Text style={typography.caption}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 60, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

function ReportField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={typography.body}>{value}</Text>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: string;
  label: string;
  tone: 'primary' | 'warning' | 'danger';
  onPress: () => void;
}) {
  const TONES = {
    primary: { bg: colors.primarySoft, fg: colors.primaryDark },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  } as const;
  const t = TONES[tone];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: t.bg },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={icon as any} size={18} color={t.fg} />
      <Text style={{ color: t.fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSub: {
    fontSize: 12,
    color: colors.textSubtle,
    fontWeight: '500',
    marginTop: 2,
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  serviceTagText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 11,
  },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.md,
  },
  heroSubject: { color: colors.textOnPrimary, fontSize: 22, fontWeight: '700' },
  heroTime: { color: colors.primarySoft, fontSize: 14, marginTop: 4 },
  heroLine: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 14 },
  heroSub: { color: colors.primarySoft, fontSize: 12 },
  countBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  countText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 13 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },

  // Próxima acción
  nextAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  nextIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextLabel: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  nextText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
  },

  // Entrar a la clase
  enterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: radius.lg,
    ...shadow.md,
  },
  enterText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 17 },
  enterNote: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: 6,
    color: colors.textMuted,
  },

  // Balance
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  balanceValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  balanceNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  balanceUnit: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  buyText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 13 },

  // Labels
  smallLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
  },

  // Rules
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  ruleText: { flex: 1, ...typography.body, color: colors.text, lineHeight: 22, fontSize: 14 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  linkText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
    textDecorationLine: 'underline',
  },

  // Action blocks (Subir archivo / Escribir tema)
  actionBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  actionTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 15,
  },

  // Rest
  section: { ...typography.h3, marginTop: spacing.lg, marginBottom: spacing.md },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  evidenceThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSpread: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  chipAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.primaryDark, fontWeight: '600', fontSize: 12 },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallPrimary: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  lockText: { color: colors.warning, fontWeight: '600', fontSize: 12, flex: 1 },
  lockCard: {
    marginTop: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  lockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  lockTitle: {
    color: colors.warning,
    fontWeight: '700',
    fontSize: 14,
  },
  lockLine: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  topicBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.sm,
  },
  topicText: { color: colors.primaryDark, fontWeight: '600', fontSize: 13, flex: 1 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  noteText: { color: colors.info, fontSize: 12, fontWeight: '600', flex: 1 },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.success,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  endBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.danger,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  startText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 14 },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'flex-start',
    gap: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  primaryText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  secondaryText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  lateHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  lateHintText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
