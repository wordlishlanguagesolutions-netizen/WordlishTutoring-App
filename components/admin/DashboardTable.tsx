import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@/components/ui/Icon';
import { colors, spacing, radius } from '@/constants/theme';

// ============================================================================
// DashboardTable · tabla compacta con ordenamiento, búsqueda y filtros.
// Estilo Stripe/Linear: filas finas, mucho espacio en blanco, tipografía
// discreta, hover suave en desktop.
// ============================================================================

export interface Column<T> {
  key: keyof T | string;
  label: string;
  flex?: number;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  hideBelow?: number; // px ancho, oculta columna en desktop más angosto
}

export interface FilterOption {
  key: string;
  label: string;
  predicate: (row: any) => boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: Array<keyof T | string>;
  filters?: FilterOption[];
  emptyText?: string;
  maxRows?: number;   // limita filas visibles (rendimiento visual)
  onRowPress?: (row: T) => void;
  externalQuery?: string; // filtro adicional inyectado desde TopBar
}

export function DashboardTable<T extends Record<string, any>>({
  columns,
  rows,
  keyExtractor,
  searchable = true,
  searchPlaceholder = 'Buscar',
  searchFields,
  filters,
  emptyText = 'Sin datos',
  maxRows = 200,
  onRowPress,
  externalQuery = '',
}: Props<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const combinedQuery = (externalQuery || query).trim().toLowerCase();

  const filtered = useMemo(() => {
    let out = rows;
    if (combinedQuery.length > 0) {
      const fields = searchFields ?? columns.map((c) => c.key);
      out = out.filter((r) =>
        fields.some((f) => {
          const v = r[f as keyof T];
          return v !== undefined && v !== null && String(v).toLowerCase().includes(combinedQuery);
        }),
      );
    }
    if (activeFilter && filters) {
      const f = filters.find((x) => x.key === activeFilter);
      if (f) out = out.filter(f.predicate);
    }
    if (sortKey) {
      const col = columns.find((c) => String(c.key) === sortKey);
      out = [...out].sort((a, b) => {
        const va = col?.sortValue ? col.sortValue(a) : a[sortKey as keyof T];
        const vb = col?.sortValue ? col.sortValue(b) : b[sortKey as keyof T];
        if (va === vb) return 0;
        if (va === undefined || va === null) return 1;
        if (vb === undefined || vb === null) return -1;
        const cmp = va < vb ? -1 : 1;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return out.slice(0, maxRows);
  }, [rows, combinedQuery, sortKey, sortDir, activeFilter, filters, columns, searchFields, maxRows]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <View style={styles.wrap}>
      {(searchable || (filters && filters.length > 0)) && (
        <View style={styles.controls}>
          {searchable && (
            <View style={styles.search}>
              <Ionicons name="search" size={13} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={13} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          )}
          {filters && filters.length > 0 && (
            <View style={styles.filters}>
              <FilterChip
                label="Todos"
                active={activeFilter === null}
                onPress={() => setActiveFilter(null)}
              />
              {filters.map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  active={activeFilter === f.key}
                  onPress={() => setActiveFilter(f.key)}
                />
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.tableWrap}>
        {/* Header */}
        <View style={styles.head}>
          {columns.map((c) => {
            const key = String(c.key);
            const active = sortKey === key;
            return (
              <Pressable
                key={key}
                onPress={() => toggleSort(key)}
                style={[
                  styles.headCell,
                  {
                    flex: c.flex ?? 1,
                    justifyContent:
                      c.align === 'right' ? 'flex-end' : c.align === 'center' ? 'center' : 'flex-start',
                  },
                ]}
              >
                <Text
                  style={[styles.headText, active && { color: colors.primaryDark }]}
                  numberOfLines={1}
                >
                  {c.label}
                </Text>
                <Ionicons
                  name={active ? (sortDir === 'asc' ? 'chevron-up' : 'chevron-down') : 'swap-vertical'}
                  size={10}
                  color={active ? colors.primaryDark : colors.textMuted}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Body */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        ) : (
          filtered.map((row) => (
            <Pressable
              key={keyExtractor(row)}
              onPress={() => onRowPress?.(row)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
            >
              {columns.map((c) => {
                const key = String(c.key);
                const value = c.render ? c.render(row) : (row[c.key as keyof T] as any);
                return (
                  <View
                    key={key}
                    style={[
                      styles.cell,
                      {
                        flex: c.flex ?? 1,
                        alignItems:
                          c.align === 'right' ? 'flex-end' : c.align === 'center' ? 'center' : 'flex-start',
                      },
                    ]}
                  >
                    {typeof value === 'string' || typeof value === 'number' ? (
                      <Text
                        style={[
                          styles.cellText,
                          c.align === 'right' && { textAlign: 'right' },
                        ]}
                        numberOfLines={1}
                      >
                        {value}
                      </Text>
                    ) : (
                      value
                    )}
                  </View>
                );
              })}
            </Pressable>
          ))
        )}
      </View>
    </View>
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
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          active && { color: colors.textOnPrimary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 160,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    padding: 0,
  },
  filters: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSubtle,
  },
  tableWrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  headText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cell: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  cellText: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  empty: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
