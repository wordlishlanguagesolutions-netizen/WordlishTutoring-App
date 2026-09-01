import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTabBarStyle, tabScreenOptions } from '@/constants/tabs';
import { WebSidebar, type SidebarItem } from '@/components/ui/WebSidebar';
import { useResponsive } from '@/hooks/useResponsive';

// ============================================================================
// Layout del estudiante · adaptación visual multi-plataforma.
//   · Móvil y tablet (< 1024 px): barra inferior original, sin cambios.
//   · Desktop (≥ 1024 px): sidebar lateral izquierda fija con scroll
//     independiente en el contenido. La barra inferior se oculta.
// La lógica de rutas y screens permanece intacta.
// ============================================================================

const STUDENT_NAV: SidebarItem[] = [
  { label: 'Inicio', icon: 'home', route: '/(student)' },
  { label: 'Reservas', icon: 'add-circle', route: '/(student)/book' },
  { label: 'Mi plan', icon: 'card', route: '/(student)/payments' },
  { label: 'Reportes', icon: 'document-text', route: '/(student)/progress' },
  { label: 'Perfil', icon: 'person', route: '/(student)/profile' },
];

export default function StudentLayout() {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();

  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
      {isDesktop ? <WebSidebar items={STUDENT_NAV} /> : null}
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
              title: 'Reservar',
              tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="payments"
            options={{
              title: 'Mi plan',
              tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} />,
            }}
          />
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
