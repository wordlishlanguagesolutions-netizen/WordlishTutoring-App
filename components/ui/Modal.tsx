import React, { ReactNode, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import {
  colors,
  radius,
  spacing,
  typography,
  shadow,
  motion,
} from '@/constants/theme';

// ============================================================================
// Modal · superficie flotante oficial del Design System.
//
// Reglas:
//   · Border radius 24 px.
//   · Backdrop translúcido con overlay.
//   · Fade + slide muy sutil al aparecer (220 ms).
//   · Botón cerrar en la esquina superior derecha.
//   · Título tipográfico h3, contenido con espacio holgado.
// ============================================================================

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  primaryAction?: {
    label: string;
    onPress: () => void;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
  scrollable?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  primaryAction,
  secondaryAction,
  scrollable = false,
}: ModalProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.base,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: motion.base,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(12);
    }
  }, [visible, opacity, translateY]);

  const Body = scrollable ? ScrollView : View;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={Platform.OS === 'android' ? 'fade' : 'none'}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY }] },
          ]}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Cerrar"
              style={({ pressed }) => [
                styles.close,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.textSubtle} />
            </Pressable>
          </View>

          <Body style={styles.body} contentContainerStyle={{ gap: spacing.md }}>
            {children}
          </Body>

          {(primaryAction || secondaryAction) && (
            <View style={styles.actions}>
              {secondaryAction ? (
                <Pressable
                  onPress={secondaryAction.onPress}
                  style={({ pressed }) => [
                    styles.actionGhost,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.actionGhostText}>{secondaryAction.label}</Text>
                </Pressable>
              ) : null}
              {primaryAction ? (
                <Pressable
                  onPress={primaryAction.onPress}
                  style={({ pressed }) => [
                    styles.actionPrimary,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <Text style={styles.actionPrimaryText}>{primaryAction.label}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: radius.modal,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadow.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  title: {
    ...typography.h3,
  },
  subtitle: {
    ...typography.subtitle,
    marginTop: 4,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    // Contenedor de contenido del modal
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  actionGhost: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionGhostText: {
    ...typography.button,
    color: colors.textSubtle,
  },
  actionPrimary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    ...shadow.sm,
  },
  actionPrimaryText: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
});
