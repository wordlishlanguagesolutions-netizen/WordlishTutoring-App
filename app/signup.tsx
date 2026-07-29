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
import { getRoleInfo } from '@/constants/roles';
import { colors, radius, spacing, typography, shadow } from '@/constants/theme';
import { PageContainer } from '@/components/ui/PageContainer';
import { useResponsive } from '@/hooks/useResponsive';

// Registro publico. Solo crea cuentas con rol 'student' (por defecto del
// trigger handle_new_user en la base de datos). Nunca crea staff.
export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { isDesktop } = useResponsive();

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('');

  const handleSubmit = async () => {
    setError('');
    setInfo('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('Ingresa tu nombre y apellido.');
      return;
    }
    if (!email.trim()) {
      setError('Ingresa tu correo.');
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
    const result = await signUp({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      // OnSpace envia un OTP de 4 digitos. Redirigimos a la pantalla donde
      // el usuario lo introduce, con el correo ya pre-cargado.
      router.replace({
        pathname: '/verify-email',
        params: { email: email.trim() },
      } as any);
      return;
    }
    if (result.user) {
      const route = getRoleInfo(result.user.role).route as any;
      router.replace(route);
    } else {
      router.replace('/login');
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
              <Text style={styles.title}>Crear cuenta</Text>
              <Text style={styles.subtitle}>
                Registrate para reservar clases y consultar tu progreso.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.row}>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <Ionicons name="person-outline" size={18} color={colors.textSubtle} />
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Nombre"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    style={styles.input}
                  />
                </View>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <Ionicons name="person-outline" size={18} color={colors.textSubtle} />
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Apellido"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    style={styles.input}
                  />
                </View>
              </View>

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
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSubtle} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Contrasena (min. 6 caracteres)"
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
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={colors.textOnPrimary} />
              </Pressable>

              <Pressable
                onPress={() => router.replace('/login')}
                hitSlop={10}
                style={styles.linkRow}
              >
                <Text style={styles.linkMuted}>Ya tengo cuenta.</Text>
                <Text style={styles.link}> Iniciar sesion</Text>
              </Pressable>
            </View>
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
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 16, color: colors.textSubtle, fontWeight: '500' },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
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
  submitText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  linkMuted: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
});
