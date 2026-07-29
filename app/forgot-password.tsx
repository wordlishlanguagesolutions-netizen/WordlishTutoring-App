import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { colors, radius, spacing, shadow } from '@/constants/theme';
import { PageContainer } from '@/components/ui/PageContainer';
import { useResponsive } from '@/hooks/useResponsive';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const { isDesktop } = useResponsive();

  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sent, setSent] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Ingresa tu correo.');
      return;
    }
    setLoading(true);
    const result = await resetPassword(email.trim());
    setLoading(false);
    // Mensaje neutral en cualquier caso (no revelamos existencia de cuentas).
    if (!result.ok && result.error) {
      // Solo mostramos error tecnico si el modo real esta desactivado.
      const msg = result.error.toLowerCase();
      if (msg.includes('modo real')) {
        setError(result.error);
        return;
      }
    }
    setSent(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isDesktop && styles.contentDesktop,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <PageContainer maxWidth="auth" center={isDesktop}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={18} color={colors.primaryDark} />
              <Text style={styles.backText}>Volver</Text>
            </Pressable>

            <View style={styles.header}>
              <Text style={styles.title}>Recuperar contrasena</Text>
              <Text style={styles.subtitle}>
                Ingresa tu correo y te enviaremos instrucciones para restablecerla.
              </Text>
            </View>

            {sent ? (
              <View style={styles.successCard}>
                <Ionicons name="mail-open" size={24} color={colors.primaryDark} />
                <Text style={styles.successTitle}>Revisa tu correo</Text>
                <Text style={styles.successText}>
                  Si existe una cuenta con este correo, recibiras instrucciones para
                  restablecer tu contrasena.
                </Text>
                <Pressable
                  onPress={() => router.replace('/login')}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.submitText}>Volver al inicio</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color={colors.textSubtle} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tu@correo.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>

                {error ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={16} color={colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleSubmit}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    pressed && { opacity: 0.9 },
                    loading && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.submitText}>
                    {loading ? 'Enviando...' : 'Enviar instrucciones'}
                  </Text>
                </Pressable>
              </View>
            )}
          </PageContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  contentDesktop: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  backText: { color: colors.primaryDark, fontWeight: '600', fontSize: 13 },
  header: { marginBottom: spacing.xl, gap: 6 },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 16, color: colors.textSubtle, fontWeight: '500' },
  form: { gap: spacing.md },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.text },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '600', flex: 1 },
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    ...shadow.sm,
  },
  submitText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
  successCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    gap: spacing.sm,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  successText: {
    fontSize: 14,
    color: colors.textSubtle,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
});
