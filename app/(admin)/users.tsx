import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, Avatar, Modal, StatusBadge, Button } from '@/components/ui';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import type { UserRole } from '@/constants/roles';
import {
  hydrateUsers,
  subscribeUsers,
  getUsers,
  isUsersHydrated,
  updateUser,
  setUserActive,
  setUserRole,
} from '@/services/usersService';
import type { UserProfileFull } from '@/repositories/users';
import {
  getRoleCapacity,
  canPromoteToRole,
  canDeactivateUser,
  canChangeRole,
  translateRolePolicyError,
  MAX_ACTIVE_SUPERVISORS,
  type RoleCapacity,
} from '@/services/userRolesPolicy';
import {
  teacherRatesConfig,
  getYearRates,
  getRate,
  formatAmount,
  hydrateTeacherRates,
  subscribeTeacherRates,
  TIER_LABEL,
  KIND_LABEL,
  type TeacherTier,
} from '@/services/teacherRatesConfig';

// ============================================================================
// Panel de Usuarios · Módulo #3 migrado a OnSpace Cloud.
//
// Origen de datos: `public.user_profiles` (via `services/usersService`).
// Ya no lee de `mockDb.users` ni de un array hardcoded local.
//
// Funciones cubiertas por el panel (todas persistentes en Cloud):
//   · Consultar (lista + detalle).
//   · Editar identidad (nombre completo, primer nombre, teléfono, avatar).
//   · Cambiar rol (respetando triggers DB: máx. 3 supervisores, admin
//     principal irremplazable sin transferencia).
//   · Activar / desactivar (el admin principal queda bloqueado por trigger).
//
// Crear usuarios: se realiza vía signup real (trigger `handle_new_user`
// crea el perfil). El botón "Nuevo usuario" abre las instrucciones oficiales
// mientras no exista una edge function de invitación.
// ============================================================================

type Role = UserRole;

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  teacher: 'Profesor',
  student: 'Estudiante',
  guardian: 'Acudiente',
};

const ROLE_TONE: Record<Role, 'primary' | 'info' | 'success' | 'warning' | 'muted'> = {
  admin: 'primary',
  supervisor: 'primary',
  teacher: 'info',
  student: 'success',
  guardian: 'warning',
};

type Filter = 'all' | Role;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'admin', label: 'Admins' },
  { key: 'supervisor', label: 'Supervisores' },
  { key: 'teacher', label: 'Profesores' },
  { key: 'student', label: 'Estudiantes' },
  { key: 'guardian', label: 'Acudientes' },
];

// ============================================================================
export default function UsersScreen() {
  const [users, setUsers] = useState<UserProfileFull[]>(getUsers());
  const [loading, setLoading] = useState<boolean>(!isUsersHydrated());
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [supervisorCap, setSupervisorCap] = useState<RoleCapacity | null>(null);
  const [showCreateHelp, setShowCreateHelp] = useState<boolean>(false);

  // Hidratación desde Cloud + suscripción reactiva al cache.
  useEffect(() => {
    hydrateUsers()
      .then(() => {
        setUsers(getUsers());
        setLoading(false);
      })
      .catch(() => setLoading(false));
    const unsub = subscribeUsers(() => setUsers(getUsers()));
    return unsub;
  }, []);

  // Consulta de capacidad de supervisores (para mostrar 2/3, etc.).
  useEffect(() => {
    getRoleCapacity('supervisor')
      .then(setSupervisorCap)
      .catch(() => undefined);
  }, [users.length]);

  const filtered = useMemo(
    () => (filter === 'all' ? users : users.filter((u) => u.role === filter)),
    [filter, users],
  );

  const selected = useMemo(
    () => users.find((u) => u.id === selectedId) ?? null,
    [selectedId, users],
  );

  const counts = useMemo(
    () => ({
      admin: users.filter((u) => u.role === 'admin').length,
      supervisor: users.filter((u) => u.role === 'supervisor' && u.active).length,
      teacher: users.filter((u) => u.role === 'teacher').length,
      student: users.filter((u) => u.role === 'student').length,
      guardian: users.filter((u) => u.role === 'guardian').length,
    }),
    [users],
  );

  const refresh = () => {
    hydrateUsers(true).catch(() => undefined);
  };

  return (
    <Screen>
      <Header
        title="Usuarios"
        subtitle="Panel administrativo · datos reales desde OnSpace Cloud"
      />

      {/* KPIs de la comunidad */}
      <View style={styles.summaryRow}>
        <SummaryTile
          label="Supervisores"
          value={`${counts.supervisor} / ${MAX_ACTIVE_SUPERVISORS}`}
          icon="eye"
          tone="primary"
        />
        <SummaryTile
          label="Profesores"
          value={String(counts.teacher)}
          icon="school"
          tone="info"
        />
        <SummaryTile
          label="Estudiantes"
          value={String(counts.student)}
          icon="people"
          tone="success"
        />
        <SummaryTile
          label="Acudientes"
          value={String(counts.guardian)}
          icon="heart"
          tone="warning"
        />
      </View>

      {/* Acciones de cabecera */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => setShowCreateHelp(true)}
          style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="add-circle" size={18} color={colors.textOnPrimary} />
          <Text style={styles.newBtnText}>Nuevo usuario</Text>
        </Pressable>
        <Pressable
          onPress={refresh}
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.8 }]}
          accessibilityLabel="Refrescar desde Cloud"
        >
          <Ionicons name="refresh" size={16} color={colors.primaryDark} />
          <Text style={styles.refreshBtnText}>Refrescar</Text>
        </Pressable>
        {supervisorCap && !supervisorCap.canAddMore ? (
          <View style={styles.capacityBanner}>
            <Ionicons name="information-circle" size={14} color={colors.warning} />
            <Text style={styles.capacityText}>
              Cupo de supervisores lleno ({supervisorCap.active}/{supervisorCap.max})
            </Text>
          </View>
        ) : null}
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

      {/* Lista o estados vacíos */}
      {loading ? (
        <View style={styles.emptyBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.emptyText}>Cargando usuarios desde Cloud…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="cloud-outline" size={28} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Sin usuarios en Cloud</Text>
          <Text style={styles.emptyText}>
            Crea el primer administrador desde OnSpace Cloud Dashboard → Users y
            marca `is_primary_admin=true`. Luego los siguientes usuarios entrarán
            vía signup en la pantalla de login.
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {filtered.map((u) => (
            <UserRow key={u.id} user={u} onPress={() => setSelectedId(u.id)} />
          ))}
        </View>
      )}

      {/* Detalle */}
      <Modal
        visible={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.fullName}
        subtitle={selected ? ROLE_LABEL[selected.role as Role] : ''}
        scrollable
      >
        {selected ? <UserDetail user={selected} /> : null}
      </Modal>

      {/* Ayuda de creación */}
      <Modal
        visible={showCreateHelp}
        onClose={() => setShowCreateHelp(false)}
        title="Alta de nuevos usuarios"
        subtitle="Wordlish · procedimiento oficial"
        scrollable
      >
        <View style={{ gap: spacing.md }}>
          <View style={styles.helpBlock}>
            <Text style={styles.helpTitle}>Administrador principal</Text>
            <Text style={styles.helpBody}>
              Se crea manualmente desde OnSpace Cloud Dashboard → Users (una sola
              vez). Luego se marca `is_primary_admin=true` en `user_profiles`.
            </Text>
          </View>
          <View style={styles.helpBlock}>
            <Text style={styles.helpTitle}>Supervisores</Text>
            <Text style={styles.helpBody}>
              Máximo {MAX_ACTIVE_SUPERVISORS} activos. Se crean vía signup con rol
              staff y el admin les asigna rol supervisor desde el detalle del
              usuario. El límite está aplicado por trigger en la base de datos.
            </Text>
          </View>
          <View style={styles.helpBlock}>
            <Text style={styles.helpTitle}>Profesores, estudiantes y acudientes</Text>
            <Text style={styles.helpBody}>
              Se registran solos desde la pantalla de login (signup). El trigger
              `handle_new_user` crea automáticamente su perfil. El admin puede
              luego cambiar rol o desactivar desde este panel.
            </Text>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// ─── Fila de usuario ────────────────────────────────────────────────────────
function UserRow({ user, onPress }: { user: UserProfileFull; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
    >
      <Avatar name={user.fullName} uri={user.avatar ?? undefined} size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowName} numberOfLines={1}>
            {user.fullName}
          </Text>
          {user.isPrimaryAdmin ? (
            <View style={styles.pinBadge}>
              <Ionicons name="shield-checkmark" size={10} color={colors.primary} />
              <Text style={styles.pinBadgeText}>Principal</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.rowEmail} numberOfLines={1}>
          {user.email}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <StatusBadge
          label={ROLE_LABEL[user.role as Role]}
          tone={ROLE_TONE[user.role as Role]}
        />
        {!user.active ? <Text style={styles.inactiveText}>Inactivo</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

// ─── Tile resumen ───────────────────────────────────────────────────────────
function SummaryTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: string;
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
// Detalle de usuario · edición inline sobre Cloud.
// ============================================================================
function UserDetail({ user }: { user: UserProfileFull }) {
  const [fullName, setFullName] = useState(user.fullName);
  const [firstName, setFirstName] = useState(user.firstName);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [roleSaving, setRoleSaving] = useState<Role | null>(null);
  const [activeSaving, setActiveSaving] = useState(false);

  // Sincroniza el form cuando cambia el usuario (por hidratación).
  useEffect(() => {
    setFullName(user.fullName);
    setFirstName(user.firstName);
    setPhone(user.phone ?? '');
  }, [user.id, user.fullName, user.firstName, user.phone]);

  const dirty =
    fullName.trim() !== user.fullName ||
    firstName.trim() !== user.firstName ||
    (phone.trim() || null) !== (user.phone ?? null);

  const handleSaveIdentity = async () => {
    setSaving(true);
    const res = await updateUser(user.id, {
      fullName: fullName.trim(),
      firstName: firstName.trim(),
      phone: phone.trim() ? phone.trim() : null,
    });
    setSaving(false);
    if (!res.ok) {
      Alert.alert('No se pudo guardar', translateRolePolicyError(res.error));
      return;
    }
    Alert.alert('Guardado', 'La información del usuario se actualizó.');
  };

  const handleToggleActive = async () => {
    const nextActive = !user.active;
    const guard = canDeactivateUser({
      is_primary_admin: user.isPrimaryAdmin,
      role: user.role as UserRole,
    });
    if (!nextActive && !guard.allowed) {
      Alert.alert('Acción bloqueada', guard.reason ?? 'No permitido.');
      return;
    }
    setActiveSaving(true);
    const res = await setUserActive(user.id, nextActive);
    setActiveSaving(false);
    if (!res.ok) {
      Alert.alert(
        'No se pudo cambiar el estado',
        translateRolePolicyError(res.error),
      );
    }
  };

  const handleChangeRole = async (nextRole: Role) => {
    if (nextRole === user.role) return;
    const guard = canChangeRole({
      is_primary_admin: user.isPrimaryAdmin,
      role: user.role as UserRole,
    });
    if (!guard.allowed) {
      Alert.alert('Acción bloqueada', guard.reason ?? 'No permitido.');
      return;
    }
    if (nextRole === 'supervisor') {
      const promote = await canPromoteToRole('supervisor');
      if (!promote.allowed) {
        Alert.alert('Cupo lleno', promote.reason ?? 'No hay cupo disponible.');
        return;
      }
    }
    Alert.alert(
      'Cambiar rol',
      `¿Confirmas cambiar el rol a "${ROLE_LABEL[nextRole]}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setRoleSaving(nextRole);
            const res = await setUserRole(user.id, nextRole);
            setRoleSaving(null);
            if (!res.ok) {
              Alert.alert(
                'No se pudo cambiar el rol',
                translateRolePolicyError(res.error),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ gap: spacing.md }}>
      <IdentityBlock user={user} />

      {/* Edición inline */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Ionicons name="person-circle-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.sectionTitle}>Identidad</Text>
        </View>
        <View style={styles.sectionBody}>
          <FieldRow label="Nombre completo">
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              placeholder="Nombre completo"
              placeholderTextColor={colors.textMuted}
            />
          </FieldRow>
          <FieldRow label="Primer nombre">
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              placeholder="Primer nombre"
              placeholderTextColor={colors.textMuted}
            />
          </FieldRow>
          <FieldRow label="Teléfono">
            <TextInput
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              placeholder="Opcional"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </FieldRow>
          <Button
            label={saving ? 'Guardando…' : 'Guardar cambios'}
            onPress={handleSaveIdentity}
            disabled={!dirty || saving}
            loading={saving}
          />
        </View>
      </View>

      {/* Rol */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Ionicons name="ribbon-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.sectionTitle}>Rol</Text>
        </View>
        <View style={styles.sectionBody}>
          {user.isPrimaryAdmin ? (
            <View style={styles.notePanel}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
              <Text style={styles.notePanelText}>
                Este es el administrador principal. Para reasignarlo usa la
                transferencia oficial de admin.
              </Text>
            </View>
          ) : null}
          <View style={styles.roleGrid}>
            {(['admin', 'supervisor', 'teacher', 'student', 'guardian'] as Role[]).map(
              (r) => {
                const isCurrent = r === user.role;
                const disabled =
                  isCurrent ||
                  user.isPrimaryAdmin ||
                  roleSaving !== null;
                return (
                  <Pressable
                    key={r}
                    onPress={() => handleChangeRole(r)}
                    disabled={disabled}
                    style={({ pressed }) => [
                      styles.roleBtn,
                      isCurrent && styles.roleBtnActive,
                      disabled && !isCurrent && { opacity: 0.4 },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBtnText,
                        isCurrent && styles.roleBtnTextActive,
                      ]}
                    >
                      {roleSaving === r ? '…' : ROLE_LABEL[r]}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>
        </View>
      </View>

      {/* Estado */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Ionicons name="power-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.sectionTitle}>Estado</Text>
        </View>
        <View style={styles.sectionBody}>
          <DataRow
            label="Estado actual"
            value={user.active ? 'Activo' : 'Inactivo'}
            tone={user.active ? 'default' : 'warning'}
          />
          <DataRow
            label="Última actualización"
            value={new Date(user.updatedAt).toLocaleString()}
          />
          <Pressable
            onPress={handleToggleActive}
            disabled={activeSaving || user.isPrimaryAdmin}
            style={({ pressed }) => [
              styles.dangerBtn,
              user.active ? styles.dangerBtnDeactivate : styles.dangerBtnActivate,
              (activeSaving || user.isPrimaryAdmin) && { opacity: 0.5 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons
              name={user.active ? 'pause-circle' : 'play-circle'}
              size={16}
              color={colors.textOnPrimary}
            />
            <Text style={styles.dangerBtnText}>
              {activeSaving
                ? 'Aplicando…'
                : user.active
                ? 'Desactivar usuario'
                : 'Reactivar usuario'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Tarifa para profesores */}
      {user.role === 'teacher' ? <TeacherRateBlock /> : null}
    </View>
  );
}

// ─── Bloque identidad ───────────────────────────────────────────────────────
function IdentityBlock({ user }: { user: UserProfileFull }) {
  return (
    <View style={styles.identity}>
      <Avatar name={user.fullName} uri={user.avatar ?? undefined} size={64} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={styles.identityTop}>
          <StatusBadge
            label={user.active ? 'Activo' : 'Inactivo'}
            tone={user.active ? 'success' : 'muted'}
          />
          <StatusBadge
            label={ROLE_LABEL[user.role as Role]}
            tone={ROLE_TONE[user.role as Role]}
          />
        </View>
        <Text style={styles.identityEmail}>{user.email}</Text>
        <Text style={styles.identityMeta}>
          Ingreso · {new Date(user.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

// ─── Tarifa por hora vigente (solo profesores) ──────────────────────────────
function TeacherRateBlock() {
  const [tick, setTick] = useState(0);
  const [tier] = useState<TeacherTier>('essentials');
  useEffect(() => {
    hydrateTeacherRates()
      .then(() => setTick((n) => n + 1))
      .catch(() => undefined);
    const unsub = subscribeTeacherRates(() => setTick((n) => n + 1));
    return unsub;
  }, []);
  void tick;
  const year = teacherRatesConfig.currentYear;
  const yearData = getYearRates(year);
  const individual = getRate(year, tier, 'individual');
  const group = getRate(year, tier, 'group');
  const currency = yearData?.currency ?? 'USD';

  return (
    <View style={rateStyles.wrap}>
      <View style={rateStyles.head}>
        <View style={rateStyles.headIcon}>
          <Ionicons name="school" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={rateStyles.headTitle}>Tarifa por hora</Text>
          <Text style={rateStyles.headMeta}>
            Categoría {TIER_LABEL[tier]} · {year}
          </Text>
        </View>
        <StatusBadge label={TIER_LABEL[tier]} tone="info" />
      </View>
      <View style={rateStyles.grid}>
        <View style={rateStyles.cell}>
          <Text style={rateStyles.cellLabel}>{KIND_LABEL.individual}</Text>
          <Text style={rateStyles.cellValue}>
            {individual ? formatAmount(individual.amount, currency) : '—'}
          </Text>
        </View>
        <View style={rateStyles.cell}>
          <Text style={rateStyles.cellLabel}>{KIND_LABEL.group}</Text>
          <Text style={rateStyles.cellValue}>
            {group ? formatAmount(group.amount, currency) : '—'}
          </Text>
        </View>
      </View>
      <Text style={rateStyles.footer}>
        Configura las tarifas desde Ajustes · Tarifas por hora · Profesores.
      </Text>
    </View>
  );
}

// ─── Piezas reutilizables ───────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function DataRow({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'danger';
}) {
  const valColor =
    tone === 'warning'
      ? colors.warning
      : tone === 'danger'
      ? colors.danger
      : colors.textStrong;
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={[styles.dataValue, { color: valColor }]}>{value}</Text>
    </View>
  );
}

// ============================================================================
const styles = StyleSheet.create({
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  refreshBtnText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
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
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: { ...typography.bodyStrong, fontSize: 18, lineHeight: 22 },
  tileLabel: { ...typography.caption, fontSize: 12, marginTop: 2 },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  newBtnText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  capacityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.warningSoft,
  },
  capacityText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },

  filterRow: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
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
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  rowName: { ...typography.bodyStrong, fontSize: 15, flexShrink: 1 },
  rowEmail: { ...typography.caption, fontSize: 12, marginTop: 2 },
  inactiveText: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceTinted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  pinBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },

  emptyBox: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.bodyStrong, fontSize: 15 },
  emptyText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
  },

  identity: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  identityTop: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  identityEmail: { ...typography.caption, fontSize: 13, color: colors.textSubtle },
  identityMeta: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
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
  sectionTitle: { ...typography.bodyStrong, fontSize: 14, flex: 1 },
  sectionBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.sm,
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textStrong,
    backgroundColor: colors.background,
  },

  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dataLabel: { ...typography.caption, fontSize: 13, color: colors.textSubtle },
  dataValue: { ...typography.bodyStrong, fontSize: 14 },

  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textStrong,
  },
  roleBtnTextActive: { color: colors.textOnPrimary },

  notePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceTinted,
    borderRadius: radius.sm,
  },
  notePanelText: {
    flex: 1,
    ...typography.caption,
    fontSize: 12,
    color: colors.textSubtle,
    lineHeight: 16,
  },

  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  dangerBtnDeactivate: { backgroundColor: colors.danger },
  dangerBtnActivate: { backgroundColor: colors.success },
  dangerBtnText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
  },

  helpBlock: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  helpTitle: { ...typography.bodyStrong, fontSize: 13 },
  helpBody: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSubtle,
    lineHeight: 18,
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
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceTinted,
  },
  headTitle: { ...typography.bodyStrong, fontSize: 14 },
  headMeta: { ...typography.caption, fontSize: 12, marginTop: 2 },
  grid: { flexDirection: 'row', gap: spacing.sm },
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
  cellValue: { ...typography.bodyStrong, fontSize: 17, color: colors.textStrong },
  footer: { ...typography.caption, fontSize: 11, color: colors.textMuted },
});
