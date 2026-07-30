import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { Button, Card, StatusBadge } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import {
  hydrateStudents,
  getStudents,
  subscribeStudents,
} from '@/services/studentsService';
import { hydrateSubjects, getSubjects } from '@/services/subjectsService';
import {
  generateGlobalReport,
  buildPrintableHtml,
  GLOBAL_REPORT_PERIODS,
  SECTION_META,
  AI_DISCLAIMER,
  type GlobalReportData,
  type GlobalReportPeriod,
} from '@/services/globalReportService';
import type { StudentFull } from '@/repositories/students';

// ============================================================================
// Reporte Global del Estudiante (Beta) · solo admin.
// Reutiliza servicios existentes (students, subjects) y la Edge Function
// generate-global-report que llama a OnSpace AI (gemini-2.5-flash-lite).
//
// Flujo:
//   1. Admin selecciona estudiante, materia (opcional) y periodo.
//   2. Pulsa "Generar reporte global". La IA se ejecuta solo en ese momento.
//   3. Ve el reporte en pantalla, puede Descargar PDF o Generar nuevamente.
// ============================================================================

export default function GlobalReportScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Gate: solo admin.
  const role = (user as any)?.role as string | undefined;
  const isAdmin = role === 'admin';

  const [studentQuery, setStudentQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentFull | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<GlobalReportPeriod>(
    GLOBAL_REPORT_PERIODS[2], // 90 dias por defecto
  );
  const [subjects, setSubjects] = useState<string[]>(() => getSubjects());
  const [students, setStudents] = useState<StudentFull[]>(() => getStudents());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<GlobalReportData | null>(null);

  useEffect(() => {
    hydrateStudents().then(() => setStudents(getStudents())).catch(() => {});
    hydrateSubjects().then(() => setSubjects(getSubjects())).catch(() => {});
    const unsub = subscribeStudents(() => setStudents(getStudents()));
    return unsub;
  }, []);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    const all = students.filter((s) => s.active !== false);
    if (!q) return all.slice(0, 20);
    return all
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          (s.firstName ?? '').toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [students, studentQuery]);

  const canGenerate = !!selectedStudent && !loading;

  const handleGenerate = useCallback(async () => {
    if (!selectedStudent) return;
    setLoading(true);
    setError(null);
    setReport(null);
    const res = await generateGlobalReport({
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      periodDays: selectedPeriod.days,
      subjectFilter: selectedSubject,
    });
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? 'No se pudo generar el reporte.');
      return;
    }
    setReport(res.data);
  }, [selectedStudent, selectedPeriod, selectedSubject]);

  const handleReset = () => {
    setReport(null);
    setError(null);
  };

  const handleDownload = useCallback(async () => {
    if (!report) return;
    const html = buildPrintableHtml(report);
    if (Platform.OS === 'web') {
      try {
        const w: any = typeof window !== 'undefined' ? window : null;
        if (!w) return;
        const printWin = w.open('', '_blank', 'noopener,noreferrer');
        if (!printWin) return;
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        setTimeout(() => {
          try {
            printWin.focus();
            printWin.print();
          } catch {
            // no-op
          }
        }, 400);
      } catch (err) {
        console.warn('[global-report.handleDownload] web print error', err);
      }
      return;
    }
    // Mobile: comparte el contenido en texto plano (PDF nativo requiere
    // expo-print no disponible en el bundle actual; se puede migrar en v1.1).
    try {
      const textVersion = SECTION_META.map(
        (m, i) => `${i + 1}. ${m.title}\n${report.sections[m.key]}`,
      ).join('\n\n');
      await Share.share({
        title: `Reporte Global - ${report.studentName}`,
        message: `Reporte Global del Estudiante\n${report.studentName} - ${report.period}\n\n${textVersion}\n\n${AI_DISCLAIMER}`,
      });
    } catch (err) {
      console.warn('[global-report.handleDownload] share error', err);
    }
  }, [report]);

  if (!isAdmin) {
    return (
      <SafeAreaView style={s.safe}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={typography.h2}>Reporte Global</Text>
          </View>
        </View>
        <View style={{ padding: spacing.lg }}>
          <Card>
            <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.lg }}>
              <Ionicons name="lock-closed-outline" size={32} color={colors.textMuted} />
              <Text style={typography.h3}>Acceso restringido</Text>
              <Text style={typography.caption}>
                Esta funcion beta esta disponible unicamente para el rol Administrador.
              </Text>
            </View>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <Text style={typography.h2}>Reporte Global del Estudiante</Text>
            <View style={s.betaBadge}>
              <Text style={s.betaText}>BETA</Text>
            </View>
          </View>
          <Text style={typography.caption}>
            Resumen integral generado a partir de los reportes academicos existentes.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* -------- Selectores -------- */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Estudiante</Text>
          <View style={s.inputWrap}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={studentQuery}
              onChangeText={setStudentQuery}
              placeholder="Buscar por nombre..."
              placeholderTextColor={colors.textMuted}
              style={s.input}
              editable={!loading && !report}
            />
            {selectedStudent ? (
              <Pressable
                onPress={() => {
                  setSelectedStudent(null);
                  setStudentQuery('');
                }}
                hitSlop={8}
                disabled={loading || !!report}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          {selectedStudent ? (
            <View style={s.selectedRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={s.selectedText}>{selectedStudent.fullName}</Text>
              <Text style={s.selectedMeta}>{selectedStudent.grade}</Text>
            </View>
          ) : filteredStudents.length > 0 ? (
            <View style={s.suggestions}>
              {filteredStudents.map((st) => (
                <Pressable
                  key={st.id}
                  onPress={() => {
                    setSelectedStudent(st);
                    setStudentQuery(st.fullName);
                  }}
                  style={({ pressed }) => [s.suggestionRow, pressed && { opacity: 0.85 }]}
                  disabled={loading || !!report}
                >
                  <Ionicons name="person-circle-outline" size={18} color={colors.primaryDark} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.suggestionName}>{st.fullName}</Text>
                    <Text style={s.suggestionMeta}>{st.grade}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={typography.caption}>Sin coincidencias.</Text>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Materia</Text>
          <View style={s.chipRow}>
            <Chip
              label="Todas"
              active={selectedSubject === null}
              onPress={() => setSelectedSubject(null)}
              disabled={loading || !!report}
            />
            {subjects.map((sub) => (
              <Chip
                key={sub}
                label={sub}
                active={selectedSubject === sub}
                onPress={() => setSelectedSubject(sub)}
                disabled={loading || !!report}
              />
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Periodo</Text>
          <View style={s.chipRow}>
            {GLOBAL_REPORT_PERIODS.map((p) => (
              <Chip
                key={p.key}
                label={p.label}
                active={selectedPeriod.key === p.key}
                onPress={() => setSelectedPeriod(p)}
                disabled={loading || !!report}
              />
            ))}
          </View>
        </View>

        {/* -------- CTA / Estados -------- */}
        {!report ? (
          <View style={{ gap: spacing.md }}>
            <Button
              label={loading ? 'Generando reporte...' : 'Generar reporte global'}
              leftIcon={loading ? undefined : 'sparkles'}
              onPress={handleGenerate}
              disabled={!canGenerate}
              size="lg"
            />
            {loading ? (
              <View style={s.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={typography.caption}>
                  Analizando los reportes disponibles con IA. Esto suele tardar unos segundos.
                </Text>
              </View>
            ) : null}
            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}
            <Text style={s.disclaimer}>{AI_DISCLAIMER}</Text>
          </View>
        ) : (
          <ReportView report={report} onDownload={handleDownload} onReset={handleReset} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.chip,
        active && s.chipActive,
        pressed && !disabled && { opacity: 0.85 },
        disabled && { opacity: 0.6 },
      ]}
    >
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ReportView({
  report,
  onDownload,
  onReset,
}: {
  report: GlobalReportData;
  onDownload: () => void;
  onReset: () => void;
}) {
  const fecha = new Date(report.generatedAt).toLocaleString('es-PA');
  return (
    <View style={{ gap: spacing.md }}>
      <View style={s.reportHead}>
        <View style={s.reportHeadIcon}>
          <Ionicons name="document-text" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Reporte Global · Wordlish</Text>
          <Text style={typography.h3}>{report.studentName}</Text>
          <View style={s.metaChipsRow}>
            <StatusBadge label={report.period} tone="info" />
            <StatusBadge label={report.subjectLabel} tone="primary" />
            <StatusBadge
              label={`${report.reportsUsed} ${report.reportsUsed === 1 ? 'reporte' : 'reportes'}`}
              tone="success"
            />
          </View>
          <Text style={s.reportMeta}>Actualizado {fecha}</Text>
        </View>
      </View>

      <View style={s.actionsRow}>
        <Button
          label="Descargar PDF"
          leftIcon="download-outline"
          onPress={onDownload}
          variant="solid"
          size="md"
          fullWidth={false}
        />
        <Button
          label="Generar nuevamente"
          leftIcon="refresh"
          onPress={onReset}
          variant="ghost"
          size="md"
          fullWidth={false}
        />
      </View>

      <View style={s.sectionsWrap}>
        {SECTION_META.map((m, idx) => (
          <View key={m.key} style={s.sectionCard}>
            <View style={s.sectionCardHead}>
              <View style={s.sectionNum}>
                <Text style={s.sectionNumText}>{idx + 1}</Text>
              </View>
              <Ionicons name={m.icon as any} size={16} color={colors.primary} />
              <Text style={s.sectionCardTitle}>{m.title}</Text>
            </View>
            <Text style={s.sectionCardBody}>{report.sections[m.key]}</Text>
          </View>
        ))}
      </View>

      <View style={s.disclaimerBox}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
        <Text style={s.disclaimer}>{AI_DISCLAIMER}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  betaBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  betaText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 1,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSubtle,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
    padding: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
  },
  selectedText: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 14 },
  selectedMeta: { fontSize: 12, color: colors.textMuted },

  suggestions: {
    marginTop: 4,
    gap: 2,
    maxHeight: 220,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  suggestionName: { fontSize: 14, fontWeight: '700', color: colors.text },
  suggestionMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.textSubtle },
  chipTextActive: { color: colors.textOnPrimary },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 13, fontWeight: '600' },

  disclaimer: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },

  reportHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  reportHeadIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  reportMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },

  sectionsWrap: { gap: spacing.sm },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
  },
  sectionCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  sectionCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  sectionCardBody: {
    fontSize: 13,
    color: colors.textSubtle,
    lineHeight: 20,
  },
});
