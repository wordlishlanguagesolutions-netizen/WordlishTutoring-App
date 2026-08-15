import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { WordlishLogo } from './WordlishLogo';
import { colors, spacing, radius, typography } from '@/constants/theme';
import { SIDEBAR_WIDTH } from '@/constants/breakpoints';

// ============================================================================
// WebSidebar · barra lateral izquierda fija para viewport desktop (≥ 1024 px).
// Solo se debe renderizar cuando el layout detecta desktop mediante
// useResponsive. En móvil y tablet permanece invisible y se conserva la
// barra inferior existente.
//
// USO EXCLUSIVAMENTE VISUAL:
//   · Reutiliza router.push de expo-router.
//   · No modifica rutas, contextos, servicios ni lógica.
//   · Los items reciben la ruta completa con grupo (ej: '/(student)/book').
//   · El estado activo se calcula quitando los grupos '(x)' del path.
// ============================================================================

export interface SidebarItem {
  label: string;
  icon: string;
  route: string;
}

interface WebSidebarProps {
  items: SidebarItem[];
}

function toPathname(route: string): string {
  const stripped = route.replace(/\/\([^)]+\)/g, '');
  return stripped === '' ? '/' : stripped;
}

function isActive(currentPathname: string, route: string): boolean {
  const target = toPathname(route);
  if (target === '/') {
    return currentPathname === '/' || currentPathname === '';
  }
  return currentPathname === target;
}

export function WebSidebar({ items }: WebSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <WordlishLogo width={168} />
      </View>

      <ScrollView
        style={styles.nav}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => {
          const active = isActive(pathname ?? '/', item.route);
          return (
            <Pressable
              key={item.route}
              onPress={() => router.push(item.route as any)}
              accessibilityRole="link"
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.item,
                active && styles.itemActive,
                pressed && !active && styles.itemPressed,
              ]}
            >
              <Ionicons
                name={item.icon as any}
                size={18}
                color={active ? colors.primaryDark : colors.textSubtle}
              />
              <Text style={[styles.label, active && styles.labelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Wordlish Education</Text>
        <Text style={styles.footerTagline}>Aprende · Conecta · Aplica</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  brand: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xl,
  },
  nav: {
    flex: 1,
  },
  navContent: {
    gap: 4,
    paddingBottom: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  itemActive: {
    backgroundColor: colors.primarySoft,
  },
  itemPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSubtle,
  },
  labelActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerTagline: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
