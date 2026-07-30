import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTabBarStyle, tabScreenOptions } from '@/constants/tabs';
import { WebSidebar, type SidebarItem } from '@/components/ui/WebSidebar';
import { useResponsive } from '@/hooks/useResponsive';

// ============================================================================
// Layout del estudiante.
//
// UNIFICACIÓN (una necesidad = un solo flujo):
//   "Reservar" y "Pagar" dejan de ser módulos separados. Todo vive dentro
//   de "Reservas". El archivo payments.tsx sigue existiendo como pantalla
//   accesible por deep-link (historial > detalle), pero se oculta del
//   sidebar y del tab bar con href:null.
// ============================================================================

const STUDENT_NAV: SidebarItem[] = [
  { label: 'Inicio', icon: 'home', route: '/(student)' },
  { label: 'Mis clases', icon: 'add-circle', route: '/(student)/book' },
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
              title: 'Mis clases',
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
