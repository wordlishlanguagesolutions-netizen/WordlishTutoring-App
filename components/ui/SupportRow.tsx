// Componente único de acceso a soporte dentro de la app.
// Renderiza una fila discreta "Contactar a un asesor" que, al presionar, abre
// WhatsApp con un mensaje prellenado adaptado al rol y a la pantalla actual.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { contactAdvisor } from '@/services/supportService';
import type { UserRole } from '@/constants/roles';

interface Props {
  role: UserRole | null | undefined;
  screen?: string;
  compact?: boolean;
}

export function SupportRow({ role, screen, compact }: Props) {
  const onPress = () => contactAdvisor(role, { screen });
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Contactar a un asesor"
      hitSlop={8}
      style={({ pressed }) => [
        styles.row,
        compact && styles.rowCompact,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="logo-whatsapp" size={18} color="#128C7E" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyStrong}>Contactar a un asesor</Text>
        <Text style={typography.caption}>Wordlish responde por WhatsApp</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconText,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.card,
    paddingVertical: spacing.md,
  },
  rowCompact: {
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: '#DFF5EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
