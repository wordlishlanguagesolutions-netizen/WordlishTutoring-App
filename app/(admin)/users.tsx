import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, Avatar, Modal, StatusBadge } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import {
  teacherRatesConfig,
  getYearRates,
  getRate,
  formatAmount,
  TIER_LABEL,
  KIND_LABEL,
  type TeacherTier,
} from '@/services/teacherRatesConfig';

// ============================================================================
// Panel de Usuarios · Solo Administrador.
//
// Objetivo: en un clic, ver el resumen ejecutivo del usuario según su rol.
// Estudiantes, profesores, acudientes y supervisores NO acceden a esta vista.
//
// Composición:
//   1. Filtro por rol (chips) + búsqueda.
//   2. Lista compacta de usuarios con estado + acción principal.
//   3. Modal de detalle con métricas clave arriba y secciones expandibles.
//
// Diseño: Premium · minimalista. Métricas prioritarias visibles al abrir,
// el resto queda plegado detrás de secciones colapsables.
// ============================================================================

type Role = 'teacher' | 'student' | 'guardian' | 'admin';

interface BaseUser {
  id: string;
  role: Role;
  name: string;
  firstName: string;
  email: string;
  avatar?: string;
  active: boolean;
  joinedAt: string;
}

interface TeacherRecord extends BaseUser {
  role: 'teacher';
  tier: TeacherTier;
  specialties: string[];
  hoursThisMonth: number;
  hoursHistorical: number;
  groupClasses: number;
  individualClasses: number;
  paidThisMonth: number;
  paidHistorical: number;
  tardies: number;
  absences: number;
  cancellations: number;
  punctualityPct: number;
  rating: number | null;
  studentRequested: number;
  autoAssigned: number;
}

interface StudentRecord extends BaseUser {
  role: 'student';
  hoursAvailable: number;
  hoursConsumed: number;
  nextClass: string | null;
  subjects: string[];
  mainTeacher: string;
  totalClasses: number;
  tardies: number;
  cancellations: number;
  attendancePct: number;
  recentPayments: { concept: string; amount: number; date: string }[];
  recentReports: { topic: string; teacher: string; date: string }[];
}

interface GuardianRecord extends BaseUser {
  role: 'guardian';
  linkedStudents: { name: string; hoursAvailable: number }[];
  recentReports: { student: string; topic: string; date: string }[];
  paymentsHistory: { concept: string; amount: number; date: string }[];
}

interface AdminRecord extends BaseUser {
  role: 'admin';
}

type AnyUser = TeacherRecord | StudentRecord | GuardianRecord | AdminRecord;

// ─── Mock de usuarios con métricas administrativas ──────────────────────────
const USERS: AnyUser[] = [
  {
    id: 'u-admin-1', role: 'admin', name: 'Ana Administradora', firstName: 'Ana',
    email: 'ana@wordlish.com', active: true, joinedAt: '01 Ene 2025',
  },
  {
    id: 't1', role: 'teacher', name: 'Prof. Carlos Ríos', firstName: 'Carlos',
    email: 'carlos@wordlish.com', avatar: 'https://i.pravatar.cc/150?img=68',
    active: true, joinedAt: '15 Mar 2024',
    tier: 'specialist',
    specialties: ['Inglés Básico', 'Inglés Intermedio', 'Conversación'],
    hoursThisMonth: 42, hoursHistorical: 428,
    groupClasses: 6, individualClasses: 36,
    paidThisMonth: 580, paidHistorical: 5940,
    tardies: 1, absences: 0, cancellations: 2,
    punctualityPct: 97.6, rating: 4.8,
    studentRequested: 18, autoAssigned: 24,
  },
  {
    id: 't2', role: 'teacher', name: 'Prof. María Luna', firstName: 'María',
    email: 'maria@wordlish.com', avatar: 'https://i.pravatar.cc/150?img=48',
    active: true, joinedAt: '02 Sep 2024',
    tier: 'essentials',
    specialties: ['Inglés Básico', 'Francés Intermedio'],
    hoursThisMonth: 28, hoursHistorical: 186,
    groupClasses: 3, individualClasses: 25,
    paidThisMonth: 390, paidHistorical: 2610,
    tardies: 3, absences: 1, cancellations: 4,
    punctualityPct: 89.2, rating: 4.4,
    studentRequested: 7, autoAssigned: 21,
  },
  {
    id: 't3', role: 'teacher', name: 'Prof. Ana Vega', firstName: 'Ana',
    email: 'ana.vega@wordlish.com', avatar: 'https://i.pravatar.cc/150?img=44',
    active: false, joinedAt: '10 Feb 2023',
    tier: 'specialist',
    specialties: ['Inglés Business'],
    hoursThisMonth: 0, hoursHistorical: 812,
    groupClasses: 12, individualClasses: 68,
    paidThisMonth: 0, paidHistorical: 11220,
    tardies: 2, absences: 3, cancellations: 5,
    punctualityPct: 96.4, rating: 4.9,
    studentRequested: 42, autoAssigned: 38,
  },
  {
    id: 's1', role: 'student', name: 'Lucía Estudiante', firstName: 'Lucía',
    email: 'lucia@familia.com', avatar: 'https://i.pravatar.cc/150?img=47',
    active: true, joinedAt: '01 Jun 2025',
    hoursAvailable: 7, hoursConsumed: 25,
    nextClass: 'Hoy · 10:00 AM',
    subjects: ['Inglés Básico', 'Conversación'],
    mainTeacher: 'Prof. Carlos Ríos',
    totalClasses: 32, tardies: 1, cancellations: 2, attendancePct: 96.8,
    recentPayments: [
      { concept: 'Paquete 8 horas', amount: 110, date: '01 Jul 2026' },
      { concept: 'Paquete 4 horas', amount: 60, date: '15 Jun 2026' },
    ],
    recentReports: [
      { topic: 'Present Simple', teacher: 'Prof. Carlos Ríos', date: '10 Jul 2026' },
      { topic: 'Vocabulary review', teacher: 'Prof. María Luna', date: '08 Jul 2026' },
    ],
  },
  {
    id: 's2', role: 'student', name: 'Diego Pérez', firstName: 'Diego',
    email: 'diego@familia.com', avatar: 'https://i.pravatar.cc/150?img=12',
    active: true, joinedAt: '15 Ene 2026',
    hoursAvailable: 3, hoursConsumed: 12,
    nextClass: 'Mañana · 04:00 PM',
    subjects: ['Inglés Intermedio'],
    mainTeacher: 'Prof. María Luna',
    totalClasses: 15, tardies: 0, cancellations: 1, attendancePct: 100,
    recentPayments: [
      { concept: 'Paquete 4 horas', amount: 60, date: '20 Jun 2026' },
    ],
    recentReports: [
      { topic: 'Past Tense', teacher: 'Prof. María Luna', date: '05 Jul 2026' },
    ],
  },
  {
    id: 'g1', role: 'guardian', name: 'Marta Acudiente', firstName: 'Marta',
    email: 'marta@familia.com', avatar: 'https://i.pravatar.cc/150?img=32',
    active: true, joinedAt: '01 Jun 2025',
    linkedStudents: [
      { name: 'Lucía Estudiante', hoursAvailable: 7 },
      { name: 'Pablo Estudiante', hoursAvailable: 3 },
    ],
    recentReports: [
      { student: 'Lucía', topic: 'Present Simple', date: '10 Jul 2026' },
      { student: 'Pablo', topic: 'Colors and shapes', date: '05 Jul 2026' },
    ],
    paymentsHistory: [
      { concept: 'Paquete 8 horas · Lucía', amount: 110, date: '01 Jul 2026' },
      { concept: 'Paquete 8 horas · Pablo', amount: 110, date: '01 Jul 2026' },
      { concept: 'Paquete 4 horas · Lucía', amount: 60, date: '15 Jun 2026' },
    ],
  },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  teacher: 'Profesor',
  student: 'Estudiante',
  guardian: 'Acudiente',
};

const ROLE_TONE: Record<Role, 'primary' | 'info' | 'success' | 'warning'> = {
  admin: 'primary',
  teacher: 'info',
  student: 'success',
  guardian: 'warning',
};

type Filter = 'all' | Role;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'teacher', label: 'Profesores' },
  { key: 'student', label: 'Estudiantes' },
  { key: 'guardian', label: 'Acudientes' },
];

// ============================================================================
export default function UsersScreen() {
  const { isDesktop } = useResponsive();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === 'all' ? USERS : USERS.filter((u) => u.role === filter)),
    [filter],
  );

  const selected = useMemo(
    () => USERS.find((u) => u.id === selectedId) ?? null,
    [selectedId],
  );

  const counts = useMemo(() => {
    return {
      teacher: USERS.filter((u) => u.role === 'teacher').length,
      student: USERS.filter((u) => u.role === 'student').length,
      guardian: USERS.filter((u) => u.role === 'guardian').length,
    };
  }, []);

  return (
    <Screen>
      <Header
        title="Usuarios"
        subtitle="Panel administrativo · resumen ejecutivo por usuario"
      />

      {/* KPIs de la comunidad */}
      <View style={styles.summaryRow}>
        <SummaryTile label="Profesores" value={counts.teacher} icon="school" tone="info" />
        <SummaryTile label="Estudiantes" value={counts.student} icon="people" tone="success" />
        <SummaryTile label="Acudientes" value={counts.guardian} icon="heart" tone="warning" />
      </View>

      {/* Filtro por rol */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Lista */}
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {filtered.map((u) => (
          <UserRow key={u.id} user={u} onPress={() => setSelectedId(u.id)} />
        ))}
      </View>

      {/* Detalle */}
      <Modal
        visible={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name}
        subtitle={selected ? ROLE_LABEL[selected.role] : ''}
        scrollable
      >
        {selected ? <UserDetail user={selected} /> : null}
      </Modal>
    </Screen>
  );
}

// ─── Fila de usuario ────────────────────────────────────────────────────────
function UserRow({ user, onPress }: { user: AnyUser; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
    >
      <Avatar name={user.name} uri={user.avatar} size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowName} numberOfLines={1}>{user.name}</Text>
        <Text style={styles.rowEmail} numberOfLines={1}>{user.email}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <StatusBadge
          label={ROLE_LABEL[user.role]}
          tone={ROLE_TONE[user.role]}
        />
        {!user.active ? (
          <Text style={styles.inactiveText}>Inactivo</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

// ─── Tile resumen top ───────────────────────────────────────────────────────
function SummaryTile({
  label, value, icon, tone,
}: {
  label: string; value: number; icon: string;
  tone: 'primary' | 'info' | 'success' | 'warning';
}) {
  const TONES = {
    primary: { bg: colors.surfaceTinted, fg: colors.primary },
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
  };
  const t = TONES[tone];
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon as any} size={16} color={t.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.tileValue}>{value}</Text>
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ============================================================================
// Detalle de usuario
// ============================================================================
function UserDetail({ user }: { user: AnyUser }) {
  return (
    <View style={{ gap: spacing.md }}>
      <IdentityBlock user={user} />
      {user.role === 'teacher' ? <TeacherDetail t={user} /> : null}
      {user.role === 'student' ? <StudentDetail s={user} /> : null}
      {user.role === 'guardian' ? <GuardianDetail g={user} /> : null}
      {user.role === 'admin' ? (
        <View style={styles.emptyPanel}>
          <Ionicons name="shield-checkmark" size={22} color={colors.primaryDark} />
          <Text style={styles.emptyPanelText}>
            Cuenta administrativa. Sin métricas operativas asociadas.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Identidad · presente en todos los roles ─────────────────────────────────
function IdentityBlock({ user }: { user: AnyUser }) {
  return (
    <View style={styles.identity}>
      <Avatar name={user.name} uri={user.avatar} size={64} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={styles.identityTop}>
          <StatusBadge
            label={user.active ? 'Activo' : 'Inactivo'}
            tone={user.active ? 'success' : 'muted'}
          />
          <StatusBadge label={ROLE_LABEL[user.role]} tone={ROLE_TONE[user.role]} />
        </View>
        <Text style={styles.identityEmail}>{user.email}</Text>
        <Text style={styles.identityMeta}>Ingreso · {user.joinedAt}</Text>
      </View>
    </View>
  );
}

// ── Profesor ────────────────────────────────────────────────────────────────
function TeacherDetail({ t }: { t: TeacherRecord }) {
  return (
    <>
      <SectionLabel>Métricas clave</SectionLabel>
      <View style={styles.kpiGrid}>
        <MetricCard icon="time" tone="info" label="Horas este mes" value={`${t.hoursThisMonth} h`} />
        <MetricCard icon="cash" tone="success" label="Pagado este mes" value={`$${t.paidThisMonth}`} />
        <MetricCard icon="trending-up" tone="primary" label="Puntualidad" value={`${t.punctualityPct.toFixed(1)}%`} />
        <MetricCard
          icon="star" tone="warning"
          label="Calificación"
          value={t.rating != null ? t.rating.toFixed(1) : '—'}
        />
      </View>

      <TeacherRateBlock t={t} />

      <ExpandableSection title="Especialidades" icon="bookmarks-outline" defaultOpen>
        <View style={styles.tagRow}>
          {t.specialties.map((s) => (
            <View key={s} style={styles.tag}>
              <Text style={styles.tagText}>{s}</Text>
            </View>
          ))}
        </View>
      </ExpandableSection>

      <ExpandableSection title="Volumen de clases" icon="calendar-outline">
        <DataRow label="Horas históricas" value={`${t.hoursHistorical} h`} />
        <DataRow label="Clases individuales" value={`${t.individualClasses}`} />
        <DataRow label="Clases grupales" value={`${t.groupClasses}`} />
      </ExpandableSection>

      <ExpandableSection title="Cumplimiento" icon="alert-circle-outline">
        <DataRow label="Tardanzas" value={`${t.tardies}`} tone={t.tardies > 2 ? 'warning' : 'default'} />
        <DataRow label="Ausencias" value={`${t.absences}`} tone={t.absences > 0 ? 'danger' : 'default'} />
        <DataRow label="Clases canceladas" value={`${t.cancellations}`} tone={t.cancellations > 3 ? 'warning' : 'default'} />
      </ExpandableSection>

      <ExpandableSection title="Preferencia y asignación" icon="people-outline">
        <DataRow label="Solicitado por estudiantes" value={`${t.studentRequested}×`} />
        <DataRow label="Asignado automáticamente" value={`${t.autoAssigned}×`} />
        <DataRow label="Pagado histórico" value={`$${t.paidHistorical.toLocaleString()}`} />
      </ExpandableSection>

      <QuickLinks
        onHistory={() => Alert.alert('Historial de clases', `Abriendo historial de ${t.name}...`)}
        onPayments={() => Alert.alert('Pagos del profesor', `Abriendo pagos de ${t.name}...`)}
      />
    </>
  );
}

// ── Estudiante ──────────────────────────────────────────────────────────────
function StudentDetail({ s }: { s: StudentRecord }) {
  return (
    <>
      <SectionLabel>Métricas clave</SectionLabel>
      <View style={styles.kpiGrid}>
        <MetricCard icon="hourglass" tone="primary" label="Horas disponibles" value={`${s.hoursAvailable}`} />
        <MetricCard icon="checkmark-done" tone="info" label="Horas consumidas" value={`${s.hoursConsumed}`} />
        <MetricCard icon="calendar" tone="success" label="Asistencia" value={`${s.attendancePct.toFixed(1)}%`} />
        <MetricCard icon="school" tone="warning" label="Clases totales" value={`${s.totalClasses}`} />
      </View>

      <ExpandableSection title="Situación actual" icon="pulse-outline" defaultOpen>
        <DataRow label="Próxima clase" value={s.nextClass ?? 'Sin agendar'} />
        <DataRow label="Profesor principal" value={s.mainTeacher} />
        <View style={{ marginTop: spacing.sm }}>
          <Text style={styles.subLabel}>Materias activas</Text>
          <View style={styles.tagRow}>
            {s.subjects.map((subj) => (
              <View key={subj} style={styles.tag}>
                <Text style={styles.tagText}>{subj}</Text>
              </View>
            ))}
          </View>
        </View>
      </ExpandableSection>

      <ExpandableSection title="Cumplimiento" icon="alert-circle-outline">
        <DataRow label="Tardanzas" value={`${s.tardies}`} tone={s.tardies > 2 ? 'warning' : 'default'} />
        <DataRow label="Cancelaciones" value={`${s.cancellations}`} tone={s.cancellations > 3 ? 'warning' : 'default'} />
      </ExpandableSection>

      <ExpandableSection title="Últimos reportes" icon="document-text-outline">
        {s.recentReports.map((r, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.listItemTitle}>{r.topic}</Text>
            <Text style={styles.listItemMeta}>{r.teacher} · {r.date}</Text>
          </View>
        ))}
      </ExpandableSection>

      <ExpandableSection title="Historial de pagos" icon="card-outline">
        {s.recentPayments.map((p, i) => (
          <View key={i} style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listItemTitle}>{p.concept}</Text>
              <Text style={styles.listItemMeta}>{p.date}</Text>
            </View>
            <Text style={styles.amount}>${p.amount}</Text>
          </View>
        ))}
      </ExpandableSection>
    </>
  );
}

// ── Acudiente ───────────────────────────────────────────────────────────────
function GuardianDetail({ g }: { g: GuardianRecord }) {
  const totalHours = g.linkedStudents.reduce((sum, s) => sum + s.hoursAvailable, 0);
  const totalSpent = g.paymentsHistory.reduce((sum, p) => sum + p.amount, 0);
  return (
    <>
      <SectionLabel>Métricas clave</SectionLabel>
      <View style={styles.kpiGrid}>
        <MetricCard icon="people" tone="primary" label="Estudiantes" value={`${g.linkedStudents.length}`} />
        <MetricCard icon="hourglass" tone="info" label="Horas disponibles" value={`${totalHours}`} />
        <MetricCard icon="cash" tone="success" label="Total pagado" value={`$${totalSpent}`} />
        <MetricCard icon="document-text" tone="warning" label="Reportes recientes" value={`${g.recentReports.length}`} />
      </View>

      <ExpandableSection title="Estudiantes asociados" icon="people-outline" defaultOpen>
        {g.linkedStudents.map((st, i) => (
          <View key={i} style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listItemTitle}>{st.name}</Text>
              <Text style={styles.listItemMeta}>
                {st.hoursAvailable} {st.hoursAvailable === 1 ? 'hora' : 'horas'} disponibles
              </Text>
            </View>
          </View>
        ))}
      </ExpandableSection>

      <ExpandableSection title="Últimos reportes" icon="document-text-outline">
        {g.recentReports.map((r, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.listItemTitle}>{r.topic}</Text>
            <Text style={styles.listItemMeta}>{r.student} · {r.date}</Text>
          </View>
        ))}
      </ExpandableSection>

      <ExpandableSection title="Historial de pagos" icon="card-outline">
        {g.paymentsHistory.map((p, i) => (
          <View key={i} style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listItemTitle}>{p.concept}</Text>
              <Text style={styles.listItemMeta}>{p.date}</Text>
            </View>
            <Text style={styles.amount}>${p.amount}</Text>
          </View>
        ))}
      </ExpandableSection>
    </>
  );
}

// ─── Tarifa por hora vigente del profesor ───────────────────────────────────
function TeacherRateBlock({ t }: { t: TeacherRecord }) {
  const year = teacherRatesConfig.currentYear;
  const yearData = getYearRates(year);
  const individual = getRate(year, t.tier, 'individual');
  const group = getRate(year, t.tier, 'group');
  const currency = yearData?.currency ?? 'COP';

  return (
    <View style={rateStyles.wrap}>
      <View style={rateStyles.head}>
        <View style={rateStyles.headIcon}>
          <Ionicons
            name={t.tier === 'specialist' ? 'ribbon' : 'school'}
            size={16}
            color={colors.primary}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={rateStyles.headTitle}>Tarifa por hora</Text>
          <Text style={rateStyles.headMeta}>
            Categoría {TIER_LABEL[t.tier]} · {year}
          </Text>
        </View>
        <StatusBadge
          label={TIER_LABEL[t.tier]}
          tone={t.tier === 'specialist' ? 'primary' : 'info'}
        />
      </View>
      <View style={rateStyles.grid}>
        <View style={rateStyles.cell}>
          <Text style={rateStyles.cellLabel}>{KIND_LABEL.individual}</Text>
          <Text style={rateStyles.cellValue}>
            {individual ? formatAmount(individual.amount, currency) : '—'}
          </Text>
          <Text style={rateStyles.cellHint}>por hora dictada</Text>
        </View>
        <View style={rateStyles.cell}>
          <Text style={rateStyles.cellLabel}>{KIND_LABEL.group}</Text>
          <Text style={rateStyles.cellValue}>
            {group ? formatAmount(group.amount, currency) : '—'}
          </Text>
          {group?.underReview ? (
            <StatusBadge label="En evaluación" tone="warning" />
          ) : (
            <Text style={rateStyles.cellHint}>por hora dictada</Text>
          )}
        </View>
      </View>
      <Text style={rateStyles.footer}>
        Configura estos montos desde Ajustes · Tarifas por hora · Profesores.
      </Text>
    </View>
  );
}

// ─── Piezas reutilizables ───────────────────────────────────────────────────
function MetricCard({
  icon, tone, label, value,
}: {
  icon: string;
  tone: 'primary' | 'info' | 'success' | 'warning' | 'danger';
  label: string;
  value: string;
}) {
  const TONES = {
    primary: { bg: colors.surfaceTinted, fg: colors.primary },
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  };
  const t = TONES[tone];
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon as any} size={16} color={t.fg} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ExpandableSection({
  title, icon, defaultOpen = false, children,
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.section}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.sectionHead, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name={icon as any} size={16} color={colors.primaryDark} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textMuted}
        />
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function DataRow({
  label, value, tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'danger';
}) {
  const valColor =
    tone === 'warning' ? colors.warning :
    tone === 'danger' ? colors.danger :
    colors.textStrong;
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={[styles.dataValue, { color: valColor }]}>{value}</Text>
    </View>
  );
}

function QuickLinks({
  onHistory, onPayments,
}: {
  onHistory: () => void;
  onPayments: () => void;
}) {
  return (
    <View style={styles.quickRow}>
      <Pressable
        onPress={onHistory}
        style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.primaryDark} />
        <Text style={styles.quickBtnText}>Historial de clases</Text>
      </Pressable>
      <Pressable
        onPress={onPayments}
        style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="card-outline" size={16} color={colors.primaryDark} />
        <Text style={styles.quickBtnText}>Pagos</Text>
      </Pressable>
    </View>
  );
}

// ============================================================================
const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.xs,
  },
  tileIcon: {
    width: 32, height: 32, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  tileValue: {
    ...typography.bodyStrong, fontSize: 18, lineHeight: 22,
  },
  tileLabel: {
    ...typography.caption, fontSize: 12, marginTop: 2,
  },

  filterRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
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
  chipText: {
    ...typography.caption,
    color: colors.textSubtle,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: { color: colors.textOnPrimary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadow.xs,
  },
  rowName: {
    ...typography.bodyStrong,
    fontSize: 15,
  },
  rowEmail: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  inactiveText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },

  // Detalle
  identity: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  identityTop: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  identityEmail: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSubtle,
  },
  identityMeta: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: 4,
  },
  metricIcon: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  metricValue: {
    ...typography.bodyStrong,
    fontSize: 20,
    lineHeight: 26,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSubtle,
  },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  sectionTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    flex: 1,
  },
  sectionBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.sm,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },

  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dataLabel: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSubtle,
  },
  dataValue: {
    ...typography.bodyStrong,
    fontSize: 14,
  },

  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTinted,
  },
  tagText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  listItemTitle: {
    ...typography.bodyStrong,
    fontSize: 13,
  },
  listItemMeta: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.textStrong,
  },

  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },

  emptyPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceTinted,
    borderRadius: radius.md,
  },
  emptyPanelText: {
    flex: 1,
    ...typography.caption,
    fontSize: 13,
    color: colors.textSubtle,
  },
});

const rateStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceTinted,
  },
  headTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
  },
  headMeta: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: 4,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cellValue: {
    ...typography.bodyStrong,
    fontSize: 17,
    color: colors.textStrong,
  },
  cellHint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  footer: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
});
