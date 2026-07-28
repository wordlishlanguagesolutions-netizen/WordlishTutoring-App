import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTabBarStyle, tabScreenOptions } from '@/constants/tabs';
import { WebSidebar, type SidebarItem } from '@/components/ui/WebSidebar';
import { useResponsive } from '@/hooks/useResponsive';

const SUPERVISOR_NAV: SidebarItem[] = [
  { label: 'Monitor', icon: 'pulse', route: '/(supervisor)' },
  { label: 'Historial', icon: 'time', route: '/(supervisor)/history' },
];

export default function SupervisorLayout() {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();

  return (
    <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
      {isDesktop ? <WebSidebar items={SUPERVISOR_NAV} /> : null}
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
              title: 'Monitor',
              tabBarIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: 'Historial',
              tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
            }}
          />
        </Tabs>
      </View>
    </View>
  );
}
