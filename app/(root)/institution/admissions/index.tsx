import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { DataTable, ColumnDef } from '../../../../src/components/common/DataTable';
import { Button } from '../../../../src/components/common/Button';
import { Badge } from '../../../../src/components/common/Badge';
import { LoadingState, EmptyState, ErrorState } from '../../../../src/components/common/FeedbackStates';
import { useAdmissions, AdmissionRecord } from '../../../../src/hooks/useAdmissions';
import { useRBAC } from '../../../../src/hooks/useRBAC';
import { Search, Eye, UserPlus, ArrowLeft } from 'lucide-react-native';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'draft', label: 'Draft' },
];

export default function AdmissionsListScreen() {
  const router = useRouter();
  const { can } = useRBAC();
  const { admissions, loading, error, fetchAdmissions } = useAdmissions();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const canCreate = can('admissions', 'create');

  const handleFilterChange = (status: string) => {
    setSelectedStatus(status);
    fetchAdmissions(status, searchQuery);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    fetchAdmissions(selectedStatus, text);
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'info' | 'destructive' | 'default' => {
    switch (status) {
      case 'enrolled':
        return 'success';
      case 'approved':
        return 'info';
      case 'under_review':
        return 'warning';
      case 'rejected':
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const columns: ColumnDef<AdmissionRecord>[] = useMemo(
    () => [
      {
        key: 'admission_number',
        title: 'App / Reg #',
        width: 130,
        sortable: true,
        render: (row) => (
          <Text style={styles.cellBold}>
            {row.admission_number || `ADM-${row.id.substring(0, 6).toUpperCase()}`}
          </Text>
        ),
      },
      {
        key: 'student_name',
        title: 'Student Name',
        sortable: true,
        render: (row) => (
          <View>
            <Text style={styles.cellTitle}>{row.student_name}</Text>
            {row.gender && (
              <Text style={styles.cellSubtitle}>
                {row.gender} {row.date_of_birth ? `• ${row.date_of_birth}` : ''}
              </Text>
            )}
          </View>
        ),
      },
      {
        key: 'applying_for_class',
        title: 'Class',
        width: 110,
        sortable: true,
        render: (row) => (
          <Text style={styles.cellText}>
            {row.applying_for_class || '—'}
            {row.applying_for_section ? ` (${row.applying_for_section})` : ''}
          </Text>
        ),
      },
      {
        key: 'guardian_name',
        title: 'Guardian & Contact',
        render: (row) => (
          <View>
            <Text style={styles.cellText}>{row.guardian_name || '—'}</Text>
            {row.guardian_phone && (
              <Text style={styles.cellSubtitle}>{row.guardian_phone}</Text>
            )}
          </View>
        ),
      },
      {
        key: 'status',
        title: 'Status',
        width: 130,
        sortable: true,
        render: (row) => (
          <Badge variant={getStatusVariant(row.status)}>
            {row.status.replace('_', ' ').toUpperCase()}
          </Badge>
        ),
      },
      {
        key: 'created_at',
        title: 'Applied On',
        width: 110,
        sortable: true,
        render: (row) => (
          <Text style={styles.cellMuted}>
            {new Date(row.created_at).toLocaleDateString()}
          </Text>
        ),
      },
      {
        key: 'actions',
        title: 'Action',
        width: 90,
        align: 'center',
        render: (row) => (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/(root)/institution/admissions/${row.id}` as any)}
          >
            <Eye size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        ),
      },
    ],
    [router]
  );

  return (
    <View style={styles.container}>
      <PageHeader
        title="Admissions Management"
        subtitle="Track, review, approve, and enroll student applicants"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
        actions={
          canCreate ? (
            <Button
              title="New Admission"
              icon={<UserPlus size={16} color="#FFFFFF" />}
              onPress={() => router.push('/(root)/institution/admissions/add' as any)}
              size="md"
            />
          ) : undefined
        }
      />

      <View style={styles.content}>
        {/* Search and Filters */}
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <Search size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by student, app #, or guardian phone..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
            {STATUS_FILTERS.map((chip) => {
              const isActive = selectedStatus === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[styles.chip, isActive && styles.activeChip]}
                  onPress={() => handleFilterChange(chip.key)}
                >
                  <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Content Body */}
        {loading && admissions.length === 0 ? (
          <LoadingState message="Loading admissions..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load Admissions"
            message={error}
            onRetry={() => fetchAdmissions(selectedStatus, searchQuery)}
          />
        ) : admissions.length === 0 ? (
          <EmptyState
            title="No Admissions Found"
            description={
              searchQuery || selectedStatus !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'Get started by creating your first student admission.'
            }
            actionTitle={canCreate ? 'Create Admission' : undefined}
            onAction={canCreate ? () => router.push('/(root)/institution/admissions/add' as any) : undefined}
          />
        ) : (
          <View style={styles.tableCard}>
            <DataTable
              data={admissions}
              columns={columns}
              keyExtractor={(item) => item.id}
              searchable={false}
              pageSize={10}
              onRowPress={(row) => router.push(`/(root)/institution/admissions/${row.id}` as any)}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  filterSection: {
    marginBottom: 16,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
  },
  chipsContainer: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    marginRight: 8,
  },
  activeChip: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  activeChipText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tableCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    overflow: 'hidden',
  },
  cellBold: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  cellTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  cellSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  cellText: {
    color: theme.colors.text,
    fontSize: 13,
  },
  cellMuted: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.primary + '15',
  },
});
