import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { ChildSwitcher } from '../../../src/components/parent/ChildSwitcher';
import { ReadOnlyBadge } from '../../../src/components/parent/ReadOnlyBadge';
import { Badge } from '../../../src/components/common/Badge';
import { Button } from '../../../src/components/common/Button';
import { LoadingState, EmptyState } from '../../../src/components/common/FeedbackStates';
import { useParentStudents } from '../../../src/hooks/useParentStudents';
import { supabase } from '../../../src/lib/supabase';
import { ArrowLeft, CreditCard, Receipt, AlertCircle, CheckCircle, IndianRupee } from 'lucide-react-native';

export default function ParentFeesScreen() {
  const router = useRouter();
  const { selectedChild, loading: childLoading } = useParentStudents();

  const [studentFees, setStudentFees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadFeeData() {
      if (!selectedChild?.student?.id) return;
      setLoading(true);

      try {
        // 1. Fetch student_fees records
        const { data: fees } = await (supabase as any)
          .from('student_fees')
          .select('*')
          .eq('student_id', selectedChild.student.id)
          .order('created_at', { ascending: false });

        setStudentFees(fees || []);

        // 2. Fetch fee payments
        const { data: payHistory } = await (supabase as any)
          .from('fee_payments')
          .select('*')
          .eq('student_id', selectedChild.student.id)
          .order('payment_date', { ascending: false });

        setPayments(payHistory || []);
      } catch (err) {
        console.warn('Error loading parent fees:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFeeData();
  }, [selectedChild]);

  if (childLoading) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Fees & Payments"
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
              <ArrowLeft size={20} color={theme.colors.text} />
            </TouchableOpacity>
          }
        />
        <LoadingState message="Loading fees data..." />
      </View>
    );
  }

  // Calculate totals across all active fees
  const totalDue = studentFees.reduce((sum, f) => sum + Number(f.amount_due || 0), 0);
  const totalPaid = studentFees.reduce((sum, f) => sum + Number(f.amount_paid || 0), 0);
  const totalConcession = studentFees.reduce((sum, f) => sum + Number(f.concession_amount || 0), 0);
  const balanceOutstanding = Math.max(0, totalDue - totalPaid - totalConcession);

  return (
    <View style={styles.container}>
      <PageHeader
        title="Fee Overview & Receipts"
        subtitle={`Fee ledger for ${selectedChild?.student.name || 'ward'}`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
        actions={<ReadOnlyBadge label="Single Source Ledger" />}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <ChildSwitcher />

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceSubtitle}>Total Outstanding Balance</Text>
              <Text style={styles.balanceAmount}>₹{balanceOutstanding.toLocaleString('en-IN')}</Text>
            </View>
            {balanceOutstanding > 0 && (
              <Button
                title="Pay Fees"
                icon={<CreditCard size={16} color="#FFFFFF" />}
                onPress={() => router.push('/(root)/parent/fee-gateway' as any)}
                size="md"
              />
            )}
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Due</Text>
              <Text style={styles.metricVal}>₹{totalDue.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Paid</Text>
              <Text style={[styles.metricVal, { color: theme.colors.accent || '#10B981' }]}>
                ₹{totalPaid.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Concession</Text>
              <Text style={styles.metricVal}>₹{totalConcession.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* Active Fee Breakdowns */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Fee Breakdown by Term</Text>
          {studentFees.length === 0 ? (
            <Text style={styles.emptyText}>No fee schedule assigned for this student.</Text>
          ) : (
            studentFees.map((fee) => {
              const feeDue = Number(fee.amount_due || 0);
              const feePaid = Number(fee.amount_paid || 0);
              const feeConcession = Number(fee.concession_amount || 0);
              const feeBalance = Math.max(0, feeDue - feePaid - feeConcession);

              return (
                <View key={fee.id} style={styles.feeItem}>
                  <View style={styles.feeItemHeader}>
                    <Text style={styles.feeItemTitle}>
                      {fee.description || fee.class_name || 'Academic Fee'}
                    </Text>
                    <Badge
                      variant={feeBalance <= 0 ? 'success' : feePaid > 0 ? 'warning' : 'destructive'}
                    >
                      {fee.status ? fee.status.toUpperCase() : feeBalance <= 0 ? 'PAID' : 'PENDING'}
                    </Badge>
                  </View>
                  <View style={styles.feeItemRow}>
                    <Text style={styles.feeItemMeta}>
                      Due Date: {fee.due_date ? new Date(fee.due_date).toLocaleDateString() : 'N/A'}
                    </Text>
                    <Text style={styles.feeItemBalance}>
                      Remaining: ₹{feeBalance.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Payment History */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment History & Receipts</Text>
          {payments.length === 0 ? (
            <Text style={styles.emptyText}>No payment transactions recorded yet.</Text>
          ) : (
            payments.map((p) => (
              <View key={p.id} style={styles.paymentRow}>
                <View style={styles.paymentLeft}>
                  <Receipt size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
                  <View>
                    <Text style={styles.paymentTxn}>
                      {p.receipt_number || p.payment_reference || `TXN-${p.id.substring(0, 8).toUpperCase()}`}
                    </Text>
                    <Text style={styles.paymentDate}>
                      {new Date(p.payment_date || p.created_at).toLocaleDateString()} • {p.payment_method?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.paymentAmount}>
                  ₹{Number(p.amount || p.amount_paid || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            ))
          )}
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
  content: {
    padding: 16,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 20,
    marginVertical: 14,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  balanceAmount: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
    paddingTop: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  metricVal: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.glassBorder,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  feeItem: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 14,
    marginBottom: 10,
  },
  feeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeItemTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  feeItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeItemMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  feeItemBalance: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentTxn: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  paymentDate: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  paymentAmount: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
});
