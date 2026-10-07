import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Button } from '../../../../src/components/common/Button';
import { Badge } from '../../../../src/components/common/Badge';
import { DataTable, ColumnDef } from '../../../../src/components/common/DataTable';
import { usePromotions, PromotionRequest } from '../../../../src/hooks/usePromotions';
import {
  CalendarRange,
  Plus,
  Sliders,
  History,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';

export default function PromotionsListScreen() {
  const router = useRouter();
  const { requests, loading } = usePromotions();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter requests
  const filtered = requests.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const pendingTotal = requests.reduce((sum, r) => sum + (r.pending_count || 0), 0);
  const approvedTotal = requests.reduce((sum, r) => sum + (r.approved_count || 0), 0);

  const columns: ColumnDef<PromotionRequest>[] = [
    {
      key: 'batch',
      title: 'Batch / Target',
      sortable: true,
      render: (item) => (
        <View>
          <Text style={styles.reqTitle}>
            {item.request_type === 'institution'
              ? 'Institution-wide Promotion'
              : item.request_type === 'class'
              ? `Class ${item.class_name || ''} ${item.section ? `(${item.section})` : ''}`
              : 'Individual Student Batch'}
          </Text>
          <Text style={styles.reqSub}>
            {item.from_year} ➔ {item.to_year}
          </Text>
        </View>
      ),
    },
    {
      key: 'type',
      title: 'Scope',
      render: (item) => (
        <Badge variant={item.request_type === 'institution' ? 'info' : 'default'}>
          {item.request_type.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'items',
      title: 'Students',
      sortable: true,
      align: 'center',
      render: (item) => (
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.countText}>{item.items_count || 0}</Text>
          <Text style={styles.countSub}>
            {item.approved_count || 0} approved • {item.pending_count || 0} pending
          </Text>
        </View>
      ),
    },
    {
      key: 'date',
      title: 'Requested',
      render: (item) => (
        <Text style={styles.dateText}>
          {new Date(item.requested_at).toLocaleDateString()}
        </Text>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      align: 'center',
      render: (item) => {
        let variant: 'success' | 'warning' | 'info' | 'destructive' | 'default' = 'default';
        if (item.status === 'applied') variant = 'success';
        else if (item.status === 'approved' || item.status === 'partially_applied') variant = 'info';
        else if (item.status === 'pending') variant = 'warning';
        else if (item.status === 'rejected') variant = 'destructive';

        return <Badge variant={variant}>{item.status.toUpperCase()}</Badge>;
      },
    },
    {
      key: 'actions',
      title: 'Action',
      align: 'center',
      render: (item) => (
        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() => router.push(`/(root)/institution/promotions/${item.id}` as any)}
        >
          <Text style={styles.reviewBtnText}>Review</Text>
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title="Student Promotions"
        subtitle="Annual grade progression workflows, eligibility screening, and promotion history"
        actions={
          <View style={styles.headerActions}>
            <Button
              title="Rules"
              variant="outline"
              size="sm"
              icon={<Sliders size={14} color={theme.colors.text} />}
              onPress={() => router.push('/(root)/institution/promotions/rules' as any)}
            />
            <Button
              title="History"
              variant="outline"
              size="sm"
              icon={<History size={14} color={theme.colors.text} />}
              onPress={() => router.push('/(root)/institution/promotions/history' as any)}
            />
            <Button
              title="New Batch"
              size="sm"
              icon={<Plus size={15} color="#FFFFFF" />}
              onPress={() => router.push('/(root)/institution/promotions/create' as any)}
            />
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Metric Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Promotion Requests</Text>
            <Text style={styles.statVal}>{requests.length}</Text>
            <Text style={styles.statSub}>Total batches created</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#F59E0B', borderLeftWidth: 4 }]}>
            <Text style={styles.statLabel}>Pending Review</Text>
            <Text style={[styles.statVal, { color: '#F59E0B' }]}>{pendingTotal}</Text>
            <Text style={styles.statSub}>Students awaiting decision</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: theme.colors.accent || '#10B981', borderLeftWidth: 4 }]}>
            <Text style={styles.statLabel}>Approved</Text>
            <Text style={[styles.statVal, { color: theme.colors.accent || '#10B981' }]}>
              {approvedTotal}
            </Text>
            <Text style={styles.statSub}>Ready to execute</Text>
          </View>
        </View>

        {/* Requests Table */}
        <View style={styles.tableCard}>
          <DataTable
            columns={columns}
            data={filtered}
            keyExtractor={(item) => item.id}
            searchable
            searchPlaceholder="Search requests..."
            searchKeys={['class_name', 'from_year', 'to_year', 'request_type']}
            filters={[
              { id: 'all', label: 'All Statuses' },
              { id: 'pending', label: 'Pending' },
              { id: 'approved', label: 'Approved' },
              { id: 'applied', label: 'Applied' },
            ]}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
            loading={loading}
            emptyTitle="No Promotion Requests"
            emptyDescription="Create a promotion request to transition students from one academic year to the next."
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    padding: 16,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statVal: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  reqTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  reqSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  countText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  countSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  dateText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  reviewBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.s,
  },
  reviewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
