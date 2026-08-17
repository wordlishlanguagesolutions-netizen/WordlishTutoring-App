import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { Screen, Header, Card, StatusBadge, NotificationBanner } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/constants/theme';
import {
  getSupportTickets,
  hydrateSupportTickets,
  isSupportTicketsHydrated,
  subscribeSupportTickets,
  resolveSupportTicket,
  reopenSupportTicket,
  type SupportTicketItem,
} from '@/services/supportTicketsService';

// ============================================================================
// Admin · Vista de tickets de soporte.
//
// Alimentada por public.support_tickets via supportTicketsService (cache +
// subscribe). No crea entidad nueva; reutiliza la tabla existente.
// Permite filtrar por estado y marcar resueltos/reabrir. Los tickets se
// generan automaticamente cuando cualquier usuario abre soporte via
// SupportRow (WhatsApp fire-and-forget insert).
// ============================================================================

type StatusFilter = 'all' | 'open' | 'resolved' | 'closed';

const STATUS_META: Record<
  string,
  { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'primary' }
> = {
  open: { label: 'Abierto', tone: 'warning' },
  in_progress: { label: 'En progreso', tone: 'info' },
  resolved: { label: 'Resuelto', tone: 'success' },
  closed: { label: 'Cerrado', tone: 'muted' },
};

const PRIORITY_META: Record<
  string,
  { label: string; tone: 'danger' | 'warning' | 'info' | 'muted' }
> = {
  urgent: { label: 'Urgente', tone: 'danger' },
  high: { label: 'Alta', tone: 'warning' },
  normal: { label: 'Normal', tone: 'info' },
  low: { label: 'Baja', tone: 'muted' },
};

const CHANNEL_ICON: Record<string, string> = {
  whatsapp: 'logo-whatsapp',
  email: 'mail-outline',
  in_app: 'chatbubble-outline',
  web_form: 'globe-outline',
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString('es-PA')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

export default function AdminSupportTickets() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [tickets, setTickets] = useState<SupportTicketItem[]>(() => getSupportTickets());
  const [loading, setLoading] = useState<boolean>(!isSupportTicketsHydrated());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    hydrateSupportTickets()
      .then(() => {
        if (!alive) return;
        setTickets(getSupportTickets());
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        console.warn('[support-tickets] hydrate error', err);
        setLoadError('No pudimos cargar los tickets. Verifica tu conexion y reintenta.');
        setLoading(false);
      });
    const unsub = subscribeSupportTickets(() => {
      if (alive) setTickets(getSupportTickets());
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const counts = useMemo(() => {
    const all = tickets.length;
    const open = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
    const resolved = tickets.filter((t) => t.status === 'resolved').length;
    const closed = tickets.filter((t) => t.status === 'closed').length;
    return { all, open, resolved, closed };
  }, [tickets]);

  const filtered = useMemo(() => {
    if (filter === 'all') return tickets;
    if (filter === 'open') {
      return tickets.filter(
        (t) => t.status === 'open' || t.status === 'in_progress',
      );
    }
    return tickets.filter((t) => t.status === filter);
  }, [tickets, filter]);

  const markBusy = (id: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleResolve = (ticket: SupportTicketItem) => {
    Alert.alert(
      'Marcar como resuelto',
      `Ticket "${ticket.subject}". Se ocultara de la vista de abiertos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resolver',
          style: 'default',
          onPress: async () => {
            markBusy(ticket.id, true);
            const res = await resolveSupportTicket(ticket.id);
            markBusy(ticket.id, false);
            if (!res.ok) {
              Alert.alert('No se pudo resolver', res.error ?? 'Intenta nuevamente.');
            }
          },
        },
      ],
    );
  };

  const handleReopen = (ticket: SupportTicketItem) => {
    Alert.alert(
      'Reabrir ticket',
      `Ticket "${ticket.subject}". Volvera a la lista de abiertos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reabrir',
          style: 'default',
          onPress: async () => {
            markBusy(ticket.id, true);
            const res = await reopenSupportTicket(ticket.id);
            markBusy(ticket.id, false);
            if (!res.ok) {
              Alert.alert('No se pudo reabrir', res.error ?? 'Intenta nuevamente.');
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Header title="Tickets de soporte" subtitle={`${counts.all} en total`} />

      {loadError ? (
        <NotificationBanner
          tone="danger"
          icon="alert-circle"
          title="Error al cargar tickets"
          message={loadError}
        />
      ) : null}

      <View style={styles.chipsRow}>
        <FilterChip
          label={`Todos (${counts.all})`}
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <FilterChip
          label={`Abiertos (${counts.open})`}
          active={filter === 'open'}
          onPress={() => setFilter('open')}
        />
        <FilterChip
          label={`Resueltos (${counts.resolved})`}
          active={filter === 'resolved'}
          onPress={() => setFilter('resolved')}
        />
        <FilterChip
          label={`Cerrados (${counts.closed})`}
          active={filter === 'closed'}
          onPress={() => setFilter('closed')}
        />
      </View>

      {loading ? (
        <Card>
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={typography.caption}>Cargando tickets...</Text>
          </View>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <View style={styles.emptyBox}>
            <Ionicons name="chatbubble-outline" size={24} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin tickets en este filtro</Text>
            <Text style={styles.emptyDesc}>
              Los tickets se registran automaticamente cuando un usuario abre
              soporte desde la app.
            </Text>
          </View>
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {filtered.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              busy={busyIds.has(t.id)}
              onResolve={() => handleResolve(t)}
              onReopen={() => handleReopen(t)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.chipText, active && { color: colors.textOnPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function TicketCard({
  ticket,
  busy,
  onResolve,
  onReopen,
}: {
  ticket: SupportTicketItem;
  busy: boolean;
  onResolve: () => void;
  onReopen: () => void;
}) {
  const statusMeta =
    STATUS_META[ticket.status] ?? { label: ticket.status, tone: 'muted' as const };
  const priorityMeta =
    PRIORITY_META[ticket.priority] ?? { label: ticket.priority, tone: 'muted' as const };
  const channelIcon = CHANNEL_ICON[ticket.channel] ?? 'chatbubble-outline';
  const isOpen = ticket.status === 'open' || ticket.status === 'in_progress';

  return (
    <Card>
      <View style={styles.rowTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={typography.bodyStrong} numberOfLines={2}>
            {ticket.subject}
          </Text>
          <Text style={[typography.caption, { marginTop: 2 }]} numberOfLines={1}>
            {ticket.category} · {formatDate(ticket.createdAt)}
          </Text>
        </View>
        <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Ionicons name={channelIcon as any} size={12} color={colors.textSubtle} />
          <Text style={styles.metaChipText}>{ticket.channel}</Text>
        </View>
        <StatusBadge label={priorityMeta.label} tone={priorityMeta.tone} />
        {ticket.refType ? (
          <View style={styles.metaChip}>
            <Ionicons name="link-outline" size={12} color={colors.textSubtle} />
            <Text style={styles.metaChipText}>{ticket.refType}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.descBox}>
        <Text style={styles.descText} numberOfLines={4}>
          {ticket.description}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Text style={styles.userMeta} numberOfLines={1}>
          Usuario: {ticket.userId.slice(0, 8)}…
        </Text>
        <View style={{ flex: 1 }} />
        {isOpen ? (
          <Pressable
            onPress={onResolve}
            disabled={busy}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionResolve,
              (pressed || busy) && { opacity: 0.85 },
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={14} color={colors.textOnPrimary} />
                <Text style={styles.actionText}>Marcar resuelto</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={onReopen}
            disabled={busy}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionReopen,
              (pressed || busy) && { opacity: 0.85 },
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={colors.primaryDark} />
            ) : (
              <>
                <Ionicons name="refresh" size={14} color={colors.primaryDark} />
                <Text style={[styles.actionText, { color: colors.primaryDark }]}>Reabrir</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '600', fontSize: 12, color: colors.textSubtle },

  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 17,
  },

  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSubtle,
    textTransform: 'lowercase',
  },
  descBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  descText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  userMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  actionResolve: { backgroundColor: colors.primary },
  actionReopen: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
