import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { PaymentMethods } from '@/components/booking/PaymentMethods';
import { createNotification } from '@/services/notificationService';
import { getUsersByRole, hydrateUsers } from '@/services/usersService';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

// ============================================================================
// Pantalla unica de compra de plan / recarga. Se abre al tocar "Adquirir
// plan o recarga" en Reservas. Reutiliza <PaymentMethods /> para no
// duplicar la logica visual del Paso 4 del wizard.
// ============================================================================

export default function BookingPay() {
  const router = useRouter();
  const { user } = useAuth();
  const [proof, setProof] = useState<{ name: string; at: number } | null>(null);

  // Cierre final MVP: los userIds hardcodeados ('u-admin' / 'u-sup')
  // fueron eliminados. Reutilizamos exactamente el mismo mecanismo que
  // BookingsContext.submitPaymentProof: resolver los admins y
  // supervisores activos desde Cloud via getUsersByRole().
  useEffect(() => {
    hydrateUsers().catch(() => undefined);
  }, []);

  const handleUploadProof = (payload: { name: string; method?: any; receiptPath?: string | null }) => {
    const at = Date.now();
    const staff = [
      ...getUsersByRole('admin'),
      ...getUsersByRole('supervisor'),
    ].filter((u) => u.active !== false);
    const targets = staff.length > 0 ? staff.map((u) => u.id) : [];
    targets.forEach((uid) => {
      createNotification({
        userId: uid,
        type: 'payment_pending',
        title: 'Comprobante recibido',
        message: `Compra de plan/recarga - ${user?.email ?? 'usuario'} - Revisar en pagos`,
        refType: 'payment',
        refId: `manual-${at}`,
        actionRoute: '/(admin)/finance',
        actionLabel: 'Revisar pago',
      });
    });
    setProof({ name: payload.name, at });
  };

  const handleReplaceProof = () => setProof(null);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Pago Wordlish</Text>
          <Text style={typography.h2}>Elige como pagar</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      >
        <PaymentMethods
          receiptPathPrefix={`plans/${user?.id ?? 'anon'}`}
          onUploadProof={handleUploadProof}
          uploadedProof={proof}
          onReplaceProof={handleReplaceProof}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
