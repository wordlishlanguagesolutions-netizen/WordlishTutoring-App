import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import { Screen, Header, WebTwoColumn } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { reportsHistory } from '@/services/mockData';

// Fase 1 simplificacion: la pestana "Materiales" se elimina porque el
// material siempre viaja dentro de su reporte. El acceso a cada archivo
// se mantiene abriendo el reporte correspondiente.

const KIND_ICON: Record<string, string> = {
  PDF: 'document-text',
  Video: 'videocam',
  Link: 'link',
  MP3: 'musical-notes',
  Audio: 'musical-notes',
  DOC: 'document',
};

// ============================================================================
// Reportes · Fase 3.
// Desktop: master-detail. Lista compacta a la izquierda, preview a la
// derecha con contenido completo. Sin abrir pantalla nueva.
// Móvil/tablet: tarjetas apiladas originales.
// ============================================================================

export default function StudentProgress() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const filteredReports = useMemo(() => {
    if (!q) return reportsHistory;
    return reportsHistory.filter((r) =>
      [r.topic, r.teacher, r.progress, r.homework ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [q]);

  const [selectedId, setSelectedId] = useState<string>(
    () => reportsHistory[0]?.id ?? '',
  );
  const selectedReport = useMemo(
    () => reportsHistory.find((r) => r.id === selectedId) ?? reportsHistory[0],
    [selectedId],
  );

  const SearchBar = (
    <View style={[styles.searchBox, { marginBottom: spacing.lg }]}>
      <Ionicons name="search" size={16} color={colors.textMuted} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por materia, tema o profesor"
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
        returnKeyType="search"
      />
      {query.length > 0 ? (
        <Pressable onPress={() => setQuery('')} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );

  // ==================== Móvil: layout original ====================
  if (!isDesktop) {
    return (
      <Screen>
        <Header title="Reportes" subtitle="Cada reporte incluye su material de repaso" />
        {SearchBar}

        <View style={{ gap: spacing.md }}>
          {filteredReports.length === 0 ? (
            <EmptyRow text="No encontramos reportes con esa búsqueda." />
          ) : (
            filteredReports.map((r) => {
              const materialCount =
                (r.materials?.length ?? 0) + (r.attachments?.length ?? 0);
              return (
                <View key={r.id} style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportTopic} numberOfLines={1}>{r.topic}</Text>
                    <Text style={styles.reportDate}>{r.date}</Text>
                  </View>
                  <Text style={styles.reportTeacher} numberOfLines={1}>{r.teacher}</Text>
                  <Text style={styles.reportProgress} numberOfLines={2}>{r.progress}</Text>
                  <View style={styles.reportFooter}>
                    {materialCount > 0 ? (
                      <View style={styles.materialHint}>
                        <Ionicons name="library-outline" size={12} color={colors.primaryDark} />
                        <Text style={styles.materialHintText}>{materialCount} materiales</Text>
                      </View>
                    ) : <View />}
                    <Pressable
                      onPress={() => router.push(`/reports/${r.id}` as any)}
                      style={({ pressed }) => [styles.readBtn, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={styles.readBtnText}>Leer reporte</Text>
                      <Ionicons name="chevron-forward" size={13} color={colors.primaryDark} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </Screen>
    );
  }

  // ==================== Desktop: master-detail ====================
  const ListBlock = (
    <View style={styles.listPanel}>
      {filteredReports.length === 0 ? (
        <EmptyRow text="No encontramos reportes con esa búsqueda." />
      ) : (
        <View>
          {filteredReports.map((r) => {
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
          <Text style={styles.detailMeta}>
            {selectedReport.teacher} · {selectedReport.date}
          </Text>
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
              <View key={i} style={styles.materialRow}>
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
      <Header title="Reportes" subtitle="Cada reporte incluye su material de repaso" />
      {SearchBar}
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

function EmptyRow({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={typography.caption}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
  tabsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    flex: 1, paddingVertical: 10, paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '700', fontSize: 13, color: colors.textSubtle },
  chipTextActive: { color: colors.textOnPrimary },

  // Móvil card
  reportCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    ...shadow.sm,
  },
  reportHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', marginBottom: 2,
  },
  reportTopic: {
    fontSize: 15, fontWeight: '700', color: colors.text,
    flex: 1, marginRight: spacing.sm,
  },
  reportDate: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  reportTeacher: { fontSize: 12, color: colors.textMuted, fontWeight: '500', marginBottom: spacing.sm },
  reportProgress: { color: colors.textSubtle, fontSize: 13, lineHeight: 19 },
  reportFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: spacing.md,
  },
  materialHint: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill, backgroundColor: colors.primarySoft,
  },
  materialHintText: { color: colors.primaryDark, fontWeight: '700', fontSize: 11 },
  readBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill,
  },
  readBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  materialCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  materialTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  materialMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapSm: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  empty: {
    padding: spacing.xl, alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },

  // Desktop master-detail
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
    borderWidth: 1, borderColor: colors.border,
    maxHeight: 600,
  },
  detailEmpty: {
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  detailHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    marginBottom: spacing.lg,
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
  materialRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: spacing.sm,
  },
});
