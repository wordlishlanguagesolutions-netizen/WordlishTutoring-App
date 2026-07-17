import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, Card } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';

const USERS = [
  { id: '1', name: 'Ana Administradora', role: 'Admin', email: 'ana@wordlish.com' },
  { id: '2', name: 'Prof. Carlos Ríos', role: 'Profesor', email: 'carlos@wordlish.com' },
  { id: '3', name: 'Prof. María Luna', role: 'Profesor', email: 'maria@wordlish.com' },
  { id: '4', name: 'Lucía Estudiante', role: 'Estudiante', email: 'lucia@wordlish.com' },
  { id: '5', name: 'Diego Pérez', role: 'Estudiante', email: 'diego@wordlish.com' },
  { id: '6', name: 'Marta Acudiente', role: 'Acudiente', email: 'marta@wordlish.com' },
];

export default function UsersScreen() {
  return (
    <Screen>
      <Header title="Usuarios" subtitle="Gestión de personas" />

      <View style={{ gap: spacing.sm }}>
        {USERS.map((u) => (
          <Card key={u.id}>
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{u.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyStrong}>{u.name}</Text>
                <Text style={typography.caption}>{u.email}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{u.role}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 18 },
  badge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { ...typography.caption, color: colors.primaryDark, fontWeight: '600' },
});
