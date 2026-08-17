import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTabBarStyle, tabScreenOptions } from '@/constants/tabs';
import { WebSidebar, type SidebarItem } from '@/components/ui/WebSidebar';
import { useResponsive } from '@/hooks/useResponsive';
import { RoleGuard } from '@/components/ui/RoleGuard';

const ADMIN_NAV: SidebarItem[] = [
  { label: 'Dashboard', icon: 'grid', route: '/(admin)' },
  { label: 'Usuarios', icon: 'people', route: '/(admin)/users' },
  { label: 'Pagos', icon: 'card', route: '/(admin)/finance' },
  { label: 'Paquetes', icon: 'cube', route: '/(admin)/packages' },
  { label: 'Tickets', icon: 'chatbubbles', route: '/(admin)/support-tickets' },
  { label: 'Ajustes', icon: 'settings', route: '/(admin)/settings' },
];

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();

  return (
    <RoleGuard allow="admin">
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
      {isDesktop ? <WebSidebar items={ADMIN_NAV} /> : null}
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
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="users"
            options={{
              title: 'Usuarios',
              tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="finance"
            options={{
              title: 'Pagos',
              tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="packages"
            options={{
              title: 'Paquetes',
              tabBarIcon: ({ color, size }) => <Ionicons name="cube" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Ajustes',
              tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="support-tickets"
            options={{
              // Ruta accesible desde sidebar (desktop) y desde Ajustes (movil).
              // href: null oculta la tab en la barra inferior movil.
              href: null,
              title: 'Tickets',
            }}
          />
        </Tabs>
      </View>
    </View>
    </RoleGuard>
  );
}
