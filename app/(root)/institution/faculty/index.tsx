import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { DataTable, ColumnDef } from '../../../../src/components/common/DataTable';
import { Button } from '../../../../src/components/common/Button';
import { Badge } from '../../../../src/components/common/Badge';
import { Select } from '../../../../src/components/common/Select';
import { LoadingState, EmptyState, ErrorState } from '../../../../src/components/common/FeedbackStates';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useRBAC } from '../../../../src/hooks/useRBAC';
import { supabase } from '../../../../src/lib/supabase';
import { useFacultyLeaveBalance } from '../../../../src/hooks/useFacultyLeaveBalance';
import {
  UserPlus,
  Search,
  CalendarCheck,
  ArrowLeft,
} from 'lucide-react-native';

const STATUS_FILTERS = [
  { key: 'all', label: 'All Faculty' },
  { key: 'active', label: 'Active' },
  { key: 'on_leave', label: 'On Leave' },
  { key: 'inactive', label: 'Inactive' },
];

export default function InstitutionFaculty() {
  const router = useRouter();
  const { institutionId } = useAuth();
  const { can } = useRBAC();
  const { updateFacultyStatus } = useFacultyLeaveBalance();

  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<{ label: string; value: string }[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = can('faculty', 'manage') || can('faculty', 'create');

  // Load departments
  useEffect(() => {
    async function loadDepartments() {
      if (!institutionId) return;
      try {
        const { data } = await (supabase as any)
          .from('departments')
          .select('id, name')
          .eq('institution_id', institutionId);

        if (data) {
          const opts = [
            { label: 'All Departments', value: 'all' },
            ...data.map((d: any) => ({ label: d.name, value: d.name })),
          ];
          setDepartments(opts);
        }
      } catch (err) {
        console.warn('Failed to load departments', err);
      }
    }
    loadDepartments();
  }, [institutionId]);

  // Load faculty members
  const fetchFaculty = useCallback(async () => {
    if (!institutionId) return;
    try {
      setLoading(true);
      setError(null);

      let query = (supabase as any)
        .from('profiles')
        .select('*')
        .eq('role', 'faculty')
        .eq('institution_id', institutionId)
        .order('full_name', { ascending: true });

      if (selectedStatus !== 'all') {
        query = query.eq('faculty_status', selectedStatus);
      }

      if (selectedDept !== 'all') {
        query = query.eq('department', selectedDept);
      }

      if (searchQuery.trim()) {
        const q = `%${searchQuery.trim()}%`;
        query = query.or(`full_name.ilike.${q},email.ilike.${q},phone.ilike.${q}`);
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      setFacultyList(data || []);
    } catch (err: any) {
      console.warn('Error fetching faculty:', err);
      setError(err.message || 'Failed to load faculty records');
    } finally {
      setLoading(false);
    }
  }, [institutionId, selectedStatus, selectedDept, searchQuery]);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  const handleToggleStatus = (faculty: any) => {
    const nextStatus =
      faculty.faculty_status === 'active'
        ? 'on_leave'
        : faculty.faculty_status === 'on_leave'
        ? 'inactive'
        : 'active';

    Alert.alert(
      'Change Faculty Status',
      `Change ${faculty.full_name}'s status to "${nextStatus.replace('_', ' ')}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await updateFacultyStatus(faculty.id, nextStatus as any);
              fetchFaculty();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update faculty status');
            }
          },
        },
      ]
    );
  };

  const getStatusVariant = (status?: string): 'success' | 'warning' | 'destructive' | 'default' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'on_leave':
        return 'warning';
      case 'inactive':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        key: 'full_name',
        title: 'Faculty Name',
        sortable: true,
        render: (row) => (
          <View>
            <Text style={styles.cellTitle}>{row.full_name || 'Unnamed Faculty'}</Text>
            {row.email && <Text style={styles.cellSub}>{row.email}</Text>}
          </View>
        ),
      },
      {
        key: 'department',
        title: 'Department',
        width: 140,
        sortable: true,
        render: (row) => (
          <Text style={styles.cellText}>{row.department || 'General'}</Text>
        ),
      },
      {
        key: 'phone',
        title: 'Phone',
        width: 130,
        render: (row) => (
          <Text style={styles.cellText}>{row.phone || '—'}</Text>
        ),
      },
      {
        key: 'faculty_status',
        title: 'Status',
        width: 130,
        sortable: true,
        render: (row) => (
          <TouchableOpacity onPress={() => canManage && handleToggleStatus(row)}>
            <Badge variant={getStatusVariant(row.faculty_status)}>
              {(row.faculty_status || 'active').replace('_', ' ').toUpperCase()}
            </Badge>
          </TouchableOpacity>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        width: 130,
        align: 'center',
        render: (row) => (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionPill}
              onPress={() => router.push('/(root)/institution/faculty/assign' as any)}
            >
              <Text style={styles.actionPillText}>Assign</Text>
            </TouchableOpacity>
          </View>
        ),
      },
    ],
    [canManage, router]
  );

  return (
    <View style={styles.container}>
      <PageHeader
        title="Faculty Management"
        subtitle="Manage teaching staff, assignments, and leave balances"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
        actions={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="Leave Policies"
              variant="outline"
              icon={<CalendarCheck size={16} color={theme.colors.text} />}
              onPress={() => router.push('/(root)/institution/faculty/leave-config' as any)}
              size="md"
            />
            {canManage && (
              <Button
                title="Add Faculty"
                icon={<UserPlus size={16} color="#FFFFFF" />}
                onPress={() => router.push('/(root)/institution/faculty/assign' as any)}
                size="md"
              />
            )}
          </View>
        }
      />

      <View style={styles.content}>
        {/* Search & Filters */}
        <View style={styles.filterSection}>
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Search size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search faculty by name, email, or phone..."
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={(v) => {
                  setSearchQuery(v);
                  fetchFaculty();
                }}
              />
            </View>

            {departments.length > 0 && (
              <View style={styles.deptSelectWrap}>
                <Select
                  options={departments}
                  value={selectedDept}
                  onSelect={(v) => {
                    setSelectedDept(v);
                  }}
                  placeholder="Department"
                />
              </View>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
            {STATUS_FILTERS.map((f) => {
              const isActive = selectedStatus === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.chip, isActive && styles.activeChip]}
                  onPress={() => setSelectedStatus(f.key)}
                >
                  <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Faculty Table / Content */}
        {loading && facultyList.length === 0 ? (
          <LoadingState message="Loading faculty directory..." />
        ) : error ? (
          <ErrorState
            title="Failed to Load Faculty"
            message={error}
            onRetry={fetchFaculty}
          />
        ) : facultyList.length === 0 ? (
          <EmptyState
            title="No Faculty Members Found"
            description={
              searchQuery || selectedStatus !== 'all' || selectedDept !== 'all'
                ? 'Try adjusting your filters or search keywords.'
                : 'No faculty profiles currently registered in this institution.'
            }
          />
        ) : (
          <View style={styles.tableCard}>
            <DataTable
              data={facultyList}
              columns={columns}
              keyExtractor={(item) => item.id}
              pageSize={12}
              searchable={false}
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
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
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
  deptSelectWrap: {
    width: 200,
  },
  chipsRow: {
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
  cellTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  cellSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  cellText: {
    color: theme.colors.text,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.primary + '15',
  },
  actionPillText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
