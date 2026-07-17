import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { FULL_POLICIES_DOC } from '@/constants/contextualPolicies';

// ============================================================================
// Políticas de Wordlish · documento completo consultable desde Perfil.
// Nunca se obliga al usuario a leerlo. Se accede sólo cuando lo desea.
// El resto de la app muestra cada política de forma contextual, en el
// momento exacto en que ayuda al usuario.
// ============================================================================

export default function PoliciesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={s.iconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Consulta cuando lo necesites</Text>
          <Text style={typography.h2}>Políticas de Wordlish</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.intro}>
          Estas reglas te acompañan durante todo tu recorrido. Aparecen
          automáticamente en el momento en que las necesitas, para que no
          tengas que memorizarlas.
        </Text>

        {FULL_POLICIES_DOC.map((section) => (
          <View key={section.title} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardIcon}>
                <Ionicons
                  name={section.icon as any}
                  size={16}
                  color={colors.primaryDark}
                />
              </View>
              <Text style={s.cardTitle}>{section.title}</Text>
            </View>
            <View style={s.rules}>
              {section.lines.map((line, i) => (
                <View key={i} style={s.ruleRow}>
                  <View style={s.bullet} />
                  <Text style={s.ruleText}>{line}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <Text style={s.footer}>
          Wordlish acompaña, no vigila. Si necesitas apoyo humano, escríbenos
          desde Soporte en tu Perfil.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: {
    ...typography.body,
    color: colors.textSubtle,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.text,
  },
  rules: { gap: spacing.sm },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  ruleText: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
