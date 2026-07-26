import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Header, Card } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';

const PACKAGES = [
  { id: '1', name: 'Paquete 4 horas', hours: 4, price: 60 },
  { id: '2', name: 'Paquete 8 horas', hours: 8, price: 110 },
  { id: '3', name: 'Paquete 16 horas', hours: 16, price: 200 },
  { id: '4', name: 'Paquete 24 horas', hours: 24, price: 280 },
];

export default function PackagesScreen() {
  return (
    <Screen>
      <Header title="Paquetes" subtitle="Catálogo y precios" />
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          Catálogo de referencia. Para editar precios y tarifas por hora, ve a Ajustes → Tarifas.
        </Text>
      </View>
      <View style={{ gap: spacing.md }}>
        {PACKAGES.map((p) => (
          <Card key={p.id}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={typography.h3}>{p.name}</Text>
                <Text style={typography.caption}>{p.hours} horas de clase</Text>
              </View>
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>${p.price}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  priceBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  priceText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 18 },
  notice: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  noticeText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
  },
});
