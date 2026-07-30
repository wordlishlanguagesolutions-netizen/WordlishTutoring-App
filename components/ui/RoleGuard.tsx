import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getRoleInfo, type UserRole } from '@/constants/roles';
import { colors, spacing, typography } from '@/constants/theme';

// ============================================================================
// RoleGuard · protege un layout de rol contra accesos por URL directa.
//
// Reglas:
//   - Si no hay sesion → redirige a /login.
//   - Si el rol del usuario coincide con `allow` → renderiza los hijos.
//   - Si el usuario es `admin` y `allow` != 'admin' → tambien se permite
//     (uso legitimo del modo "Ver como..." implementado en el dashboard
//     de administracion). El banner sticky ya avisa que esta viendo como
//     otro rol; su rol real sigue siendo admin.
//   - En cualquier otro caso → redirige al dashboard del rol real, evitando
//     que un estudiante vea shells del profesor, admin, etc.
//
// Este componente NO agrega funcionalidad nueva: solo cierra la brecha de
// UI (RLS ya cubre el acceso a datos, pero un shell vacio no debe abrirse).
// ============================================================================

interface Props {
  allow: UserRole;
  children: React.ReactNode;
}

export function RoleGuard({ allow, children }: Props) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      try { router.replace('/login'); } catch {}
      return;
    }
    if (user.role === allow) return;
    // Admin puede ver cualquier panel (modo "Ver como..." o inspeccion).
    if (user.role === 'admin') return;
    // Otros roles: redirigir a su dashboard real.
    try {
      const route = getRoleInfo(user.role).route as any;
      router.replace(route);
    } catch {}
  }, [user, loading, allow]);

  if (loading) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.text}>Cargando...</Text>
      </View>
    );
  }
  if (!user) return null;
  if (user.role !== allow && user.role !== 'admin') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.text}>Redirigiendo...</Text>
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  text: { ...typography.caption, color: colors.textMuted },
});
