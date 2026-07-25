// ============================================================================
// Admin › Ajustes › Videoconferencia (Zoom).
//
// Editor del enlace oficial de Zoom de Wordlish. Escribe en
// `public.app_settings` (`zoom.*`) a través de `appSettingsService`.
// Todos los botones ZoomButton leen desde aquí; no hay URL duplicada.
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

type EditableKey =
  | 'zoom.official_link'
  | 'zoom.meeting_id'
  | 'zoom.default_label';

interface FieldMeta {
  key: EditableKey;
  label: string;
  icon: string;
  placeholder: string;
  helper: string;
}

const FIELDS: FieldMeta[] = [
  {
    key: 'zoom.official_link',
    label: 'Enlace oficial',
    icon: 'link-outline',
    placeholder: 'https://us06web.zoom.us/j/2797072933',
    helper: 'URL única compartida por todas las clases.',
  },
  {
    key: 'zoom.meeting_id',
    label: 'ID de reunión',
    icon: 'hash-outline',
    placeholder: '279 707 2933',
    helper: 'Solo visualización; se muestra al copiar el ID.',
  },
  {
    key: 'zoom.default_label',
    label: 'Texto del botón',
    icon: 'text-outline',
    placeholder: 'Entrar a Zoom',
    helper: 'Etiqueta que aparece en todos los botones Zoom.',
  },
];

export function ZoomBlock() {
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<FieldMeta | null>(null);
  const [draft, setDraft] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    hydrateAppSettings().catch(() => {});
    const unsub = subscribeSettings(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const enabled = getSetting<boolean>('zoom.enabled', true);

  const toggleEnabled = async (v: boolean) => {
    await setSetting('zoom.enabled', v);
  };

  const openEdit = (field: FieldMeta) => {
    setDraft(String(getSetting<string>(field.key, '')));
    setEditing(field);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    await setSetting(editing.key, draft.trim());
    setSaving(false);
    setEditing(null);
  };

  return (
    <View style={s.wrap} key={tick}>
      <Card>
        <View style={s.row}>
          <View
            style={[
              s.iconWrap,
              { backgroundColor: enabled ? colors.successSoft : colors.surfaceAlt },
            ]}
          >
            <Ionicons
              name="videocam"
              size={20}
              color={enabled ? colors.success : colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyStrong}>Sala de clases</Text>
            <Text style={typography.caption} numberOfLines={2}>
              {enabled
                ? 'Todos los botones "Entrar a Zoom" están activos.'
                : 'Los botones Zoom están apagados globalmente.'}
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

      <View style={s.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color={colors.info} />
        <Text style={s.infoText}>
          Cuando integremos Zoom OAuth para salas dinámicas por clase,
          solo cambiaremos el proveedor interno. Los botones seguirán
          funcionando igual sin tocar código.
        </Text>
      </View>

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
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={editing.key === 'zoom.official_link' ? 'url' : 'default'}
              style={s.input}
            />
            <Text style={s.helper}>{editing.helper}</Text>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: spacing.md, gap: spacing.sm },
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
    fontSize: 15,
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
