import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { Screen, Header, Avatar, WebTwoColumn } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { linkedStudents, reportsHistory } from '@/services/mockData';

// ============================================================================
// Bitacora del estudiante · vista unica para el acudiente.
// Cada clase es un unico registro que agrupa: screenshot, resumen, tarea
// y material. No hay pestanas ni pantallas separadas para materiales.
// ============================================================================

const KIND_ICON: Record<string, string> = {
  PDF: 'document-text',
  Video: 'videocam',
  Link: 'link',
  MP3: 'musical-notes',
  Audio: 'musical-notes',
  DOC: 'document',
};

export default function GuardianProgress() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [activeId, setActiveId] = useState<string>(linkedStudents[0].id);
  const [selectedId, setSelectedId] = useState<string>(
    () => reportsHistory[0]?.id ?? '',
  );
  const selectedReport = useMemo(
    () => reportsHistory.find((r) => r.id === selectedId) ?? reportsHistory[0],
    [selectedId],
  );

  const StudentPicker = linkedStudents.length > 1 ? (
    <View style={styles.pickerRow}>
      {linkedStudents.map((s) => {
        const isActive = s.id === activeId;
        return (
          <Pressable
            key={s.id}
            onPress={() => setActiveId(s.id)}
            style={[styles.pickerChip, isActive && styles.pickerChipActive]}
          >
            <Avatar name={s.name} uri={s.avatar} size={22} />
            <Text style={[styles.pickerText, isActive && { color: colors.textOnPrimary }]}>
              {s.firstName}
            </Text>
          </Pressable>
        );
      })}
    </View>
  ) : null;

  if (!isDesktop) {
    return (
      <Screen>
        <Header title="Bitacora" subtitle="Historial de clases" />
        {StudentPicker}
        <View style={{ gap: spacing.md }}>
          {reportsHistory.map((r) => {
            const resourceCount =
              (r.materials?.length ?? 0) + (r.attachments?.length ?? 0);
            return (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/reports/${r.id}` as any)}
                style={({ pressed }) => [
                  styles.card,
                  pressed && { opacity: 0.95 },
                ]}
              >
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topic} numberOfLines={1}>{r.topic}</Text>
                    <Text style={styles.meta}>{r.teacher} · {r.date}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
                {r.screenshotUrl ? (
                  <Image
                    source={{ uri: r.screenshotUrl }}
                    style={styles.screenshot}
                    contentFit="cover"
                    transition={200}
                  />
                ) : null}
                <Text style={styles.summary} numberOfLines={2}>{r.progress}</Text>
                {(r.homework || resourceCount > 0) ? (
                  <View style={styles.chipsRow}>
                    {r.homework ? (
                      <View style={styles.chip}>
                        <Ionicons name="book-outline" size={11} color={colors.primaryDark} />
                        <Text style={styles.chipText}>Tarea</Text>
                      </View>
                    ) : null}
                    {resourceCount > 0 ? (
                      <View style={styles.chip}>
                        <Ionicons name="library-outline" size={11} color={colors.primaryDark} />
                        <Text style={styles.chipText}>Material</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Screen>
    );
  }

  // Desktop · master-detail sin pestanas
  const ListBlock = (
    <View style={styles.listPanel}>
      {reportsHistory.map((r) => {
        const active = r.id === selectedId;
        return (
          <Pressable
            key={r.id}
            onPress={() => setSelectedId(r.id)}
            style={({ pressed }) => [
              styles.listItem,
              active && styles.listItemActive,
              pressed && !active && { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.listItemTitle, active && { color: colors.primaryDark }]}
                numberOfLines={1}
              >
                {r.topic}
              </Text>
              <Text style={styles.listItemMeta} numberOfLines={1}>
                {r.teacher} · {r.date}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={active ? colors.primaryDark : colors.textMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );

  const DetailBlock = selectedReport ? (
    <ScrollView
      style={styles.detailPanel}
      contentContainerStyle={{ padding: spacing.lg }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.detailHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailTopic}>{selectedReport.topic}</Text>
          <Text style={styles.detailMeta}>
            {selectedReport.teacher} · {selectedReport.date}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push(`/reports/${selectedReport.id}` as any)}
          style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.openBtnText}>Abrir</Text>
          <Ionicons name="open-outline" size={13} color={colors.primaryDark} />
        </Pressable>
      </View>

      {selectedReport.screenshotUrl ? (
        <Image
          source={{ uri: selectedReport.screenshotUrl }}
          style={styles.detailScreenshot}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      <Text style={styles.detailSection}>Resumen</Text>
      <Text style={styles.detailBody}>{selectedReport.progress}</Text>

      {selectedReport.homework ? (
        <>
          <Text style={styles.detailSection}>Tarea</Text>
          <Text style={styles.detailBody}>{selectedReport.homework}</Text>
        </>
      ) : null}

      {((selectedReport.materials?.length ?? 0) +
        (selectedReport.attachments?.length ?? 0)) > 0 ? (
        <>
          <Text style={styles.detailSection}>Material de la clase</Text>
          <View style={{ gap: spacing.sm }}>
            {[
              ...(selectedReport.materials ?? []),
              ...(selectedReport.attachments ?? []),
            ].map((m, i) => (
              <View key={i} style={styles.materialRow}>
                <View style={styles.materialIcon}>
                  <Ionicons
                    name={(KIND_ICON[m.kind] ?? 'document-text') as any}
                    size={14}
                    color={colors.primaryDark}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.materialTitle} numberOfLines={1}>{m.title}</Text>
                  <Text style={styles.materialMeta}>
                    {m.kind}{m.size ? ` · ${m.size}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  ) : (
    <View style={styles.detailEmpty}>
      <Ionicons name="document-text-outline" size={28} color={colors.textMuted} />
      <Text style={typography.caption}>Selecciona una clase para ver la bitacora.</Text>
    </View>
  );

  return (
    <Screen>
      <Header title="Bitacora" subtitle="Historial de clases" />
      {StudentPicker}
      <WebTwoColumn
        leftFlex={4}
        rightFlex={8}
        align="stretch"
        left={ListBlock}
        right={DetailBlock}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  pickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pickerText: { fontWeight: '600', fontSize: 13, color: colors.textSubtle },

  // Tarjeta bitacora (mobile)
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadow.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topic: { fontSize: 17, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  meta: { color: colors.textSubtle, fontSize: 12, marginTop: 2, fontWeight: '500' },
  screenshot: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  summary: { color: colors.textSubtle, fontSize: 13, lineHeight: 19 },
  chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  chipText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },

  // Desktop master-detail
  listPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    maxHeight: 600,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: 'transparent',
  },
  listItemActive: { backgroundColor: colors.primarySoft },
  listItemTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  listItemMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  detailPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 600,
  },
  detailEmpty: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  detailTopic: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  detailMeta: { fontSize: 13, color: colors.textSubtle, marginTop: 4, fontWeight: '500' },
  detailScreenshot: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.md,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  openBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  detailSection: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  detailBody: {
    color: colors.textSubtle,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  materialIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  materialMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
