import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Alert, Linking } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Card, Avatar, StatusBadge, SupportRow } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { useRouter } from 'expo-router';
import {
  currentStudent,
  studentContact,
  studentAcademic,
  studentPreferences,
  ContactChannel,
} from '@/services/mockData';
import { useAuth } from '@/hooks/useAuth';
import { openWhatsapp } from '@/services/whatsappService';

export default function StudentProfile() {
  const { logout } = useAuth();
  const router = useRouter();
  const [guardianOpen, setGuardianOpen] = useState<boolean>(false);

  return (
    <Screen>
      <View style={styles.headerBar}>
        <Text style={typography.h1}>Perfil</Text>
        <Pressable onPress={logout} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.primaryDark} />
        </Pressable>
      </View>

      <Card style={styles.hero}>
        <Avatar name={currentStudent.name} uri={currentStudent.avatar} size={96} />
        <Text style={[typography.h2, { marginTop: spacing.md }]}>{currentStudent.name}</Text>
        <Text style={typography.caption}>
          {studentAcademic.grade} · {studentAcademic.school}
        </Text>
        <View style={{ marginTop: spacing.sm }}>
          <StatusBadge tone="primary" label="Estudiante activo" icon="checkmark-circle" />
        </View>

        <Pressable
          onPress={() => setGuardianOpen(true)}
          style={({ pressed }) => [styles.myGuardianBtn, pressed && { opacity: 0.9 }]}
          hitSlop={8}
        >
          <Ionicons name="person-circle" size={18} color={colors.primaryDark} />
          <Text style={styles.myGuardianText}>Mi acudiente</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
        </Pressable>
      </Card>

      <Text style={styles.section}>Contacto</Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <InfoRow icon="person-outline" label="Acudiente principal" value={studentContact.guardian} />
        <InfoRow icon="call-outline" label="Teléfono" value={studentContact.guardianPhone} />
        <InfoRow icon="mail-outline" label="Correo electrónico" value={studentContact.guardianEmail} />
        <PreferredChannel channel={studentContact.preferredChannel} />
        <ChannelRow icon="notifications-outline" label="Push" enabled={studentContact.channels.push} />
        <ChannelRow icon="logo-whatsapp" label="WhatsApp" enabled={studentContact.channels.whatsapp} />
        <ChannelRow icon="mail-open-outline" label="Correo" enabled={studentContact.channels.email} last />
      </Card>

      <Text style={styles.section}>Información académica</Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <InfoRow icon="school-outline" label="Colegio" value={studentAcademic.school} />
        <InfoRow icon="ribbon-outline" label="Grado" value={studentAcademic.grade} />
        <SubjectsRow subjects={studentAcademic.subjects} />
        <TeacherRow
          name={studentAcademic.assignedTeacher.name}
          avatar={studentAcademic.assignedTeacher.avatar}
        />
        <InfoRow icon="hourglass-outline" label="Horas disponibles" value={`${studentAcademic.hoursAvailable} h`} />
        <InfoRow icon="calendar-outline" label="Vence paquete" value={studentAcademic.packageExpiresAt} last />
      </Card>

      <Text style={[styles.section, { marginTop: spacing.lg }]}>Preferencias</Text>
      <Card>
        <InfoRow icon="time-outline" label="Horario preferido" value={studentPreferences.preferredSchedule} />
        <InfoRow icon="star-outline" label="Profesor preferido" value={studentPreferences.preferredTeacher} />
        <MultilineRow icon="chatbubble-outline" label="Observaciones" value={studentPreferences.observations} />
        <MultilineRow icon="accessibility-outline" label="Adaptaciones" value={studentPreferences.accommodations} last />
      </Card>

      {/* Fase 1 simplificacion: "Mi plan" vive en Perfil. Todo lo
          administrativo (horas, renovaciones, recargas, pagos, facturas)
          se consulta desde aqui. La navegacion diaria queda centrada en
          estudiar. */}
      <Text style={styles.section}>Mi plan</Text>
      <Pressable
        onPress={() => router.push('/(student)/payments' as any)}
        style={({ pressed }) => [
          styles.policiesRow,
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={styles.infoIcon}>
          <Ionicons
            name="card-outline"
            size={16}
            color={colors.primaryDark}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={typography.bodyStrong}>Plan, horas y pagos</Text>
          <Text style={typography.caption}>
            Renueva, recarga o revisa tu historial de pagos y facturas.
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textMuted}
        />
      </Pressable>

      {/* Ubicación automática: el documento completo de políticas sólo
          vive aquí. Nunca se obliga al usuario a leerlo. */}
      <Text style={styles.section}>Políticas de Wordlish</Text>
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
            Reglas de reserva, material, reportes y pagos.
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textMuted}
        />
      </Pressable>

      <Text style={[styles.section, { marginTop: spacing.lg }]}>Configuracion</Text>
      <Pressable
        onPress={() => router.push('/settings/notifications' as any)}
        style={({ pressed }) => [
          styles.policiesRow,
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={styles.infoIcon}>
          <Ionicons
            name="notifications-outline"
            size={16}
            color={colors.primaryDark}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={typography.bodyStrong}>Preferencias de notificaciones</Text>
          <Text style={typography.caption}>
            Elige por que canales deseas recibirlas.
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textMuted}
        />
      </Pressable>

      <Text style={[styles.section, { marginTop: spacing.lg }]}>Soporte</Text>
      <SupportRow role="student" screen="Perfil" />

      <GuardianModal visible={guardianOpen} onClose={() => setGuardianOpen(false)} />
    </Screen>
  );
}

function InfoRow({
  icon, label, value, last,
}: {
  icon: string; label: string; value: string; last?: boolean;
}) {
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

function MultilineRow({
  icon, label, value, last,
}: {
  icon: string; label: string; value: string; last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder, { alignItems: 'flex-start' }]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon as any} size={16} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.caption}>{label}</Text>
        <Text style={[typography.body, { lineHeight: 20 }]}>{value}</Text>
      </View>
    </View>
  );
}

function ChannelRow({
  icon, label, enabled, last,
}: {
  icon: string; label: string; enabled: boolean; last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon as any} size={16} color={colors.primaryDark} />
      </View>
      <Text style={[typography.body, { flex: 1 }]}>{label}</Text>
      <View style={[styles.channelBadge, enabled ? styles.channelOn : styles.channelOff]}>
        <Ionicons
          name={enabled ? 'checkmark' : 'close'}
          size={12}
          color={enabled ? colors.success : colors.textMuted}
        />
        <Text style={[styles.channelText, { color: enabled ? colors.success : colors.textMuted }]}>
          {enabled ? 'Activo' : 'Inactivo'}
        </Text>
      </View>
    </View>
  );
}

function PreferredChannel({ channel }: { channel: ContactChannel }) {
  const labels: Record<ContactChannel, string> = {
    push: 'Push', whatsapp: 'WhatsApp', email: 'Correo',
  };
  return (
    <View style={[styles.infoRow, styles.infoRowBorder]}>
      <View style={styles.infoIcon}>
        <Ionicons name="star" size={16} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.caption}>Medio preferido</Text>
        <Text style={typography.bodyStrong}>{labels[channel]}</Text>
      </View>
    </View>
  );
}

function SubjectsRow({ subjects }: { subjects: string[] }) {
  return (
    <View style={[styles.infoRow, styles.infoRowBorder, { alignItems: 'flex-start' }]}>
      <View style={styles.infoIcon}>
        <Ionicons name="book-outline" size={16} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.caption}>Materias activas</Text>
        <View style={styles.chips}>
          {subjects.map((s) => (
            <View key={s} style={styles.chip}>
              <Text style={styles.chipText}>{s}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function TeacherRow({ name, avatar }: { name: string; avatar: string }) {
  return (
    <View style={[styles.infoRow, styles.infoRowBorder]}>
      <View style={styles.infoIcon}>
        <Ionicons name="person-circle-outline" size={16} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.caption}>Profesor asignado</Text>
        <View style={styles.teacherInline}>
          <Avatar name={name} uri={avatar} size={28} />
          <Text style={typography.bodyStrong}>{name}</Text>
        </View>
      </View>
    </View>
  );
}

function GuardianModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  // Push queda pendiente hasta integrar Expo Push / FCM / APNs.
  const notReady = (channel: string) =>
    Alert.alert(channel, 'Integración pendiente. Se enviará por este medio en la próxima fase.');

  // WhatsApp pasa por el servicio único y siempre abre el número oficial
  // de Wordlish configurado por el administrador en `app_settings`.
  // No se usan teléfonos de prueba ni datos del acudiente para abrir WhatsApp.
  const handleWhatsApp = () => {
    openWhatsapp(
      `Hola, soy estudiante de Wordlish y necesito ayuda para contactar a mi acudiente (${studentContact.guardian}).`,
    );
  };

  // Correo abre el cliente nativo con el email real del acudiente.
  const handleEmail = () => {
    Linking.openURL(`mailto:${studentContact.guardianEmail}`).catch(() =>
      Alert.alert('Correo', 'No se pudo abrir el cliente de correo.'),
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <Text style={typography.h2}>Mi acudiente</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <View style={{ alignItems: 'center', marginTop: spacing.md }}>
            <Avatar name={studentContact.guardian} size={72} />
            <Text style={[typography.h3, { marginTop: spacing.md }]}>
              {studentContact.guardian}
            </Text>
          </View>
          <View style={styles.modalInfo}>
            <View style={styles.modalRow}>
              <Ionicons name="call-outline" size={16} color={colors.primaryDark} />
              <Text style={typography.body}>{studentContact.guardianPhone}</Text>
            </View>
            <View style={styles.modalRow}>
              <Ionicons name="mail-outline" size={16} color={colors.primaryDark} />
              <Text style={typography.body}>{studentContact.guardianEmail}</Text>
            </View>
          </View>
          <View style={styles.modalActions}>
            <ContactAction icon="notifications" label="Push" onPress={() => notReady('Push')} />
            <ContactAction icon="logo-whatsapp" label="WhatsApp" onPress={handleWhatsApp} />
            <ContactAction icon="mail" label="Correo" onPress={handleEmail} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ContactAction({
  icon, label, onPress,
}: {
  icon: string; label: string; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.contactBtn, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon as any} size={20} color={colors.primaryDark} />
      <Text style={styles.contactBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.lg,
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { ...typography.h3, marginBottom: spacing.md },

  hero: {
    alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.lg,
  },
  myGuardianBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    borderRadius: radius.pill, marginTop: spacing.md,
  },
  myGuardianText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  teacherInline: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  chip: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chipText: { color: colors.primaryDark, fontWeight: '600', fontSize: 12 },

  channelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  channelOn: { backgroundColor: colors.successSoft },
  channelOff: { backgroundColor: colors.surfaceAlt },
  channelText: { fontSize: 12, fontWeight: '700' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingBottom: spacing.xl,
  },
  modalHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalInfo: { gap: spacing.sm, marginTop: spacing.lg },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  contactBtn: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: colors.primarySoft, paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  contactBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
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
