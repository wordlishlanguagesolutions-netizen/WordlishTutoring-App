import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@/components/ui/Icon';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, shadow } from '@/constants/theme';
import { reportsHistory, ReportFile } from '@/services/mockData';

// Reporte completo = expediente único de la clase.
// Muestra comentarios, tarea y una única sección "Material de repaso"
// donde se consolida todo el contenido de la clase sin distinguir tipo
// (PDF, video, enlace, audio, imagen, documento, etc.). El material NO
// se duplica en otras pantallas.

const KIND_ICON: Record<string, string> = {
  PDF: 'document-text',
  Video: 'videocam',
  Link: 'link',
  MP3: 'musical-notes',
  Audio: 'musical-notes',
  DOC: 'document',
};

function iconFor(kind: string): string {
  return KIND_ICON[kind] ?? 'document-text';
}

function FileRow({ file }: { file: ReportFile }) {
  const isLink = file.kind === 'Link';
  return (
    <View style={s.fileRow}>
      <View style={s.fileIcon}>
        <Ionicons
          name={iconFor(file.kind) as any}
          size={16}
          color={colors.primaryDark}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.fileTitle}>{file.title}</Text>
        <Text style={s.fileMeta}>
          {file.kind}
          {file.size ? ` · ${file.size}` : ''}
        </Text>
      </View>
      <Ionicons
        name={isLink ? 'open-outline' : 'download-outline'}
        size={18}
        color={colors.primary}
      />
    </View>
  );
}

export default function ReportDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = params.id;
  const id =
    typeof rawId === 'string'
      ? rawId
      : Array.isArray(rawId)
      ? rawId[0]
      : '';
  const report = reportsHistory.find((r) => r.id === id);
  const [zoomOpen, setZoomOpen] = useState<boolean>(false);

  if (!report) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={['top']}
      >
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={s.iconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={typography.h2}>Reporte</Text>
          </View>
        </View>
        <View style={{ padding: spacing.lg }}>
          <View style={s.emptyBox}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.textMuted}
            />
            <Text style={s.emptyText}>Reporte no encontrado.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Consolidamos material de repaso + archivos adjuntos en una sola lista.
  // El estudiante ve un único lugar con todo el contenido de la clase,
  // sin importar el formato del recurso.
  const allResources: ReportFile[] = [
    ...(report.materials ?? []),
    ...(report.attachments ?? []),
  ];
  const hasResources = allResources.length > 0;
  const isEmpty = !hasResources;

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
          <Text style={typography.caption}>Reporte de clase</Text>
          <Text style={typography.h2}>{report.topic}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
      >
        <View style={s.meta}>
          <View style={s.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.textMuted}
            />
            <Text style={s.metaText}>{report.date}</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons
              name="person-outline"
              size={14}
              color={colors.textMuted}
            />
            <Text style={s.metaText}>{report.teacher}</Text>
          </View>
        </View>

        {/* Evidencia de la clase · screenshot capturado por el profesor.
            Visible para estudiante, acudiente, profesor, supervisor y admin. */}
        {report.screenshotUrl ? (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardIcon}>
                <Ionicons
                  name="camera"
                  size={16}
                  color={colors.primaryDark}
                />
              </View>
              <Text style={s.cardTitle}>Evidencia de la clase</Text>
            </View>
            <Pressable
              onPress={() => setZoomOpen(true)}
              style={({ pressed }) => [
                s.screenshotWrap,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Image
                source={{ uri: report.screenshotUrl }}
                style={s.screenshotImg}
                contentFit="cover"
                transition={200}
              />
              <View style={s.screenshotOverlay}>
                <Ionicons
                  name="expand-outline"
                  size={14}
                  color={colors.textOnPrimary}
                />
                <Text style={s.screenshotOverlayText}>Ampliar</Text>
              </View>
            </Pressable>
            {report.screenshotCapturedAt ? (
              <Text style={s.screenshotMeta}>
                Capturada el {report.screenshotCapturedAt}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Comentarios del profesor */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIcon}>
              <Ionicons
                name="chatbubble-ellipses"
                size={16}
                color={colors.primaryDark}
              />
            </View>
            <Text style={s.cardTitle}>Comentarios del profesor</Text>
          </View>
          <Text style={s.cardBody}>{report.progress}</Text>
        </View>

        {/* Tarea */}
        {report.homework ? (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardIcon}>
                <Ionicons
                  name="book-outline"
                  size={16}
                  color={colors.primaryDark}
                />
              </View>
              <Text style={s.cardTitle}>Tarea</Text>
            </View>
            <Text style={s.cardBody}>{report.homework}</Text>
          </View>
        ) : null}

        {/* Material de repaso · sección única que agrupa todos los
            recursos de la clase (PDF, video, enlace, audio, imagen,
            documento, etc.) sin separarlos por formato. */}
        {hasResources ? (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardIcon}>
                <Ionicons name="library" size={16} color={colors.primaryDark} />
              </View>
              <Text style={s.cardTitle}>Material de repaso</Text>
            </View>
            <View style={{ gap: spacing.sm }}>
              {allResources.map((r, i) => (
                <FileRow key={`r-${i}`} file={r} />
              ))}
            </View>
          </View>
        ) : null}

        {isEmpty ? (
          <View style={s.emptyBox}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={s.emptyText}>
              Este reporte no incluye material adicional.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Modal para ampliar el screenshot */}
      <Modal
        visible={zoomOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomOpen(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setZoomOpen(false)}>
          <Pressable
            onPress={() => setZoomOpen(false)}
            style={s.modalClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={colors.textOnPrimary} />
          </Pressable>
          {report.screenshotUrl ? (
            <Image
              source={{ uri: report.screenshotUrl }}
              style={s.modalImage}
              contentFit="contain"
              transition={150}
            />
          ) : null}
        </Pressable>
      </Modal>
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
  meta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: '600',
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...typography.h3, fontSize: 16, flex: 1 },
  cardBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  fileMeta: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 2,
  },

  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  screenshotWrap: {
    position: 'relative',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  screenshotImg: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  screenshotOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  screenshotOverlayText: {
    color: colors.textOnPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  screenshotMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
});
