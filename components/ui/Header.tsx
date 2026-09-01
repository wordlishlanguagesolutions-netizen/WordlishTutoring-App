import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={styles.subtitle}>{subtitle ?? `Hola, ${user?.fullName ?? ''}`}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Pressable
        onPress={logout}
        style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}
        hitSlop={10}
      >
        <Ionicons name="log-out-outline" size={22} color={colors.primaryDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  subtitle: { ...typography.caption, color: colors.textSubtle, marginBottom: 2 },
  title: { ...typography.h1 },
  logout: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
