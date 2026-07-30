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
import { authService } from '@/services/authService';
import { contactLoginSupport } from '@/services/supportService';
import { primaryAdminExists } from '@/services/bootstrapAdminService';
import { getRoleInfo } from '@/constants/roles';
import { colors, radius, spacing, typography, shadow } from '@/constants/theme';
import { PageContainer } from '@/components/ui/PageContainer';
import { useResponsive } from '@/hooks/useResponsive';
import type { AccountType } from '@/types';

type Step = 'type' | 'credentials';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('type');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showBootstrap, setShowBootstrap] = useState<boolean>(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const exists = await primaryAdminExists();
      if (alive) setShowBootstrap(!exists);
    })();
    return () => { alive = false; };
  }, []);

  const accounts = accountType ? authService.getTestAccounts(accountType) : [];
  const showTestAccounts = accounts.length > 0; // solo modo mock
  const { isDesktop } = useResponsive();

  const pickType = (t: AccountType) => {
    setAccountType(t);
    setEmail('');
    setPassword('');
    setError('');
    setStep('credentials');
  };

  const goBack = () => {
    setStep('type');
    setAccountType(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleFill = (accEmail: string) => {
    setEmail(accEmail);
    setPassword('123456');
    setError('');
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await signIn(email, password, accountType ?? undefined);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.user) {
      const route = getRoleInfo(result.user.role).route as any;
      router.replace(route);
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
          {step === 'type' ? (
            <>
              {/* Placeholder discreto para el logotipo definitivo.
                  Se reemplazará por el asset oficial cuando esté disponible. */}
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>Logo Wordlish</Text>
              </View>

              <View style={styles.header}>
                <Text style={styles.title}>¿Cómo deseas ingresar?</Text>
                <Text style={styles.subtitle}>
                  Selecciona tu perfil para continuar.
                </Text>
              </View>

              <View style={styles.cardsWrap}>
                <Pressable
                  onPress={() => pickType('student_guardian')}
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View style={styles.cardIcon}>
                    <Ionicons name="people" size={26} color={colors.primaryDark} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>Estudiante o acudiente</Text>
                    <Text style={styles.cardSub}>
                      Reserva clases, consulta pagos y revisa tus reportes.
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textMuted}
                  />
                </Pressable>

                <Pressable
                  onPress={() => pickType('staff')}
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View style={styles.cardIcon}>
                    <Ionicons name="briefcase" size={26} color={colors.primaryDark} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>Staff</Text>
                    <Text style={styles.cardSub}>
                      Profesores, supervisores y administración.
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>

              {/* Registro publico · disponible para estudiantes/acudientes */}
              <View style={styles.signupBlock}>
                <Text style={styles.signupLead}>¿No tienes cuenta?</Text>
                <Pressable
                  onPress={() => router.push('/signup' as any)}
                  hitSlop={10}
                  style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.signupLink}>Crear cuenta</Text>
                </Pressable>
              </View>

              {/* Bootstrap del admin principal (solo si aun no existe uno) */}
              {showBootstrap ? (
                <Pressable
                  onPress={() => router.push('/bootstrap-admin' as any)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.bootstrapLink, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name="shield-checkmark" size={14} color={colors.textMuted} />
                  <Text style={styles.bootstrapLinkText}>Configurar Administrador principal</Text>
                </Pressable>
              ) : null}

              {/* Soporte al final · discreto, tipográfico, sin FAB ni burbujas */}
              <View style={styles.supportBlock}>
                <Text style={styles.supportLead}>¿Necesitas ayuda?</Text>
                <Pressable
                  onPress={contactLoginSupport}
                  hitSlop={10}
                  accessibilityLabel="Contactar por WhatsApp"
                  style={({ pressed }) => [
                    styles.supportLink,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Ionicons
                    name="logo-whatsapp"
                    size={18}
                    color={colors.textSubtle}
                  />
                  <Text style={styles.supportLinkText}>Contactar por WhatsApp</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.logoPlaceholderSmall}>
                <Text style={styles.logoPlaceholderTextSmall}>Logo Wordlish</Text>
              </View>

              <View style={styles.tierRow}>
                <Pressable onPress={goBack} hitSlop={10} style={styles.backBtn}>
                  <Ionicons name="chevron-back" size={18} color={colors.primaryDark} />
                  <Text style={styles.backText}>Cambiar</Text>
                </Pressable>
                <View style={styles.tierBadge}>
                  <Ionicons
                    name={accountType === 'staff' ? 'briefcase' : 'people'}
                    size={14}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.tierText}>
                    {accountType === 'staff' ? 'Staff' : 'Estudiante o acudiente'}
                  </Text>
                </View>
              </View>

              <View style={styles.form}>
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
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textSubtle} />
                  <TextInput
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      setError('');
                    }}
                    placeholder="Contraseña"
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

                <Pressable
                  onPress={() => router.push('/forgot-password' as any)}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.forgotLinkWrap,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={styles.forgotLink}>¿Olvidaste tu contraseña?</Text>
                </Pressable>

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
                    pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                    loading && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.submitText}>
                    {loading ? 'Ingresando...' : 'Ingresar'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.textOnPrimary} />
                </Pressable>

                {accountType === 'student_guardian' ? (
                  <Pressable
                    onPress={() => router.push('/signup' as any)}
                    hitSlop={10}
                    style={styles.signupInlineRow}
                  >
                    <Text style={styles.signupInlineMuted}>¿No tienes cuenta?</Text>
                    <Text style={styles.signupInlineLink}> Crear cuenta</Text>
                  </Pressable>
                ) : null}
              </View>

              {showTestAccounts ? (
                <View style={styles.banner}>
                  <Ionicons name="flask-outline" size={14} color={colors.primaryDark} />
                  <Text style={styles.bannerText}>
                    Cuentas de prueba · toca para autocompletar (clave 123456)
                  </Text>
                </View>
              ) : null}

              <View style={{ gap: spacing.sm }}>
                {accounts.map((acc) => {
                  const info = getRoleInfo(acc.role);
                  return (
                    <Pressable
                      key={acc.email}
                      onPress={() => handleFill(acc.email)}
                      style={({ pressed }) => [
                        styles.accCard,
                        pressed && { opacity: 0.85 },
                        email === acc.email && styles.accCardActive,
                      ]}
                    >
                      <View style={styles.roleIcon}>
                        <Ionicons name={info.icon as any} size={18} color={colors.primaryDark} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={typography.bodyStrong}>{info.label}</Text>
                        <Text style={typography.caption}>{acc.email}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </Pressable>
                  );
                })}
              </View>
            </>
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

  // Placeholder de logo · pequeño, elegante, alineado arriba
  logoPlaceholder: {
    alignSelf: 'center',
    minWidth: 120,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  logoPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSubtle,
    letterSpacing: 0.4,
  },
  logoPlaceholderSmall: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  logoPlaceholderTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSubtle,
    letterSpacing: 0.3,
  },

  // Encabezado · discreto, deja el protagonismo a las tarjetas
  header: {
    marginBottom: spacing.xl,
    gap: 6,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSubtle,
    fontWeight: '500',
    lineHeight: 24,
  },

  // Tarjetas de acceso · iguales, blancas, borde lavanda sutil
  cardsWrap: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.995 }],
    borderColor: colors.primary,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 18,
    color: colors.textSubtle,
    lineHeight: 24,
    fontWeight: '400',
  },

  // Soporte · texto discreto al final de la pantalla
  signupBlock: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: 4,
  },
  signupLead: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },
  signupLink: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 6,
  },
  forgotLinkWrap: { alignSelf: 'flex-end', paddingVertical: 4 },
  forgotLink: { color: colors.primaryDark, fontSize: 13, fontWeight: '600' },
  signupInlineRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  signupInlineMuted: { color: colors.textMuted, fontSize: 14 },
  signupInlineLink: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
  supportBlock: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: 4,
  },
  supportLead: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '500',
  },
  supportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  supportLinkText: {
    color: colors.textSubtle,
    fontSize: 18,
    fontWeight: '600',
  },
  bootstrapLink: {
    marginTop: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  bootstrapLinkText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Paso credenciales (sin cambios funcionales)
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: colors.primaryDark, fontWeight: '600', fontSize: 13 },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  tierText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },

  form: { gap: spacing.md, marginBottom: spacing.xl },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.lg,
    ...shadow.sm,
  },
  submitText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
    flex: 1,
  },
  accCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
