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

// Pantalla destino del deep-link de Supabase (redirectTo=/reset-password).
// Cuando el usuario llega aqui desde el correo, Supabase ya restauro la
// sesion tipo "recovery", por lo que updateUser({ password }) es suficiente.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword, user } = useAuth();
  const { isDesktop } = useResponsive();

  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [done, setDone] = useState<boolean>(false);

  const handleSubmit = async () => {
    setError('');
    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contrasenas no coinciden.');
      return;
    }
    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || 'No se pudo actualizar la contrasena.');
      return;
    }
    setDone(true);
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
            <View style={styles.header}>
              <Text style={styles.title}>Nueva contrasena</Text>
              <Text style={styles.subtitle}>
                {user
                  ? 'Elige una contrasena segura para tu cuenta.'
                  : 'Abre este enlace desde el correo que te enviamos para continuar.'}
              </Text>
            </View>

            {done ? (
              <View style={styles.successCard}>
                <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                <Text style={styles.successTitle}>Contrasena actualizada</Text>
                <Text style={styles.successText}>
                  Ya puedes iniciar sesion con tu nueva contrasena.
                </Text>
                <Pressable
                  onPress={() => router.replace('/login')}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.submitText}>Ir a iniciar sesion</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textSubtle} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Nueva contrasena"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    style={styles.input}
                  />
                  <Pressable onPress={() => setShowPass(!showPass)} hitSlop={10}>
                    <Ionicons
                      name={showPass ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textSubtle}
                    />
                  </Pressable>
                </View>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textSubtle} />
                  <TextInput
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="Confirmar contrasena"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
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
                    {loading ? 'Guardando...' : 'Actualizar contrasena'}
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
