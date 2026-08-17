// Componente único de acceso a soporte dentro de la app.
// Renderiza una fila discreta "Contactar a un asesor" que, al presionar:
//   1. Registra fire-and-forget un ticket en public.support_tickets
//      (channel='whatsapp') para dar trazabilidad al admin/supervisor.
//   2. Abre WhatsApp con un mensaje prellenado adaptado al rol y pantalla.
//
// Si el usuario no esta autenticado, se omite el ticket y se abre WhatsApp
// directamente. Si Cloud falla, no se bloquea la apertura del chat.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { contactAdvisor, getSupportMessage } from '@/services/supportService';
import { createSupportTicket } from '@/services/supportTicketsService';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/constants/roles';

interface Props {
  role: UserRole | null | undefined;
  screen?: string;
  compact?: boolean;
}

export function SupportRow({ role, screen, compact }: Props) {
  const { user } = useAuth();
  const onPress = () => {
    // 1) Ticket de trazabilidad (no bloqueante).
    if (user?.id) {
      const description = getSupportMessage(role, { screen });
      createSupportTicket({
        userId: user.id,
        subject: `Soporte · ${screen ?? role ?? 'App'}`,
        description,
        category: 'general',
        channel: 'whatsapp',
      }).catch(() => undefined);
    }
    // 2) WhatsApp como canal de conversacion.
    contactAdvisor(role, { screen });
  };
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
