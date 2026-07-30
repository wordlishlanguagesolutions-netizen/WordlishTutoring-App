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
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/ui/Icon';
import { bootstrapPrimaryAdmin } from '@/services/bootstrapAdminService';
import { colors, radius, spacing, shadow } from '@/constants/theme';
import { PageContainer } from '@/components/ui/PageContainer';
import { useResponsive } from '@/hooks/useResponsive';

// ============================================================================
// Bootstrap del primer administrador principal.
//
// Flujo seguro:
//   1. El propietario se registra desde /signup como estudiante normal.
//   2. Ingresa aqui su correo y ejecuta el bootstrap.
//   3. La RPC lo promueve a admin+is_primary_admin=true (solo si no existe
//      ya un admin principal, para que este endpoint sea seguro).
//   4. Se dispara resetPasswordForEmail para que reciba un enlace/OTP y
//      establezca su contrasena. Nunca se envia una contrasena en claro.
//
// Este endpoint se autobloquea despues del primer uso: si ya hay un admin
// principal, la RPC devuelve error y esta pantalla lo indica.
// ============================================================================

export default function BootstrapAdminScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    email: string;
    passwordEmailSent: boolean;
  } | null>(null);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) {
      setError('Ingresa tu correo.');
      return;
    }
    setLoading(true);
    const res = await bootstrapPrimaryAdmin(email);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'No se pudo completar el bootstrap.');
      return;
    }
    setResult({
      email: res.email ?? email.trim().toLowerCase(),
      passwordEmailSent: Boolean(res.passwordEmailSent),
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
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
              <View style={styles.iconWrap}>
                <Ionicons name="shield-checkmark" size={26} color={colors.primary} />
              </View>
              <Text style={styles.title}>Configurar Administrador principal</Text>
              <Text style={styles.subtitle}>
                Este paso solo se ejecuta una vez. Si ya existe un administrador
                principal, la operacion sera rechazada automaticamente.
              </Text>
            </View>

            {result ? (
              <View style={styles.successCard}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <Text style={styles.successTitle}>
                  {result.email} ahora es Administrador principal.
                </Text>
                <Text style={styles.successBody}>
                  {result.passwordEmailSent
                    ? 'Se envio un correo para que establezcas tu contrasena de forma segura. Revisa tu bandeja e ingresa el codigo (OTP) desde la pantalla "Recuperar contrasena".'
                    : 'No se pudo enviar el correo automaticamente. Usa "Recuperar contrasena" desde la pantalla de inicio para recibir el codigo.'}
                </Text>
                <Pressable
                  onPress={() => router.replace('/login')}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.primaryBtnText}>Ir a iniciar sesion</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.textOnPrimary} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.helpCard}>
                  <Ionicons name="information-circle" size={16} color={colors.primaryDark} />
                  <Text style={styles.helpText}>
                    Antes de continuar debes tener una cuenta creada con este
                    correo. Registrate desde "Crear cuenta" si aun no lo hiciste.
                  </Text>
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color={colors.textSubtle} />
                  <TextInput
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      setError('');
                    }}
                    placeholder="tu@correo.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    editable={!loading}
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
                    styles.primaryBtn,
                    pressed && { opacity: 0.9 },
                    loading && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading ? 'Procesando...' : 'Promover a Administrador principal'}
                  </Text>
                  <Ionicons name="shield-checkmark" size={16} color={colors.textOnPrimary} />
                </Pressable>

                <Text style={styles.footNote}>
                  No compartas ni almacenes tu contrasena. La establecera unicamente
                  tu correo mediante el enlace/codigo que enviaremos al terminar.
                </Text>
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
  header: { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.sm },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSubtle,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: { gap: spacing.md },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  helpText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
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
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    ...shadow.sm,
  },
  primaryBtnText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  footNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: spacing.sm,
  },
  successCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 13,
    color: colors.textSubtle,
    lineHeight: 19,
    textAlign: 'center',
  },
});
