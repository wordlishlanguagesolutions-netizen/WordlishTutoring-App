// ============================================================================
// Admin › Ajustes › Comunicación.
//
// Editor de la configuración global de WhatsApp de Wordlish. Escribe en
// `public.app_settings` a través de `appSettingsService`. Todos los
// botones de WhatsApp de la app leen desde aquí; no hay número duplicado
// en el código.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, TextInput } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { Card, Modal, StatusBadge } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';
import {
  getSetting,
  hydrateAppSettings,
  setSetting,
  subscribeSettings,
} from '@/services/appSettingsService';
import type { WhatsappModule } from '@/services/whatsappService';

type EditableKey =
  | 'whatsapp.official_number'
  | 'whatsapp.display_number'
  | 'whatsapp.default_message'
  | 'whatsapp.business_hours';

interface FieldMeta {
  key: EditableKey;
  label: string;
  icon: string;
  placeholder: string;
  helper: string;
  multiline?: boolean;
}

const FIELDS: FieldMeta[] = [
  {
    key: 'whatsapp.official_number',
    label: 'Número oficial (E.164)',
    icon: 'call-outline',
    placeholder: '+50769329481',
    helper: 'Formato internacional sin espacios. Ej: +50769329481.',
  },
  {
    key: 'whatsapp.display_number',
    label: 'Número para mostrar',
    icon: 'eye-outline',
    placeholder: '+507 6932-9481',
    helper: 'Cómo aparecerá visualmente en la app.',
  },
  {
    key: 'whatsapp.default_message',
    label: 'Mensaje predeterminado',
    icon: 'chatbox-ellipses-outline',
    placeholder: 'Hola Wordlish, necesito ayuda con...',
    helper: 'Se prellena cuando no hay contexto específico.',
    multiline: true,
  },
  {
    key: 'whatsapp.business_hours',
    label: 'Horario de atención',
    icon: 'time-outline',
    placeholder: 'Lun a Vie · 12:00 - 20:00',
    helper: 'Se muestra junto al botón para gestionar expectativas.',
  },
];

const MODULES: { id: WhatsappModule; label: string; hint: string; icon: string }[] = [
  { id: 'support',       label: 'Soporte',            hint: 'Contactar asesor desde cualquier pantalla.', icon: 'help-buoy-outline' },
  { id: 'payment_proof', label: 'Comprobante de pago', hint: 'Opción "ya envié comprobante por WhatsApp".', icon: 'receipt-outline' },
  { id: 'advisor',       label: 'Consulta con asesor', hint: 'Reservas, dudas, reprogramaciones.',         icon: 'people-outline' },
  { id: 'help',          label: 'Ayuda contextual',   hint: 'Botón de ayuda en pantallas críticas.',      icon: 'information-circle-outline' },
  { id: 'contact',       label: 'Contacto general',   hint: 'Perfil / pie de pantalla.',                   icon: 'mail-outline' },
];

export function CommunicationBlock() {
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<FieldMeta | null>(null);
  const [draft, setDraft] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Suscribirse a cambios en app_settings + hidratar al montar.
  useEffect(() => {
    hydrateAppSettings().catch(() => {});
    const unsub = subscribeSettings(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const enabled = getSetting<boolean>('whatsapp.enabled', true);
  const modulesEnabled = getSetting<string[]>('whatsapp.modules_enabled', []) || [];

  const toggleEnabled = async (v: boolean) => {
    await setSetting('whatsapp.enabled', v);
  };

  const toggleModule = async (mod: WhatsappModule, on: boolean) => {
    const next = on
      ? Array.from(new Set([...modulesEnabled, mod]))
      : modulesEnabled.filter((m) => m !== mod);
    await setSetting('whatsapp.modules_enabled', next);
  };

  const openEdit = (field: FieldMeta) => {
    setDraft(String(getSetting<string>(field.key, '')));
    setEditing(field);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const clean =
      editing.key === 'whatsapp.official_number'
        ? draft.trim()
        : draft;
    await setSetting(editing.key, clean);
    setSaving(false);
    setEditing(null);
  };

  return (
    <View style={s.wrap} key={tick}>
      {/* Estado global */}
      <Card>
        <View style={s.row}>
          <View style={[s.iconWrap, { backgroundColor: enabled ? colors.successSoft : colors.surfaceAlt }]}>
            <Ionicons
              name="logo-whatsapp"
              size={20}
              color={enabled ? colors.success : colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyStrong}>WhatsApp de Wordlish</Text>
            <Text style={typography.caption} numberOfLines={2}>
              {enabled
                ? 'Los botones de contacto están activos en toda la app.'
                : 'Todos los botones de WhatsApp están apagados.'}
            </Text>
            <View style={{ marginTop: 6 }}>
              <StatusBadge
                label={enabled ? 'Activo' : 'Inactivo'}
                tone={enabled ? 'success' : 'muted'}
              />
            </View>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggleEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      </Card>

      {/* Campos editables */}
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {FIELDS.map((f) => {
          const value = getSetting<string>(f.key, '');
          return (
            <Pressable
              key={f.key}
              onPress={() => openEdit(f)}
              style={({ pressed }) => [s.fieldRow, pressed && { opacity: 0.9 }]}
            >
              <View style={s.iconWrap}>
                <Ionicons name={f.icon as any} size={18} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{f.label}</Text>
                <Text style={s.fieldValue} numberOfLines={2}>
                  {value || '—'}
                </Text>
              </View>
              <Ionicons name="create-outline" size={16} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </View>

      {/* Módulos donde aparece WhatsApp */}
      <Text style={s.subhead}>Módulos donde aparece el botón</Text>
      <Text style={typography.caption}>
        Controla en qué partes de la app se muestra el botón de contacto. No
        modifica pantallas ni Design System.
      </Text>
      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        {MODULES.map((m) => {
          const on = modulesEnabled.includes(m.id);
          return (
            <Card key={m.id}>
              <View style={s.row}>
                <View style={s.iconWrap}>
                  <Ionicons name={m.icon as any} size={18} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={typography.bodyStrong}>{m.label}</Text>
                  <Text style={typography.caption} numberOfLines={2}>
                    {m.hint}
                  </Text>
                </View>
                <Switch
                  value={on}
                  onValueChange={(v) => toggleModule(m.id, v)}
                  disabled={!enabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            </Card>
          );
        })}
      </View>

      {/* Info arquitectura */}
      <View style={s.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color={colors.info} />
        <Text style={s.infoText}>
          Cuando Wordlish adopte la API oficial de WhatsApp Business, se
          cambiará el proveedor interno sin modificar los botones de la app.
          Todo pasa por un único servicio.
        </Text>
      </View>

      {/* Modal de edición */}
      <Modal
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.label ?? ''}
        subtitle={editing?.helper}
        primaryAction={{
          label: saving ? 'Guardando...' : 'Guardar',
          onPress: saveEdit,
        }}
        secondaryAction={{ label: 'Cancelar', onPress: () => setEditing(null) }}
      >
        {editing ? (
          <View style={{ gap: spacing.sm }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={editing.placeholder}
              placeholderTextColor={colors.textMuted}
              multiline={editing.multiline}
              numberOfLines={editing.multiline ? 3 : 1}
              autoCapitalize={editing.key === 'whatsapp.official_number' ? 'none' : 'sentences'}
              keyboardType={editing.key === 'whatsapp.official_number' ? 'phone-pad' : 'default'}
              style={[s.input, editing.multiline && { minHeight: 80, textAlignVertical: 'top' }]}
            />
            <Text style={s.helper}>{editing.helper}</Text>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  fieldLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  fieldValue: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.textStrong,
  },
  subhead: {
    ...typography.bodyStrong,
    fontSize: 14,
    marginTop: spacing.lg,
    marginBottom: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  infoText: {
    flex: 1,
    ...typography.caption,
    color: colors.info,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
    color: colors.textStrong,
    backgroundColor: colors.surface,
  },
  helper: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },
});
