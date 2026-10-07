// ============================================================
// File: src/components/common/DataTable.tsx
// Purpose: Generic, accessible DataTable with sorting, filtering,
// search, pagination, and integrated loading/empty states.
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react-native';
import { LoadingState, EmptyState } from './FeedbackStates';

export interface ColumnDef<T> {
  key: string;
  title: string;
  sortable?: boolean;
  width?: number | `${number}%`;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface FilterChip {
  id: string;
  label: string;
  count?: number;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T | string)[];
  filters?: FilterChip[];
  activeFilter?: string;
  onFilterChange?: (filterId: string) => void;
  pageSize?: number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowPress?: (item: T) => void;
  style?: ViewStyle;
  headerActions?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchKeys,
  filters,
  activeFilter,
  onFilterChange,
  pageSize = 10,
  loading = false,
  emptyTitle,
  emptyDescription,
  onRowPress,
  style,
  headerActions,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Search Filter
  const searchedData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase().trim();

    return data.filter(item => {
      if (searchKeys && searchKeys.length > 0) {
        return searchKeys.some(k => {
          const val = item[k as string];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(query);
        });
      }
      // Default: search all string / number fields
      return Object.values(item).some(val =>
        val !== undefined && val !== null && String(val).toLowerCase().includes(query)
      );
    });
  }, [data, searchQuery, searchKeys]);

  // 2. Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return searchedData;

    return [...searchedData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortOrder === 'asc'
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
  }, [searchedData, sortKey, sortOrder]);

  // 3. Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (columnKey: string) => {
    if (sortKey === columnKey) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortKey(null); // Reset sorting
      }
    } else {
      setSortKey(columnKey);
      setSortOrder('asc');
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Top Search & Actions Bar */}
      <View style={styles.topBar}>
        {searchable && (
          <View style={styles.searchBox}>
            <Search size={16} color="#94A3B8" {...({} as any)} />
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={q => {
                setSearchQuery(q);
                setCurrentPage(1);
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={15} color="#94A3B8" {...({} as any)} />
              </TouchableOpacity>
            )}
          </View>
        )}
        {headerActions && <View style={styles.headerActions}>{headerActions}</View>}
      </View>

      {/* Filter Chips Bar */}
      {filters && filters.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScrollView}
          contentContainerStyle={styles.filtersRow}
        >
          {filters.map(filter => {
            const isActive = activeFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => {
                  onFilterChange?.(filter.id);
                  setCurrentPage(1);
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                  {filter.count !== undefined && ` (${filter.count})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Main Table / Content */}
      {loading ? (
        <LoadingState message="Loading records..." />
      ) : paginatedData.length === 0 ? (
        <EmptyState
          title={emptyTitle || 'No records found'}
          description={
            emptyDescription ||
            (searchQuery ? `No records matched "${searchQuery}"` : 'No data available.')
          }
        />
      ) : (
        <View style={styles.tableCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {/* Header Row */}
              <View style={styles.headerRow}>
                {columns.map(col => {
                  const isSorted = sortKey === col.key;
                  return (
                    <TouchableOpacity
                      key={col.key}
                      style={[
                        styles.headerCell,
                        col.width ? { width: col.width as any } : { flex: 1, minWidth: 120 },
                        col.align === 'center' && { alignItems: 'center' },
                        col.align === 'right' && { alignItems: 'flex-end' },
                      ]}
                      disabled={!col.sortable}
                      onPress={() => col.sortable && handleSort(col.key)}
                      activeOpacity={col.sortable ? 0.7 : 1}
                    >
                      <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>{col.title}</Text>
                        {col.sortable && (
                          <View style={styles.sortIconBox}>
                            {isSorted ? (
                              sortOrder === 'asc' ? (
                                <ChevronUp size={14} color={theme.colors.primary} {...({} as any)} />
                              ) : (
                                <ChevronDown size={14} color={theme.colors.primary} {...({} as any)} />
                              )
                            ) : (
                              <ArrowUpDown size={12} color="#94A3B8" {...({} as any)} />
                            )}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Data Rows */}
              {paginatedData.map((item, index) => {
                const key = keyExtractor(item, index);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.dataRow,
                      index % 2 === 1 && styles.dataRowAlt,
                      index === paginatedData.length - 1 && { borderBottomWidth: 0 },
                    ]}
                    disabled={!onRowPress}
                    onPress={() => onRowPress?.(item)}
                    activeOpacity={onRowPress ? 0.7 : 1}
                  >
                    {columns.map(col => (
                      <View
                        key={col.key}
                        style={[
                          styles.dataCell,
                          col.width ? { width: col.width as any } : { flex: 1, minWidth: 120 },
                          col.align === 'center' && { alignItems: 'center' },
                          col.align === 'right' && { alignItems: 'flex-end' },
                        ]}
                      >
                        {col.render ? (
                          col.render(item, index)
                        ) : (
                          <Text style={styles.cellText} numberOfLines={1}>
                            {String(item[col.key] ?? '-')}
                          </Text>
                        )}
                      </View>
                    ))}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Pagination Controls */}
          <View style={styles.paginationBar}>
            <Text style={styles.paginationInfo}>
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
            </Text>

            <View style={styles.paginationButtons}>
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  currentPage === 1 && styles.pageBtnDisabled,
                ]}
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} color={currentPage === 1 ? '#CBD5E1' : '#1E293B'} {...({} as any)} />
                <Text
                  style={[
                    styles.pageBtnText,
                    currentPage === 1 && styles.pageBtnTextDisabled,
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              <View style={styles.pageNumberBadge}>
                <Text style={styles.pageNumberText}>
                  {currentPage} / {totalPages}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  currentPage === totalPages && styles.pageBtnDisabled,
                ]}
                disabled={currentPage === totalPages}
                onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                <Text
                  style={[
                    styles.pageBtnText,
                    currentPage === totalPages && styles.pageBtnTextDisabled,
                  ]}
                >
                  Next
                </Text>
                <ChevronRight size={16} color={currentPage === totalPages ? '#CBD5E1' : '#1E293B'} {...({} as any)} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    paddingVertical: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filtersScrollView: {
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#92400E',
    fontWeight: '700',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerCell: {
    paddingRight: 12,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortIconBox: {
    marginLeft: 2,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dataRowAlt: {
    backgroundColor: '#FAFCFF',
  },
  dataCell: {
    paddingRight: 12,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  paginationInfo: {
    fontSize: 12,
    color: '#64748B',
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  pageBtnTextDisabled: {
    color: '#94A3B8',
  },
  pageNumberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  pageNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
});
