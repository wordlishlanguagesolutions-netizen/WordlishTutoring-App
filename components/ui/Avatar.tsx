import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '@/constants/theme';

interface AvatarProps {
  name?: string;
  uri?: string | null;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ name = '?', uri, size = 44, style }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const dim = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.wrap, dim, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={dim}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initial}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: { color: colors.textOnPrimary, fontWeight: '700' },
});
