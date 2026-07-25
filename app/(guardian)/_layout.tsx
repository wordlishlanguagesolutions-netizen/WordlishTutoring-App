import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTabBarStyle, tabScreenOptions } from '@/constants/tabs';
import { WebSidebar, type SidebarItem } from '@/components/ui/WebSidebar';
import { useResponsive } from '@/hooks/useResponsive';

// ============================================================================
// Layout del acudiente.
//
// UNIFICACIÓN: "Reservar" y "Pagar" son un solo flujo. El tab "Mi plan"
// se oculta; su contenido vive dentro de "Reservas".
// ============================================================================

const GUARDIAN_NAV: SidebarItem[] = [
  { label: 'Inicio', icon: 'home', route: '/(guardian)' },
  { label: 'Reservas', icon: 'add-circle', route: '/(guardian)/book' },
  { label: 'Reportes', icon: 'document-text', route: '/(guardian)/progress' },
  { label: 'Perfil', icon: 'person', route: '/(guardian)/profile' },
];

export default function GuardianLayout() {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();

  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
      {isDesktop ? <WebSidebar items={GUARDIAN_NAV} /> : null}
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            ...tabScreenOptions,
            tabBarStyle: isDesktop
              ? { display: 'none' }
              : createTabBarStyle(insets),
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Inicio',
              tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="book"
            options={{
              title: 'Reservas',
              tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
            }}
          />
          {/* Mi plan · oculto del tab bar; sigue accesible por ruta directa */}
          <Tabs.Screen name="payments" options={{ href: null }} />
          <Tabs.Screen
            name="progress"
            options={{
              title: 'Reportes',
              tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Perfil',
              tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
            }}
          />
        </Tabs>
      </View>
    </View>
  );
}
