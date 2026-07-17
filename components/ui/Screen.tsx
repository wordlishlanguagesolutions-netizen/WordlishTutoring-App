import React, { ReactNode } from 'react';
import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/constants/theme';
import { PageContainer, PageWidth } from './PageContainer';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
  // Ancho máximo del contenido en tablet/desktop. En móvil es transparente.
  // Uso EXCLUSIVAMENTE visual: no cambia lógica ni rutas.
  maxWidth?: PageWidth;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['top'],
  maxWidth = 'home',
}: ScreenProps) {
  const content = padded ? <View style={styles.padded}>{children}</View> : children;

  const wrapped = <PageContainer maxWidth={maxWidth}>{content}</PageContainer>;

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {wrapped}
        </ScrollView>
      ) : (
        <View style={styles.scroll}>{wrapped}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
});
