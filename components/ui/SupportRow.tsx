// Componente único de acceso a soporte dentro de la app.
// Renderiza una fila discreta "Contactar a un asesor" que, al presionar, abre
// WhatsApp con un mensaje prellenado adaptado al rol y a la pantalla actual.
// No muestra menús, modales ni opciones adicionales — un solo clic.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { contactAdvisor } from '@/services/supportService';
import type { UserRole } from '@/constants/roles';

interface Props {
  role: UserRole | null | undefined;
  // Nombre corto de la pantalla actual (ej: "Perfil", "Monitor").
  // Se agrega al mensaje para dar contexto al asesor cuando esté disponible.
  screen?: string;
  // Estilo compacto para incrustar dentro de listas o cards existentes.
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
        <Text style={typography.caption}>
          Wordlish responde por WhatsApp
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowCompact: {
    paddingVertical: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#DFF5EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
