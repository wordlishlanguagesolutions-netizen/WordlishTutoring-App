import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing } from '@/constants/theme';
import { TEACHER_HINTS, TeacherHintKey } from '@/constants/teacherCulture';

// ============================================================================
// TeacherHint · recordatorio contextual de una sola línea.
// Aparece únicamente cuando corresponde, en el lugar adecuado. No es una
// tarjeta ni un aviso: es un susurro discreto que enseña la cultura Wordlish
// de manera natural. Máximo 8 palabras, tono positivo y tranquilo.
// ============================================================================

interface Props {
  hint: TeacherHintKey | string;
  icon?: string;
  align?: 'left' | 'center';
  tone?: 'default' | 'success';
}

export function TeacherHint({
  hint,
  icon = 'sparkles',
  align = 'left',
  tone = 'default',
}: Props) {
  const text =
    (hint as string) in TEACHER_HINTS
      ? TEACHER_HINTS[hint as TeacherHintKey]
      : (hint as string);

  const color = tone === 'success' ? colors.success : colors.primaryDark;

  return (
    <View
      style={[
        styles.wrap,
        align === 'center' && { justifyContent: 'center' },
      ]}
    >
      <Ionicons name={icon as any} size={11} color={color} />
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
    flexShrink: 1,
  },
});
