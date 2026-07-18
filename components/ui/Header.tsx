import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, radius, typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  title: string;
  subtitle?: string;
  hideLogout?: boolean;
}

export function Header({ title, subtitle, hideLogout }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={styles.subtitle}>
          {subtitle ?? `Hola, ${user?.fullName ?? ''}`}
        </Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {hideLogout ? null : (
        <Pressable
          onPress={logout}
          style={({ pressed }) => [styles.logout, pressed && { opacity: 0.75 }]}
          hitSlop={10}
          accessibilityLabel="Cerrar sesión"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.block,
  },
  subtitle: {
    ...typography.subtitle,
    marginBottom: 4,
  },
  title: {
    ...typography.h1,
  },
  logout: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTinted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
