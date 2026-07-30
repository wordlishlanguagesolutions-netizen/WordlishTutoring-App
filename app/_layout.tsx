import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template/ui';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { BookingsProvider } from '@/contexts/BookingsContext';
import { DraftBookingProvider } from '@/contexts/DraftBookingContext';
import { PushBootstrap } from '@/components/PushBootstrap';
import { colors, spacing, typography, radius } from '@/constants/theme';

// ============================================================================
// Nota sobre iconos:
//   Ya no cargamos la fuente Ionicons con expo-font. El runtime móvil de
//   OnSpace no expone ExpoFontLoader.isLoadedNative, y @expo/vector-icons
//   lo invocaba en cada render provocando el crash:
//     TypeError: undefined is not a function
//     isLoadedNative -> isLoaded -> Icon
//   Los iconos ahora vienen de components/ui/Icon.tsx (drop-in con glifos
//   Unicode), por eso este layout ya no necesita useLazyIconFont ni
//   coordinar la precarga de fuentes.
//
// El ErrorBoundary se conserva únicamente como red de seguridad general:
// no oculta errores, los muestra en pantalla con nombre, mensaje, stack
// y botón Reintentar real.
// ============================================================================

interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  raw: string;
}

function normalizeThrown(value: unknown): ErrorInfo {
  if (value === null || value === undefined) {
    return {
      name: 'UnknownError',
      message: `Se lanzó el valor ${String(value)}.`,
      raw: String(value),
    };
  }
  if (value instanceof Error) {
    const msg =
      typeof value.message === 'string' && value.message.trim().length > 0
        ? value.message
        : '(Error sin mensaje)';
    const safeMsg =
      msg === 'undefined'
        ? 'El mensaje del error es literalmente la cadena "undefined".'
        : msg;
    return {
      name: value.name || 'Error',
      message: safeMsg,
      stack: value.stack,
      raw: msg,
    };
  }
  if (typeof value === 'string') {
    return {
      name: 'StringError',
      message: value.length > 0 ? value : '(cadena vacía)',
      raw: value,
    };
  }
  try {
    const asJson = JSON.stringify(value);
    return { name: 'ValueError', message: asJson, raw: asJson };
  } catch {
    return { name: 'ValueError', message: '(objeto no serializable)', raw: '[object]' };
  }
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { info: ErrorInfo | null }
> {
  state: { info: ErrorInfo | null } = { info: null };

  static getDerivedStateFromError(error: unknown) {
    return { info: normalizeThrown(error) };
  }

  componentDidCatch(error: unknown, errorInfo: { componentStack?: string }) {
    const info = normalizeThrown(error);
    console.error('[app/_layout.tsx][RootErrorBoundary.componentDidCatch]', {
      file: 'app/_layout.tsx',
      function: 'RootErrorBoundary.componentDidCatch',
      valueType: typeof error,
      valueRaw: info.raw,
      errorName: info.name,
      errorMessage: info.message,
      stack: info.stack,
      componentStack: errorInfo?.componentStack,
      platform: Platform.OS,
    });
  }

  handleRetry = () => {
    this.setState({ info: null });
  };

  render() {
    const info = this.state.info;
    if (info) {
      return (
        <View style={styles.errorWrap}>
          <ScrollView contentContainerStyle={styles.errorInner}>
            <View style={styles.errorHeader}>
              <Text style={typography.h2}>Ups, algo salió mal</Text>
              <Text style={styles.errorTag}>{info.name}</Text>
            </View>

            <View style={styles.errorCard}>
              <Text style={styles.errorLabel}>Mensaje</Text>
              <Text style={styles.errorMessage}>{info.message}</Text>
            </View>

            <View style={styles.errorCard}>
              <Text style={styles.errorLabel}>Plataforma</Text>
              <Text style={styles.errorMessage}>
                {Platform.OS} {String(Platform.Version)}
              </Text>
            </View>

            {info.stack ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorLabel}>Stack</Text>
                <Text style={styles.stackText}>{info.stack}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={this.handleRetry}
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

if (
  !AlertProvider ||
  !AuthProvider ||
  !NotificationsProvider ||
  !BookingsProvider ||
  !DraftBookingProvider ||
  !SafeAreaProvider
) {
  console.error('[app/_layout.tsx] Provider undefined detectado en imports', {
    file: 'app/_layout.tsx',
    function: 'module-load',
    AlertProvider: typeof AlertProvider,
    AuthProvider: typeof AuthProvider,
    NotificationsProvider: typeof NotificationsProvider,
    BookingsProvider: typeof BookingsProvider,
    DraftBookingProvider: typeof DraftBookingProvider,
    SafeAreaProvider: typeof SafeAreaProvider,
  });
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <AlertProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <NotificationsProvider>
              <BookingsProvider>
                <DraftBookingProvider>
                  <PushBootstrap />
                  <Stack screenOptions={{ headerShown: false }} />
                </DraftBookingProvider>
              </BookingsProvider>
            </NotificationsProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </AlertProvider>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorWrap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorInner: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  errorHeader: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  errorTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  errorLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorMessage: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  stackText: {
    fontSize: 11,
    color: colors.textSubtle,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  retryText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
});
