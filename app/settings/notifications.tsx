import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
  getNotifPrefs,
  setNotifPref,
  subscribeNotifPrefs,
  channelStatus,
  isChannelEditable,
  type NotifChannelKey,
  type NotifPrefs,
} from '@/services/notificationPrefsService';

// ============================================================================
// Preferencias de Notificaciones · Wordlish
//
// Pantalla unica compartida por todos los roles (admin, supervisor,
// profesor, estudiante, acudiente). Reutiliza notificationPrefsService
// y no crea nuevas tablas ni logica paralela.
//
// - in_app siempre activo (base del sistema).
// - push_android: toggle real, afecta el registro del Expo Push Token.
// - sound_web: toggle real, afecta el beep del NotificationsHUD en web.
// - email / whatsapp: reservados (Proximamente), switch deshabilitado.
// - push_ios: reservado (No disponible).
//
// Cuando se activen Email/WhatsApp/iOS bastara con cambiar
// channelStatus() y anadir el dispatcher: la UI queda intacta.
// ============================================================================

interface Row {
  key: NotifChannelKey;
  label: string;
  description: string;
  icon: string;
}

const CHANNELS: Row[] = [
  {
    key: 'in_app',
    label: 'Notificaciones en la aplicacion',
    description:
      'Siempre activas. Aparecen en el Centro de Actividad y en la campana.',
    icon: 'notifications',
  },
  {
    key: 'push_android',
    label: 'Push Android',
    description:
      'Recibe una notificacion incluso cuando la aplicacion este cerrada.',
    icon: 'phone-portrait',
  },
  {
    key: 'sound_web',
    label: 'Sonido en la web',
    description:
      'Reproduce un sonido cuando llegue una notificacion importante mientras utilizas Wordlish.',
    icon: 'volume-high',
  },
  {
    key: 'email',
    label: 'Correo electronico',
    description: 'Proximamente.',
    icon: 'mail',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    description: 'Proximamente.',
    icon: 'logo-whatsapp',
  },
  {
    key: 'push_ios',
    label: 'Push iOS',
    description: 'No disponible por ahora.',
    icon: 'logo-apple',
  },
];

export default function NotificationsPreferencesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [prefs, setPrefs] = useState<NotifPrefs>(() => getNotifPrefs(userId));

  useEffect(() => {
    setPrefs(getNotifPrefs(userId));
    const unsub = subscribeNotifPrefs(() => {
      setPrefs(getNotifPrefs(userId));
    });
    return unsub;
  }, [userId]);

  const handleToggle = useCallback(
    (key: NotifChannelKey, value: boolean) => {
      if (!userId) return;
      if (!isChannelEditable(key)) return;
      setNotifPref(userId, key, value);
    },
    [userId],
  );

  const available = CHANNELS.filter((c) => channelStatus(c.key) === 'available');
  const comingSoon = CHANNELS.filter(
    (c) => channelStatus(c.key) === 'coming_soon',
  );
  const unavailable = CHANNELS.filter(
    (c) => channelStatus(c.key) === 'unavailable',
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.iconBtn}
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Configuracion</Text>
          <Text style={typography.h2}>Preferencias de notificaciones</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.intro}>
          Decide como deseas recibir tus notificaciones. Puedes cambiar estas
          preferencias en cualquier momento.
        </Text>

        <Text style={styles.section}>Canales activos</Text>
        <View style={styles.card}>
          {available.map((row, idx) => (
            <ChannelRow
              key={row.key}
              row={row}
              value={prefs[row.key]}
              status="available"
              locked={!isChannelEditable(row.key)}
              onChange={(v) => handleToggle(row.key, v)}
              last={idx === available.length - 1}
            />
          ))}
        </View>

        {comingSoon.length > 0 ? (
          <>
            <Text style={styles.section}>Proximamente</Text>
            <View style={styles.card}>
              {comingSoon.map((row, idx) => (
                <ChannelRow
                  key={row.key}
                  row={row}
                  value={false}
                  status="coming_soon"
                  locked
                  onChange={() => undefined}
                  last={idx === comingSoon.length - 1}
                />
              ))}
            </View>
          </>
        ) : null}

        {unavailable.length > 0 ? (
          <>
            <Text style={styles.section}>No disponible</Text>
            <View style={styles.card}>
              {unavailable.map((row, idx) => (
                <ChannelRow
                  key={row.key}
                  row={row}
                  value={false}
                  status="unavailable"
                  locked
                  onChange={() => undefined}
                  last={idx === unavailable.length - 1}
                />
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.footer}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.textMuted}
          />
          <Text style={styles.footerText}>
            Las notificaciones dentro de la aplicacion siempre estan activas y
            no pueden desactivarse. Cuando habilitemos correo, WhatsApp o iOS,
            aparecera aqui automaticamente.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

interface ChannelRowProps {
  row: Row;
  value: boolean;
  status: 'available' | 'coming_soon' | 'unavailable';
  locked: boolean;
  onChange: (v: boolean) => void;
  last: boolean;
}

function ChannelRow({ row, value, status, locked, onChange, last }: ChannelRowProps) {
  const disabledTone = status !== 'available';
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View
        style={[
          styles.rowIcon,
          disabledTone && { backgroundColor: colors.surfaceAlt },
        ]}
      >
        <Ionicons
          name={row.icon as any}
          size={18}
          color={disabledTone ? colors.textMuted : colors.primaryDark}
        />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowHead}>
          <Text
            style={[
              styles.rowTitle,
              disabledTone && { color: colors.textMuted },
            ]}
            numberOfLines={1}
          >
            {row.label}
          </Text>
          {status === 'coming_soon' ? (
            <View style={[styles.tag, { backgroundColor: colors.infoSoft }]}>
              <Text style={[styles.tagText, { color: colors.info }]}>
                Proximamente
              </Text>
            </View>
          ) : null}
          {status === 'unavailable' ? (
            <View style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.tagText, { color: colors.textMuted }]}>
                No disponible
              </Text>
            </View>
          ) : null}
          {row.key === 'in_app' ? (
            <View style={[styles.tag, { backgroundColor: colors.successSoft }]}>
              <Text style={[styles.tagText, { color: colors.success }]}>
                Siempre
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          style={[
            styles.rowDesc,
            disabledTone && { color: colors.textMuted },
          ]}
        >
          {row.description}
        </Text>
      </View>
      <Switch
        value={row.key === 'in_app' ? true : value}
        onValueChange={onChange}
        disabled={locked}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={
          Platform.OS === 'android'
            ? locked
              ? colors.surfaceAlt
              : colors.surface
            : undefined
        }
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  intro: {
    ...typography.body,
    color: colors.textSubtle,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  section: {
    ...typography.h3,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textStrong,
  },
  rowDesc: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 4,
    lineHeight: 18,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    marginTop: spacing.md,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSubtle,
    lineHeight: 18,
  },
});
