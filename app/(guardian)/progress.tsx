import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { Screen, Header, Card, Avatar, KnowCard, WebTwoColumn } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius } from '@/constants/theme';
import { POLICY_COPY } from '@/constants/policies';
import {
  linkedStudents,
  reportsHistory,
  getAllReportMaterials,
} from '@/services/mockData';

type Tab = 'reports' | 'materials';

const KIND_ICON: Record<string, string> = {
  PDF: 'document-text',
  Video: 'videocam',
  Link: 'link',
  MP3: 'musical-notes',
  Audio: 'musical-notes',
  DOC: 'document',
};

// ============================================================================
// Reportes acudiente · Fase 3 master-detail en desktop.
// ============================================================================

export default function GuardianProgress() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [activeId, setActiveId] = useState<string>(linkedStudents[0].id);
  const [tab, setTab] = useState<Tab>('reports');
  const [selectedId, setSelectedId] = useState<string>(
    () => reportsHistory[0]?.id ?? '',
  );
  const materials = useMemo(() => getAllReportMaterials(), []);
  const selectedReport = useMemo(
    () => reportsHistory.find((r) => r.id === selectedId) ?? reportsHistory[0],
    [selectedId],
  );

  const HeaderControls = (
    <>
      <KnowCard rules={POLICY_COPY.reports} style={{ marginBottom: spacing.lg }} />
      <View style={styles.pickerRow}>
        {linkedStudents.map((s) => {
          const isActive = s.id === activeId;
          return (
            <Pressable
              key={s.id}
              onPress={() => setActiveId(s.id)}
              style={[styles.pickerChip, isActive && styles.pickerChipActive]}
            >
              <Avatar name={s.name} uri={s.avatar} size={24} />
              <Text style={[styles.pickerText, isActive && { color: colors.textOnPrimary }]}>
                {s.firstName}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.tabsRow}>
        <TabChip label="Reportes" active={tab === 'reports'} onPress={() => setTab('reports')} />
        <TabChip label="Materiales" active={tab === 'materials'} onPress={() => setTab('materials')} />
      </View>
    </>
  );

  if (!isDesktop) {
    return (
      <Screen>
        <Header title="Reportes" subtitle="De tus estudiantes" />
        {HeaderControls}
        {tab === 'reports' ? (
          <View style={{ gap: spacing.md }}>
            {reportsHistory.map((r) => {
              const materialCount =
                (r.materials?.length ?? 0) + (r.attachments?.length ?? 0);
              return (
                <Card key={r.id}>
                  <View style={styles.rowBetween}>
                    <Text style={typography.h3}>{r.topic}</Text>
                    <Text style={typography.caption}>{r.date}</Text>
                  </View>
                  <Text style={typography.caption}>{r.teacher}</Text>
                  <Text style={styles.reportProgress} numberOfLines={2}>{r.progress}</Text>
                  {materialCount > 0 ? (
                    <View style={styles.materialHint}>
                      <Ionicons name="library-outline" size={12} color={colors.primaryDark} />
                      <Text style={styles.materialHintText}>
                        Incluye {materialCount} archivo{materialCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() => router.push(`/reports/${r.id}` as any)}
                    style={({ pressed }) => [styles.viewReportBtn, pressed && { opacity: 0.9 }]}
                  >
                    <Text style={styles.viewReportText}>Ver reporte completo</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
                  </Pressable>
                </Card>
              );
            })}
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {materials.length === 0 ? (
              <Card>
                <Text style={typography.caption}>Aún no hay materiales publicados por los profesores.</Text>
              </Card>
            ) : (
              materials.map((m, i) => (
                <Pressable
                  key={`${m.reportId}-${i}`}
                  onPress={() => router.push(`/reports/${m.reportId}` as any)}
                >
                  <Card>
                    <View style={styles.materialRow}>
                      <View style={styles.iconWrap}>
                        <Ionicons name={(KIND_ICON[m.kind] ?? 'document-text') as any} size={20} color={colors.primaryDark} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={typography.bodyStrong}>{m.title}</Text>
                        <Text style={typography.caption}>{m.reportTopic} · {m.reportDate}</Text>
                        <Text style={styles.materialMeta}>
                          {m.kind}{m.size ? ` · ${m.size}` : ''} · {m.reportTeacher}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                  </Card>
                </Pressable>
              ))
            )}
          </View>
        )}
      </Screen>
    );
  }

  // Desktop master-detail
  const ListBlock = (
    <View style={styles.listPanel}>
      {tab === 'reports' ? (
        reportsHistory.map((r) => {
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
              <Ionicons name="chevron-forward" size={14} color={active ? colors.primaryDark : colors.textMuted} />
            </Pressable>
          );
        })
      ) : (
        materials.map((m, i) => (
          <Pressable
            key={`${m.reportId}-${i}`}
            onPress={() => setSelectedId(m.reportId)}
            style={({ pressed }) => [
              styles.listItem,
              pressed && { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <View style={styles.iconWrapSm}>
              <Ionicons name={(KIND_ICON[m.kind] ?? 'document-text') as any} size={14} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.listItemTitle} numberOfLines={1}>{m.title}</Text>
              <Text style={styles.listItemMeta} numberOfLines={1}>{m.reportTopic} · {m.reportDate}</Text>
            </View>
          </Pressable>
        ))
      )}
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
          <Text style={styles.detailMeta}>{selectedReport.teacher} · {selectedReport.date}</Text>
        </View>
        <Pressable
          onPress={() => router.push(`/reports/${selectedReport.id}` as any)}
          style={({ pressed }) => [styles.openFullBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.openFullText}>Abrir</Text>
          <Ionicons name="open-outline" size={13} color={colors.primaryDark} />
        </Pressable>
      </View>
      <Text style={styles.detailSection}>Progreso</Text>
      <Text style={styles.detailProgress}>{selectedReport.progress}</Text>
      {selectedReport.homework ? (
        <>
          <Text style={styles.detailSection}>Tarea</Text>
          <Text style={styles.detailProgress}>{selectedReport.homework}</Text>
        </>
      ) : null}
      {(selectedReport.materials?.length ?? 0) > 0 ? (
        <>
          <Text style={styles.detailSection}>Material de repaso</Text>
          <View style={{ gap: spacing.sm }}>
            {(selectedReport.materials ?? []).map((m, i) => (
              <View key={i} style={styles.materialRowSmall}>
                <View style={styles.iconWrapSm}>
                  <Ionicons name={(KIND_ICON[m.kind] ?? 'document-text') as any} size={14} color={colors.primaryDark} />
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
      <Text style={typography.caption}>Selecciona un reporte para verlo aquí.</Text>
    </View>
  );

  return (
    <Screen>
      <Header title="Reportes" subtitle="De tus estudiantes" />
      {HeaderControls}
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

function TabChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pickerRow: {
    flexDirection: 'row', gap: spacing.sm,
    marginBottom: spacing.lg, flexWrap: 'wrap',
  },
  pickerChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  pickerChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pickerText: { fontWeight: '600', fontSize: 13, color: colors.textSubtle },

  tabsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '600', fontSize: 13, color: colors.textSubtle },
  chipTextActive: { color: colors.textOnPrimary },

  rowBetween: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
  },
  reportProgress: {
    color: colors.textSubtle, fontSize: 13,
    marginTop: spacing.sm, marginBottom: spacing.md, lineHeight: 18,
  },
  materialHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.pill, marginBottom: spacing.md,
  },
  materialHintText: { color: colors.primaryDark, fontWeight: '700', fontSize: 11 },
  viewReportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primarySoft,
    paddingVertical: 12, borderRadius: radius.md,
  },
  viewReportText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },

  materialRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  materialRowSmall: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm,
  },
  materialTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  materialMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapSm: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },

  listPanel: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    maxHeight: 600,
  },
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    backgroundColor: 'transparent',
  },
  listItemActive: { backgroundColor: colors.primarySoft },
  listItemTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  listItemMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  detailPanel: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, maxHeight: 600,
  },
  detailEmpty: {
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  detailHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: spacing.md, marginBottom: spacing.lg,
  },
  detailTopic: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  detailMeta: { fontSize: 13, color: colors.textSubtle, marginTop: 4, fontWeight: '500' },
  openFullBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill, backgroundColor: colors.primarySoft,
  },
  openFullText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  detailSection: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.4,
    marginTop: spacing.md, marginBottom: 6,
  },
  detailProgress: {
    color: colors.textSubtle, fontSize: 14, lineHeight: 21,
    marginBottom: spacing.md,
  },
});
