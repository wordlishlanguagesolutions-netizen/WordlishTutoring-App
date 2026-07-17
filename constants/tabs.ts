import { Platform } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export const createTabBarStyle = (insets: EdgeInsets) => ({
  height: Platform.select({
    ios: insets.bottom + 60,
    android: insets.bottom + 60,
    default: 70,
  }),
  paddingTop: 8,
  paddingBottom: Platform.select({
    ios: insets.bottom + 8,
    android: insets.bottom + 8,
    default: 8,
  }),
  paddingHorizontal: 8,
  backgroundColor: colors.surface,
  borderTopWidth: 1,
  borderTopColor: colors.border,
});

export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
};
