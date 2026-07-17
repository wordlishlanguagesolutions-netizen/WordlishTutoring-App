import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTabBarStyle, tabScreenOptions } from '@/constants/tabs';
import { colors } from '@/constants/theme';
import { TeacherNotificationsProvider } from '@/contexts/TeacherNotificationsContext';
import { useTeacherNotifications } from '@/hooks/useTeacherNotifications';
import { WebSidebar, type SidebarItem } from '@/components/ui/WebSidebar';
import { useResponsive } from '@/hooks/useResponsive';

// Barra inferior simplificada · 4 tabs.
// Inicio / Agenda (fusiona horario + clases) / Pendientes (todas las acciones)
// / Perfil. Se eliminaron las tabs de Disponibilidad, Clases y Reportes,
// que ahora viven consolidadas dentro de Agenda y Pendientes.
//
// Adaptación web: en desktop se muestra el sidebar lateral izquierdo con los
// mismos 4 items y se oculta la barra inferior. Móvil y tablet sin cambios.

const TEACHER_NAV: SidebarItem[] = [
  { label: 'Inicio', icon: 'home', route: '/(teacher)' },
  { label: 'Agenda', icon: 'calendar', route: '/(teacher)/agenda' },
  { label: 'Pendientes', icon: 'checkmark-done', route: '/(teacher)/pendientes' },
  { label: 'Perfil', icon: 'person', route: '/(teacher)/profile' },
];

function TeacherTabs() {
  const insets = useSafeAreaInsets();
  const { weekPublished, pendingReports } = useTeacherNotifications();
  const { isDesktop } = useResponsive();

  const badgeStyle = {
    backgroundColor: colors.danger,
    color: colors.textOnPrimary,
    fontSize: 10,
    minWidth: 16,
    height: 16,
    lineHeight: 16,
  } as const;

  const pendingTotal = pendingReports; // Suma real se hace en la pantalla; aquí solo señal visual mínima.

  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
      {isDesktop ? <WebSidebar items={TEACHER_NAV} /> : null}
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
            name="agenda"
            options={{
              title: 'Agenda',
              tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
              tabBarBadge: !weekPublished ? '!' : undefined,
              tabBarBadgeStyle: badgeStyle,
            }}
          />
          <Tabs.Screen
            name="pendientes"
            options={{
              title: 'Pendientes',
              tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done" size={size} color={color} />,
              tabBarBadge: pendingTotal > 0 ? pendingTotal : undefined,
              tabBarBadgeStyle: badgeStyle,
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

export default function TeacherLayout() {
  return (
    <TeacherNotificationsProvider>
      <TeacherTabs />
    </TeacherNotificationsProvider>
  );
}
