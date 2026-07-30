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

// ============================================================================
// Pantalla unica de compra de plan / recarga. Se abre al tocar "Adquirir
// plan o recarga" en Reservas. Reutiliza <PaymentMethods /> para no
// duplicar la logica visual del Paso 4 del wizard.
// ============================================================================

export default function BookingPay() {
  const router = useRouter();
  const [proof, setProof] = useState<{ name: string; at: number } | null>(null);

  const handleUploadProof = (name: string) => {
    const at = Date.now();
    createNotification({
      userId: 'u-admin',
      type: 'payment_pending',
      title: 'Comprobante recibido',
      message: 'Compra de plan/recarga · Revisar en pagos',
      refType: 'payment',
      refId: `manual-${at}`,
      actionRoute: '/(admin)/finance',
      actionLabel: 'Revisar pago',
    });
    createNotification({
      userId: 'u-sup',
      type: 'payment_pending',
      title: 'Comprobante recibido',
      message: 'Compra de plan/recarga · Revisar en pagos',
      refType: 'payment',
      refId: `manual-${at}`,
      actionRoute: '/(admin)/finance',
      actionLabel: 'Revisar pago',
    });
    setProof({ name, at });
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
