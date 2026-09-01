import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { Screen, Card, Avatar, StatusBadge, SupportRow } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { currentGuardian, linkedStudents, guardianPaymentsHistory } from '@/services/mockData';
import { useAuth } from '@/hooks/useAuth';

export default function GuardianProfile() {
  const { logout } = useAuth();
  const router = useRouter();
  const totalHours = linkedStudents.reduce((sum, s) => sum + s.total, 0);
  const remainingHours = linkedStudents.reduce((sum, s) => sum + s.remaining, 0);

  return (
    <Screen>
      <View style={styles.headerBar}>
        <Text style={typography.h1}>Perfil</Text>
        <Pressable onPress={logout} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.primaryDark} />
        </Pressable>
      </View>

      <Card style={{ alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.lg }}>
        <Avatar name={currentGuardian.name} uri={currentGuardian.avatar} size={96} />
        <Text style={[typography.h2, { marginTop: spacing.md }]}>{currentGuardian.name}</Text>
        <Text style={typography.caption}>{currentGuardian.email}</Text>
        <View style={{ marginTop: spacing.sm }}>
          <StatusBadge tone="primary" label="Acudiente" icon="people" />
        </View>
      </Card>

      <Text style={styles.section}>Información</Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <InfoRow icon="call-outline" label="Teléfono" value={currentGuardian.phone} />
        <InfoRow icon="mail-outline" label="Correo" value={currentGuardian.email} last />
      </Card>

      <Text style={styles.section}>Estudiantes vinculados ({linkedStudents.length})</Text>
      <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
        {linkedStudents.map((s) => (
          <Card key={s.id}>
            <View style={styles.studentRow}>
              <Avatar name={s.name} uri={s.avatar} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyStrong}>{s.name}</Text>
                <Text style={typography.caption}>{s.grade} · {s.school}</Text>
              </View>
              <View style={styles.hoursBadge}>
                <Text style={styles.hoursText}>{s.remaining}/{s.total} h</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <Text style={styles.section}>Resumen</Text>
      <View style={styles.summaryRow}>
        <SummaryTile icon="hourglass" value={remainingHours} label="Horas restantes" />
        <SummaryTile icon="school" value={totalHours} label="Horas totales" />
        <SummaryTile icon="card" value={guardianPaymentsHistory.length} label="Pagos" />
      </View>

      {/* Ubicación automática: el documento completo de políticas sólo
          vive aquí. Nunca se obliga al acudiente a leerlo. */}
      <Text style={[styles.section, { marginTop: spacing.lg }]}>
        Políticas de Wordlish
      </Text>
      <Pressable
        onPress={() => router.push('/policies' as any)}
        style={({ pressed }) => [
          styles.policiesRow,
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={styles.infoIcon}>
          <Ionicons
            name="document-text-outline"
            size={16}
            color={colors.primaryDark}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={typography.bodyStrong}>Consultar políticas</Text>
          <Text style={typography.caption}>
            Reglas de reserva, reportes y pagos.
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textMuted}
        />
      </Pressable>

      <Text style={[styles.section, { marginTop: spacing.lg }]}>Soporte</Text>
      <SupportRow role="guardian" screen="Perfil" />
    </Screen>
  );
}

function InfoRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon as any} size={16} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.caption}>{label}</Text>
        <Text style={typography.bodyStrong}>{value}</Text>
      </View>
    </View>
  );
}

function SummaryTile({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileIcon}>
        <Ionicons name={icon as any} size={18} color={colors.primaryDark} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={typography.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  section: { ...typography.h3, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hoursBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  hoursText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  summaryRow: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'flex-start' },
  tileIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  tileValue: { ...typography.h2, marginBottom: 2 },
  policiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
});
