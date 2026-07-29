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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { colors, radius, spacing, shadow } from '@/constants/theme';
import { PageContainer } from '@/components/ui/PageContainer';
import { useResponsive } from '@/hooks/useResponsive';

// Recuperacion de contrasena con OTP (OnSpace Auth envia codigo de 4 digitos).
// Flujo: /forgot-password envia el codigo → aqui el usuario introduce
// correo + codigo + nueva contrasena.
// 1) verifyRecoveryOtp(email, token) → crea sesion de recovery.
// 2) updatePassword(newPassword) → sobrescribe la contrasena.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyRecoveryOtp, updatePassword, resetPassword } = useAuth();
  const { isDesktop } = useResponsive();

  const initialEmail = typeof params.email === 'string' ? params.email : '';
  const [email, setEmail] = useState<string>(initialEmail);
  const [code, setCode] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('');
  const [done, setDone] = useState<boolean>(false);

  const handleSubmit = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Ingresa tu correo.');
      return;
    }
    if (code.trim().length < 4) {
      setError('El codigo tiene 4 digitos.');
      return;
    }
    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contrasenas no coinciden.');
      return;
    }
    setLoading(true);
    const verify = await verifyRecoveryOtp(email.trim(), code.trim());
    if (!verify.ok) {
      setLoading(false);
      setError(verify.error || 'Codigo invalido.');
      return;
    }
    const update = await updatePassword(password);
    setLoading(false);
    if (!update.ok) {
      setError(update.error || 'No se pudo actualizar la contrasena.');
      return;
    }
    setDone(true);
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Ingresa tu correo para reenviar el codigo.');
      return;
    }
    setResending(true);
    const result = await resetPassword(email.trim());
    setResending(false);
    if (result.ok) {
      setInfo('Codigo reenviado. Revisa tu correo.');
    } else if (result.error) {
      setError(result.error);
    } else {
      setInfo('Codigo reenviado. Revisa tu correo.');
    }
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
              <Text style={styles.title}>Nueva contrasena</Text>
              <Text style={styles.subtitle}>
                Ingresa el codigo de 4 digitos que enviamos a tu correo y elige una
                contrasena nueva.
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

                <View style={styles.inputWrap}>
                  <Ionicons name="key-outline" size={18} color={colors.textSubtle} />
                  <TextInput
                    value={code}
                    onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="Codigo (4 digitos)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    maxLength={6}
                    style={[styles.input, styles.otpInput]}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textSubtle} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Nueva contrasena (min. 6)"
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

                {info ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="mail-open-outline" size={16} color={colors.primaryDark} />
                    <Text style={styles.infoText}>{info}</Text>
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

                <Pressable
                  onPress={handleResend}
                  disabled={resending}
                  hitSlop={10}
                  style={styles.linkRow}
                >
                  <Text style={styles.linkMuted}>No recibiste el codigo?</Text>
                  <Text style={styles.link}>
                    {resending ? ' Reenviando...' : ' Reenviar'}
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
  subtitle: { fontSize: 16, color: colors.textSubtle, fontWeight: '500', lineHeight: 22 },
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
  otpInput: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '600', flex: 1 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  infoText: { color: colors.primaryDark, fontSize: 13, fontWeight: '600', flex: 1 },
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
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  linkMuted: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
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
