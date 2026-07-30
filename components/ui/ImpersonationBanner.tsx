import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useAuth } from '@/hooks/useAuth';
import { colors, radius, spacing } from '@/constants/theme';

// ============================================================================
// Banner sticky que aparece cuando el Administrador esta usando "Ver como...".
// Se renderiza globalmente pero solo se muestra si:
//   - Hay una sesion admin activa (rol real = admin).
//   - Y hay una impersonacion en curso.
// ============================================================================

const ROLE_LABEL: Record<string, string> = {
  teacher: 'Profesor',
  supervisor: 'Supervisor',
  student: 'Estudiante',
  guardian: 'Acudiente',
};

export function ImpersonationBanner() {
  const { user } = useAuth();
  const { asRole, isActive, stopViewAs } = useImpersonation();

  if (!isActive || !asRole) return null;
  if (!user || user.role !== 'admin') return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        <View style={styles.iconWrap}>
          <Ionicons name="eye" size={14} color={colors.textOnPrimary} />
        </View>
        <Text style={styles.text} numberOfLines={1}>
          Modo vista: {ROLE_LABEL[asRole] ?? asRole}
        </Text>
        <Pressable
          onPress={stopViewAs}
          hitSlop={8}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
          accessibilityLabel="Volver a Administracion"
        >
          <Ionicons name="arrow-back" size={14} color={colors.primaryDark} />
          <Text style={styles.btnText}>Volver a Administracion</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    ...Platform.select({ web: { position: 'fixed' as any } }),
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    maxWidth: 640,
    width: '100%',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  btnText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
});
