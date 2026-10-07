import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Button } from '../../../../src/components/common/Button';
import { Badge } from '../../../../src/components/common/Badge';
import { DataTable, ColumnDef } from '../../../../src/components/common/DataTable';
import { LoadingState } from '../../../../src/components/common/FeedbackStates';
import { useFeeManagement, StudentFeeLedgerItem } from '../../../../src/hooks/useFeeManagement';
import {
  Calendar,
  Layers,
  UserPlus,
  CreditCard,
  Gift,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';

export default function FeeManagementDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { terms, ledgers, loading, fetchLedgers } = useFeeManagement();

  const [selectedTermId, setSelectedTermId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filtered ledgers
  const filteredData = useMemo(() => {
    return ledgers.filter((item) => {
      const matchTerm = selectedTermId === 'all' || item.term_id === selectedTermId;
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchTerm && matchStatus;
    });
  }, [ledgers, selectedTermId, statusFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    let due = 0;
    let paid = 0;
    let concessions = 0;

    filteredData.forEach((item) => {
      due += Number(item.amount_due || 0);
      paid += Number(item.amount_paid || 0);
      concessions += Number(item.concession_amount || 0);
    });

    const outstanding = Math.max(0, due - paid - concessions);
    return { due, paid, concessions, outstanding };
  }, [filteredData]);

  // Columns for DataTable
  const columns: ColumnDef<StudentFeeLedgerItem>[] = [
    {
      key: 'student',
      title: 'Student',
      sortable: true,
      render: (item) => (
        <View>
          <Text style={styles.studentName}>{item.student?.name || 'Unknown'}</Text>
          <Text style={styles.studentSub}>
            Roll: {item.student?.roll_number || 'N/A'} • {item.class_name || item.student?.class || '-'}
          </Text>
        </View>
      ),
    },
    {
      key: 'amount_due',
      title: 'Due (₹)',
      sortable: true,
      align: 'right',
      render: (item) => (
        <Text style={styles.amountText}>₹{Number(item.amount_due || 0).toLocaleString('en-IN')}</Text>
      ),
    },
    {
      key: 'amount_paid',
      title: 'Paid (₹)',
      sortable: true,
      align: 'right',
      render: (item) => (
        <Text style={[styles.amountText, { color: theme.colors.accent || '#10B981' }]}>
          ₹{Number(item.amount_paid || 0).toLocaleString('en-IN')}
        </Text>
      ),
    },
    {
      key: 'concession',
      title: 'Concession',
      sortable: true,
      align: 'right',
      render: (item) => (
        <Text style={styles.subAmountText}>
          {item.concession_amount ? `₹${Number(item.concession_amount).toLocaleString('en-IN')}` : '-'}
        </Text>
      ),
    },
    {
      key: 'balance',
      title: 'Outstanding (₹)',
      sortable: true,
      align: 'right',
      render: (item) => {
        const bal = item.balance ?? Math.max(0, Number(item.amount_due || 0) - Number(item.amount_paid || 0) - Number(item.concession_amount || 0));
        return (
          <Text style={[styles.amountText, { color: bal > 0 ? '#EF4444' : theme.colors.textMuted, fontWeight: '700' }]}>
            ₹{bal.toLocaleString('en-IN')}
          </Text>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      align: 'center',
      render: (item) => {
        const bal = item.balance ?? Math.max(0, Number(item.amount_due || 0) - Number(item.amount_paid || 0) - Number(item.concession_amount || 0));
        const variant = bal <= 0 ? 'success' : Number(item.amount_paid || 0) > 0 ? 'warning' : 'destructive';
        const label = bal <= 0 ? 'PAID' : Number(item.amount_paid || 0) > 0 ? 'PARTIAL' : 'PENDING';
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      key: 'actions',
      title: 'Action',
      align: 'center',
      render: (item) => {
        const bal = item.balance ?? Math.max(0, Number(item.amount_due || 0) - Number(item.amount_paid || 0) - Number(item.concession_amount || 0));
        if (bal <= 0) return <Text style={{ color: theme.colors.accent, fontSize: 12 }}>Cleared</Text>;
        return (
          <TouchableOpacity
            style={styles.collectBtn}
            onPress={() => router.push({ pathname: '/(root)/institution/fees/collection' as any, params: { studentFeeId: item.id } })}
          >
            <Text style={styles.collectBtnText}>Collect</Text>
          </TouchableOpacity>
        );
      },
    },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title="Fee Management"
        subtitle="Term-wise fee configuration, assignment, and collections ledger"
        actions={
          <View style={styles.headerActions}>
            <Button
              title="Record Payment"
              size="sm"
              icon={<CreditCard size={15} color="#FFFFFF" />}
              onPress={() => router.push('/(root)/institution/fees/collection' as any)}
            />
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation Quick Links */}
        <View style={styles.quickNavRow}>
          <TouchableOpacity
            style={styles.quickNavCard}
            onPress={() => router.push('/(root)/institution/fees/terms' as any)}
          >
            <Calendar size={18} color={theme.colors.primary} />
            <Text style={styles.quickNavTitle}>Academic Terms</Text>
            <ArrowRight size={14} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickNavCard}
            onPress={() => router.push('/(root)/institution/fees/structures' as any)}
          >
            <Layers size={18} color={theme.colors.primary} />
            <Text style={styles.quickNavTitle}>Fee Structures</Text>
            <ArrowRight size={14} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickNavCard}
            onPress={() => router.push('/(root)/institution/fees/assign' as any)}
          >
            <UserPlus size={18} color={theme.colors.primary} />
            <Text style={styles.quickNavTitle}>Assign to Class</Text>
            <ArrowRight size={14} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickNavCard}
            onPress={() => router.push('/(root)/institution/fees/concessions' as any)}
          >
            <Gift size={18} color={theme.colors.primary} />
            <Text style={styles.quickNavTitle}>Concessions</Text>
            <ArrowRight size={14} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Stats Summary Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Invoiced</Text>
            <Text style={styles.statVal}>₹{stats.due.toLocaleString('en-IN')}</Text>
            <Text style={styles.statSub}>Total fee demand</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: theme.colors.accent || '#10B981', borderLeftWidth: 4 }]}>
            <Text style={styles.statLabel}>Total Collected</Text>
            <Text style={[styles.statVal, { color: theme.colors.accent || '#10B981' }]}>
              ₹{stats.paid.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statSub}>Realized revenue</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Concessions</Text>
            <Text style={styles.statVal}>₹{stats.concessions.toLocaleString('en-IN')}</Text>
            <Text style={styles.statSub}>Discounts & waivers</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: '#EF4444', borderLeftWidth: 4 }]}>
            <Text style={styles.statLabel}>Outstanding Balance</Text>
            <Text style={[styles.statVal, { color: '#EF4444' }]}>
              ₹{stats.outstanding.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statSub}>Pending collections</Text>
          </View>
        </View>

        {/* Term Tabs */}
        <View style={styles.termTabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.termTabsList}>
            <TouchableOpacity
              style={[styles.termChip, selectedTermId === 'all' && styles.termChipActive]}
              onPress={() => setSelectedTermId('all')}
            >
              <Text style={[styles.termChipText, selectedTermId === 'all' && styles.termChipTextActive]}>
                All Terms ({ledgers.length})
              </Text>
            </TouchableOpacity>

            {terms.map((t) => {
              const count = ledgers.filter((l) => l.term_id === t.id).length;
              const isSelected = selectedTermId === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.termChip, isSelected && styles.termChipActive]}
                  onPress={() => setSelectedTermId(t.id)}
                >
                  <Text style={[styles.termChipText, isSelected && styles.termChipTextActive]}>
                    {t.term_name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Data Table */}
        <View style={styles.tableCard}>
          <DataTable
            columns={columns}
            data={filteredData}
            keyExtractor={(item) => item.id}
            searchable
            searchPlaceholder="Search student by name, roll, class..."
            searchKeys={['student.name', 'student.roll_number', 'class_name']}
            filters={[
              { id: 'all', label: 'All Statuses' },
              { id: 'pending', label: 'Pending' },
              { id: 'partial', label: 'Partial' },
              { id: 'paid', label: 'Paid' },
            ]}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
            pageSize={10}
            loading={loading}
            emptyTitle="No Student Fees Found"
            emptyDescription="No fee schedules have been assigned to students for the selected term or criteria."
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
  scrollContent: {
    padding: 16,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  quickNavRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  quickNavCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickNavTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 200,
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
  termTabsContainer: {
    marginBottom: 14,
  },
  termTabsList: {
    flexDirection: 'row',
    gap: 8,
  },
  termChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.s,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  termChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  termChipText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  termChipTextActive: {
    color: '#FFFFFF',
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
  studentName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  studentSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  amountText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  subAmountText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  collectBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.s,
  },
  collectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
