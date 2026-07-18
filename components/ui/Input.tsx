import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import {
  colors,
  radius,
  spacing,
  typography,
  controlHeight,
} from '@/constants/theme';

// ============================================================================
// Input · campo de texto oficial del Design System.
//
// Reglas:
//   · Border radius 16 px.
//   · Altura 52 px (56 con label).
//   · Icono minimalista opcional a la izquierda.
//   · Estados: default, focus, error, disabled.
//   · Etiqueta arriba y helper/error abajo (nunca placeholder-as-label).
// ============================================================================

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: string;
  error?: string;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
  right?: React.ReactNode;
}

export function Input({
  label,
  icon,
  error,
  helper,
  containerStyle,
  right,
  onFocus,
  onBlur,
  editable = true,
  ...textInputProps
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const isError = !!error;
  const borderColor = isError
    ? colors.danger
    : focused
    ? colors.primary
    : colors.border;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          {
            borderColor,
            backgroundColor: editable ? colors.surface : colors.surfaceAlt,
          },
          focused && !isError && styles.fieldFocused,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon as any}
            size={18}
            color={focused ? colors.primary : colors.textMuted}
          />
        ) : null}
        <TextInput
          {...textInputProps}
          editable={editable}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        {right}
      </View>
      {error ? (
        <View style={styles.helperRow}>
          <Ionicons name="alert-circle" size={13} color={colors.danger} />
          <Text style={[styles.helper, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    ...typography.label,
  },
  field: {
    height: controlHeight.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.iconText,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  fieldFocused: {
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.body.fontFamily,
    color: colors.text,
    paddingVertical: 0,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helper: {
    ...typography.caption,
  },
});
