import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import {
  GROWTH_PROGRAM,
  OUR_STANDARD,
  CULTURE_BLOCKS,
} from '@/constants/teacherCulture';

// ============================================================================
// Pantalla "Programa Wordlish" · cultura del equipo docente.
// No es un reglamento. Es la manera Wordlish de dar clase, redactada
// con tono cercano, profesional y motivador. Accesible desde el perfil
// del profesor cuando quiera consultarla.
// ============================================================================

export default function TeacherStandardsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={typography.h2}>Programa Wordlish</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro cálida */}
        <View style={styles.intro}>
          <Ionicons name="ribbon" size={20} color={colors.primaryDark} />
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Formamos un equipo, no una lista.</Text>
            <Text style={styles.introSubtitle}>
              Este es nuestro estándar. La manera Wordlish de dar clase.
            </Text>
          </View>
        </View>

        {/* Programa de crecimiento */}
        <Text style={styles.section}>Programa de crecimiento</Text>
        <View style={{ gap: spacing.sm }}>
          {(['essential', 'special'] as const).map((k) => {
            const p = GROWTH_PROGRAM[k];
            return (
              <View key={k} style={styles.levelCard}>
                <View style={styles.levelHead}>
                  <View
                    style={[
                      styles.levelDot,
                      k === 'special' && { backgroundColor: colors.primary },
                    ]}
                  />
                  <Text style={styles.levelName}>{p.name}</Text>
                  <Text style={styles.levelTag}>{p.tagline}</Text>
                </View>
                <Text style={styles.levelDesc}>{p.description}</Text>
                <View style={styles.benefitsWrap}>
                  {p.benefits.map((b) => (
                    <View key={b} style={styles.benefit}>
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={colors.primaryDark}
                      />
                      <Text style={styles.benefitText}>{b}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.hint}>
          El crecimiento dentro de Wordlish se evalúa de manera continua.
        </Text>

        {/* Nuestro estándar */}
        <Text style={styles.section}>Nuestro estándar</Text>
        <View style={styles.standardCard}>
          {OUR_STANDARD.map((line) => (
            <View key={line} style={styles.standardRow}>
              <View style={styles.standardBullet} />
              <Text style={styles.standardText}>{line}</Text>
            </View>
          ))}
        </View>

        {/* Bloques de cultura */}
        {CULTURE_BLOCKS.map((b) => (
          <View key={b.id} style={styles.block}>
            <View style={styles.blockHead}>
              <View style={styles.blockIcon}>
                <Ionicons
                  name={b.icon as any}
                  size={14}
                  color={colors.primaryDark}
                />
              </View>
              <Text style={styles.blockTitle}>{b.title}</Text>
            </View>
            {b.lines.map((l) => (
              <Text key={l} style={styles.blockLine}>
                {l}
              </Text>
            ))}
          </View>
        ))}

        {/* Cierre cálido */}
        <View style={styles.close}>
          <Text style={styles.closeTitle}>
            Cada interacción transmite orgullo de pertenecer a Wordlish.
          </Text>
          <Text style={styles.closeSubtitle}>
            Gracias por elegir enseñar con nosotros.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  introTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  introSubtitle: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
    fontWeight: '500',
  },

  section: {
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },

  levelCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  levelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  levelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryLight,
  },
  levelName: { fontSize: 16, fontWeight: '700', color: colors.text },
  levelTag: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  levelDesc: {
    fontSize: 13,
    color: colors.textSubtle,
    lineHeight: 19,
    fontWeight: '500',
  },
  benefitsWrap: { marginTop: spacing.sm, gap: 4 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benefitText: { fontSize: 12, color: colors.text, fontWeight: '600' },

  standardCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  standardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  standardBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  standardText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },

  block: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  blockIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.1,
  },
  blockLine: {
    fontSize: 12,
    color: colors.textSubtle,
    lineHeight: 18,
    fontWeight: '500',
  },

  close: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
  },
  closeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  closeSubtitle: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
});
