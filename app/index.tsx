import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getRoleInfo } from '@/constants/roles';
import { colors } from '@/constants/theme';

// Spinner cross-platform hecho solo con View + Animated.
// Evita ActivityIndicator porque en el runtime móvil actual su view manager
// se resuelve a ProgressBarAndroid, que no está registrado y dispara
// "Invariant Violation: View config not found for component `ProgressBarAndroid`".
function Spinner({ size = 44, color = colors.primary }: { size?: number; color?: string }) {
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rot, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rot]);

  const spin = rot.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const border = Math.max(2, Math.round(size / 10));

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: border,
        borderColor: `${color}22`,
        borderTopColor: color,
        transform: [{ rotate: spin }],
      }}
    />
  );
}

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.wrap}>
        <Spinner size={44} color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  const route = getRoleInfo(user.role).route as any;
  return <Redirect href={route} />;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
