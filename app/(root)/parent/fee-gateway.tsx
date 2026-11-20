import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { 
  CreditCard, 
  Lock, 
  CheckCircle2,
  Gift,
  Download,
  FileText,
  Tag,
  AlertCircle,
  Layers,
  ArrowLeft
} from 'lucide-react-native';
import { useAuth } from '../../../src/hooks/useAuth';
import { useParentDashboard } from '../../../src/hooks/useParentDashboard';
import { useFeeWorkflow } from '../../../src/hooks/useFeeWorkflow';
import { supabase } from '../../../src/lib/supabase';
import { AlertModal } from '../../../src/components/common/AlertModal';
import { InvoiceModal } from '../../../src/components/fees/InvoiceModal';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function FeeGateway() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ studentId?: string }>();
  const { children, institution, totalPaid, pendingFees, paymentHistory, isLoading: isDashLoading } = useParentDashboard(user?.id, user?.email);
  const { completeStudentPayment } = useFeeWorkflow();
  
  const [localPayments, setLocalPayments] = useState<any[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [studentFees, setStudentFees] = useState<any[]>([]);
  const [selectedFeeIndex, setSelectedFeeIndex] = useState(0);
  const [isFeesLoading, setIsFeesLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [termMap, setTermMap] = useState<Map<string, string>>(new Map());
  
  const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' }>({
    visible: false, title: '', message: '', type: 'success'
  });
  
  const [invoice, setInvoice] = useState<{ visible: boolean; data: any | null }>({
    visible: false, data: null
  });

  // Pre-select child if studentId is passed in search params
  useEffect(() => {
    if (params.studentId && children.length > 0) {
      const idx = children.findIndex((c) => c.id === params.studentId);
      if (idx !== -1) {
        setSelectedChildIndex(idx);
      }
    }
  }, [params.studentId, children]);

  const selectedChild = children[selectedChildIndex];

  // Fetch academic terms for readable term names
  useEffect(() => {
    async function fetchTerms() {
      try {
        const { data } = await (supabase as any)
          .from('academic_terms')
          .select('id, term_name');
        const map = new Map<string, string>();
        (data || []).forEach((t: any) => map.set(t.id, t.term_name));
        setTermMap(map);
      } catch (e) {
        console.warn('Error fetching terms:', e);
      }
    }
    fetchTerms();
  }, []);

  // Fetch fees whenever selected child changes
  useEffect(() => {
    if (selectedChild) {
      fetchFees(selectedChild.id);
    }
  }, [selectedChild]);

  const fetchFees = async (studentId: string) => {
    setIsFeesLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('student_fees')
        .select(`
          *,
          fee_structures(id, name, category, term_id, description),
          concessions:fee_concessions(id, concession_type, amount, percentage, reason)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      const fees = data || [];
      setStudentFees(fees);

      // Default to the first pending or partial fee
      const unpaidIdx = fees.findIndex((f: any) => {
        const due = Number(f.amount_due || 0);
        const paid = Number(f.amount_paid || 0);
        const conc = Number(f.concession_amount || 0);
        const bal = f.balance !== undefined ? Number(f.balance) : Math.max(0, due - paid - conc);
        return bal > 0 && f.status !== 'paid';
      });

      setSelectedFeeIndex(unpaidIdx !== -1 ? unpaidIdx : 0);
    } catch (e) {
      console.error('Fetch fees error:', e);
    } finally {
      setIsFeesLoading(false);
    }
  };

  const feeData = studentFees[selectedFeeIndex] || null;

  // Active fee calculations
  const feeCalc = useMemo(() => {
    if (!feeData) {
      return { invoiced: 0, paid: 0, concession: 0, netPayable: 0, isCleared: true, termName: 'Fee' };
    }
    const invoiced = Number(feeData.amount_due || 0);
    const paid = Number(feeData.amount_paid || 0);
    const concession = Number(feeData.concession_amount || 0);
    const netPayable = feeData.balance !== undefined
      ? Number(feeData.balance)
      : Math.max(0, invoiced - paid - concession);

    const effectiveTermId = feeData.term_id || feeData.fee_structures?.term_id || null;
    const termName = effectiveTermId ? (termMap.get(effectiveTermId) || 'Term Fee') : 'Academic Year';

    return {
      invoiced,
      paid,
      concession,
      netPayable,
      isCleared: netPayable <= 0 || feeData.status === 'paid',
      termName,
    };
  }, [feeData, termMap]);

  const handlePay = async () => {
    if (!feeData || !selectedChild) return;
    setIsPaying(true);

    const currentFeeData = feeData;
    const currentChild = selectedChild;
    const txnId = `TXN-${Date.now()}`;
    const amountToPay = feeCalc.netPayable > 0 ? feeCalc.netPayable : feeCalc.invoiced;

    // Prepare components for invoice receipt
    let components = [
      {
        title: `${feeCalc.termName} — ${currentFeeData.fee_structures?.name || 'Tuition Fee'}`,
        amount: currentFeeData.amount_due
      }
    ];

    if (feeCalc.concession > 0) {
      components.push({
        title: `Concession Waiver (${currentFeeData.concessions?.[0]?.concession_type?.replace(/_/g, ' ') || 'Special Discount'})`,
        amount: -feeCalc.concession
      });
    }

    const receiptPayload = {
      amount: amountToPay,
      date: new Date().toISOString(),
      transaction_id: txnId,
      components,
      student: {
        name: currentChild.name,
        register_number: currentChild.register_number,
        class_name: currentChild.class_name,
        roll_no: currentChild.roll_no
      },
      institution: {
        name: institution?.name || 'Institution',
        logo_url: institution?.logo_url || null,
        address: (institution as any)?.address || ''
      }
    };

    try {
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('institution_id')
          .eq('id', user.id as string)
          .single() as any;
        
        const instId = profile?.institution_id;
        if (instId) {
          await completeStudentPayment(
            instId,
            currentChild.id,
            currentFeeData.fee_structure_id || currentFeeData.id,
            amountToPay,
            txnId
          );
        }
      }
    } catch (e: any) {
      console.warn('[FeeGateway] DB payment sync note:', e?.message || e);
    } finally {
      setIsPaying(false);

      // Update local fee state
      setStudentFees((prev) =>
        prev.map((f, i) =>
          i === selectedFeeIndex
            ? { ...f, status: 'paid', amount_paid: f.amount_paid + amountToPay, balance: 0 }
            : f
        )
      );

      // Add to local payment history
      setLocalPayments((prev) => [
        {
          id: txnId,
          student_id: currentChild.id,
          amount_paid: amountToPay,
          payment_date: new Date().toISOString(),
          transaction_id: txnId,
          status: 'paid',
          fee_structures: {
            name: `${feeCalc.termName} — ${currentFeeData.fee_structures?.name || 'Fee Payment'}`,
            description: JSON.stringify(components)
          }
        },
        ...prev
      ]);

      setAlert({
        visible: true,
        title: 'Payment Successful',
        message: `Receipt generated for ${currentChild.name} (₹${amountToPay.toLocaleString('en-IN')})`,
        type: 'success'
      });

      setInvoice({
        visible: true,
        data: receiptPayload
      });
    }
  };

  if (isDashLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Combined payment history combining live query and local newly recorded payments
  const combinedHistory = [
    ...localPayments,
    ...paymentHistory.filter(p => !localPayments.some(lp => lp.transaction_id === p.transaction_id || lp.id === p.id))
  ];

  const totalStudentPending = studentFees.reduce((acc, f) => {
    const bal = f.balance !== undefined
      ? Number(f.balance)
      : Math.max(0, Number(f.amount_due || 0) - Number(f.amount_paid || 0) - Number(f.concession_amount || 0));
    return acc + bal;
  }, 0);

  const currentDueDisplay = totalStudentPending > 0 ? totalStudentPending : (feeCalc.isCleared ? 0 : feeCalc.netPayable);
  const totalPaidDisplay = totalPaid + localPayments.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);

  return (
    <View style={styles.container}>
      <PageHeader
        title="Fee Payment Gateway"
        subtitle="Secure online fee payments and instant digital receipts"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Statistics Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <CreditCard size={20} color="#D97706" {...({} as any)} />
            </View>
            <View>
              <Text style={styles.statLabel}>Current Due</Text>
              <Text style={styles.statValue}>₹ {currentDueDisplay.toLocaleString('en-IN')}</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
              <CheckCircle2 size={20} color="#10B981" {...({} as any)} />
            </View>
            <View>
              <Text style={styles.statLabel}>Paid This Year</Text>
              <Text style={styles.statValue}>₹ {totalPaidDisplay.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* Security Banner */}
        <View style={styles.securityBanner}>
          <View style={styles.securityIconBox}>
            <Lock size={18} color="white" {...({} as any)} />
          </View>
          <View style={styles.securityMsg}>
            <Text style={styles.securityTitle}>Secure Institutional Payments</Text>
            <Text style={styles.securitySub}>All payments are authenticated and directly reconciled with your institution's ledger.</Text>
          </View>
        </View>

        {/* Child Selector */}
        <View style={styles.selectorSection}>
          <Text style={styles.sectionTitle}>Select Enrolled Child</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childScroller}>
            {children.map((child, index) => (
              <TouchableOpacity 
                key={child.id}
                style={[styles.childChip, selectedChildIndex === index && styles.activeChip]}
                onPress={() => setSelectedChildIndex(index)}
              >
                <Text style={[styles.chipText, selectedChildIndex === index && styles.activeChipText]}>
                  {child.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Multi-Fee Schedule Selector Chips */}
        {studentFees.length > 1 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8 }]}>Fee Terms & Schedules</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childScroller}>
              {studentFees.map((f, idx) => {
                const effectiveTermId = f.term_id || f.fee_structures?.term_id || null;
                const tName = effectiveTermId ? (termMap.get(effectiveTermId) || 'Term') : 'Academic';
                const bal = f.balance !== undefined ? Number(f.balance) : Math.max(0, Number(f.amount_due || 0) - Number(f.amount_paid || 0) - Number(f.concession_amount || 0));
                const isSelected = selectedFeeIndex === idx;

                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.feeTabChip, isSelected && styles.feeTabChipActive]}
                    onPress={() => setSelectedFeeIndex(idx)}
                  >
                    <Text style={[styles.feeTabText, isSelected && styles.feeTabTextActive]}>
                      {tName} • {f.fee_structures?.name || 'Fee'}
                    </Text>
                    <View style={[styles.chipBadge, bal <= 0 ? styles.chipBadgeCleared : styles.chipBadgePending]}>
                      <Text style={[styles.chipBadgeText, bal <= 0 ? styles.chipBadgeTextCleared : styles.chipBadgeTextPending]}>
                        {bal <= 0 ? 'CLEARED' : `₹${bal.toLocaleString('en-IN')}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Fee Status Card */}
        {isFeesLoading ? (
          <View style={styles.feeLoader}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : feeData ? (
          <View style={styles.feeStatusCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardName}>{selectedChild?.name}</Text>
                <Text style={styles.cardInfo}>
                  {feeCalc.termName} — {feeData.fee_structures?.name || 'Standard Tuition Fee'}
                </Text>
              </View>
              <View style={feeCalc.isCleared ? styles.paidBadge : styles.pendingBadge}>
                <Text style={feeCalc.isCleared ? styles.paidText : styles.pendingText}>
                  {feeCalc.isCleared ? 'Cleared' : feeCalc.paid > 0 ? 'Partial' : 'Pending'}
                </Text>
              </View>
            </View>

            {/* Financial Breakdown Grid */}
            <View style={styles.cardGrid}>
              <View>
                <Text style={styles.cardLabel}>Invoiced Due</Text>
                <Text style={styles.cardValue}>₹ {feeCalc.invoiced.toLocaleString('en-IN')}</Text>
              </View>

              {feeCalc.concession > 0 && (
                <View>
                  <Text style={styles.cardLabel}>Concession Waiver</Text>
                  <Text style={[styles.cardValue, { color: theme.colors.primary, fontWeight: '800' }]}>
                    -₹ {feeCalc.concession.toLocaleString('en-IN')}
                  </Text>
                </View>
              )}

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardLabel}>{feeCalc.isCleared ? 'Paid Date' : 'Due Date'}</Text>
                <Text style={styles.cardValue}>
                  {feeData.due_date
                    ? new Date(feeData.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Immediate'}
                </Text>
              </View>
            </View>

            {/* Concession Announcement Tag */}
            {feeCalc.concession > 0 && (
              <View style={styles.concessionNoticeRow}>
                <Tag size={13} color={theme.colors.primary} />
                <Text style={styles.concessionNoticeText}>
                  Scholarship / Discount Applied: ₹{feeCalc.concession.toLocaleString('en-IN')}
                  {feeData.concessions?.[0]?.concession_type
                    ? ` (${feeData.concessions[0].concession_type.replace(/_/g, ' ')})`
                    : ''}
                </Text>
              </View>
            )}

            {/* Net Amount to Pay Strip */}
            {!feeCalc.isCleared && (
              <View style={styles.netDueStrip}>
                <Text style={styles.netDueLabel}>Net Outstanding Payable</Text>
                <Text style={styles.netDueVal}>₹ {feeCalc.netPayable.toLocaleString('en-IN')}</Text>
              </View>
            )}

            {!feeCalc.isCleared ? (
              <TouchableOpacity 
                style={[styles.payBtn, isPaying && { opacity: 0.7 }]} 
                onPress={handlePay}
                disabled={isPaying}
              >
                {isPaying ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <CreditCard size={18} color="white" style={{ marginRight: 8 }} {...({} as any)} />
                    <Text style={styles.payBtnText}>
                      Pay Now • ₹{feeCalc.netPayable.toLocaleString('en-IN')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.receiptBtn} 
                onPress={() => {
                  let components = [{ title: feeData.fee_structures?.name || 'Tuition Fee', amount: feeCalc.invoiced }];
                  if (feeCalc.concession > 0) {
                    components.push({
                      title: 'Fee Concession Waiver',
                      amount: -feeCalc.concession
                    });
                  }

                  setInvoice({
                    visible: true,
                    data: {
                      amount: feeCalc.paid || feeCalc.invoiced,
                      date: feeData.last_payment_date || feeData.created_at,
                      transaction_id: `TXN-${Date.now()}`,
                      components,
                      student: {
                        name: selectedChild.name,
                        register_number: selectedChild.register_number,
                        class_name: selectedChild.class_name,
                        roll_no: selectedChild.roll_no
                      },
                      institution: {
                        name: institution?.name || 'Institution',
                        logo_url: institution?.logo_url || null,
                        address: (institution as any)?.address || ''
                      }
                    }
                  });
                }}
              >
                <FileText size={18} color="#924E00" style={{ marginRight: 8 }} {...({} as any)} />
                <Text style={styles.receiptText}>View Payment Receipt</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyFeesCard}>
            <AlertCircle size={28} color="#94A3B8" />
            <Text style={styles.emptyFeesTitle}>No Fee Schedules Assigned</Text>
            <Text style={styles.emptyFeesSub}>
              No active fee schedules have been configured for {selectedChild?.name || 'this student'} yet.
            </Text>
          </View>
        )}

        {/* Payment History Section */}
        {combinedHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Previous Payments</Text>
            {combinedHistory
              .filter(p => !selectedChild || p.student_id === selectedChild.id)
              .map((payment) => (
              <TouchableOpacity 
                key={payment.id || payment.transaction_id} 
                style={styles.historyCard}
                onPress={() => {
                  let components = [{ title: 'Fees', amount: payment.amount_paid }];
                  try {
                    if (payment.fee_structures?.description) {
                      const parsed = JSON.parse(payment.fee_structures.description);
                      if (Array.isArray(parsed)) components = parsed;
                    }
                  } catch (e) {}

                  setInvoice({
                    visible: true,
                    data: {
                      amount: payment.amount_paid,
                      date: payment.payment_date,
                      transaction_id: payment.transaction_id,
                      components,
                      student: {
                        name: selectedChild?.name || 'Student',
                        register_number: selectedChild?.register_number,
                        class_name: selectedChild?.class_name,
                        roll_no: selectedChild?.roll_no
                      },
                      institution: {
                        name: institution?.name || 'Institution',
                        logo_url: institution?.logo_url || null,
                        address: (institution as any)?.address || ''
                      }
                    }
                  });
                }}
              >
                <View style={styles.historyHeader}>
                  <Text style={styles.historyName}>{payment.fee_structures?.name || 'Fee Receipt'}</Text>
                  <Text style={styles.historyAmount}>₹{Number(payment.amount_paid || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.historyFooter}>
                  <Text style={styles.historyDate}>
                    {new Date(payment.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                  <View style={styles.viewReceiptLink}>
                    <Text style={styles.viewReceiptText}>View Receipt</Text>
                    <Download size={13} color={theme.colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Invoice Modal for Printable Receipt */}
      {invoice.visible && invoice.data && (
        <InvoiceModal
          visible={invoice.visible}
          institution={invoice.data.institution || { name: 'Institution', logo_url: null, address: '' }}
          student={invoice.data.student || { name: 'Student', register_number: 'N/A', class_name: '' }}
          payment={{
            amount: Number(invoice.data.amount || 0),
            date: invoice.data.date || new Date().toISOString(),
            transaction_id: invoice.data.transaction_id || `TXN-${Date.now()}`,
            components: invoice.data.components || [],
          }}
          onClose={() => setInvoice({ visible: false, data: null })}
        />
      )}

      <AlertModal 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  statIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: 'bold', textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginTop: 2 },
  securityBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  securityIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  securityMsg: { flex: 1 },
  securityTitle: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  securitySub: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  selectorSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12 },
  childScroller: { flexDirection: 'row' },
  childChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  activeChip: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text },
  activeChipText: { color: 'white' },
  feeTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'white',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  feeTabChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  feeTabText: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  feeTabTextActive: { color: theme.colors.primary },
  chipBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  chipBadgePending: { backgroundColor: '#FEF3C7' },
  chipBadgeCleared: { backgroundColor: '#DCFCE7' },
  chipBadgeText: { fontSize: 10, fontWeight: '800' },
  chipBadgeTextPending: { color: '#B45309' },
  chipBadgeTextCleared: { color: '#166534' },
  feeLoader: { padding: 32, alignItems: 'center' },
  feeStatusCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    marginBottom: 24,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardName: { fontSize: 17, fontWeight: 'bold', color: theme.colors.text },
  cardInfo: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  paidBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  paidText: { color: '#166534', fontWeight: 'bold', fontSize: 12 },
  pendingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pendingText: { color: '#B45309', fontWeight: 'bold', fontSize: 12 },
  cardGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 16 },
  cardLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: 'bold', textTransform: 'uppercase' },
  cardValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginTop: 4 },
  concessionNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  concessionNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  netDueStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  netDueLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'uppercase',
  },
  netDueVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#B45309',
  },
  payBtn: {
    backgroundColor: '#FAB75A',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FAB75A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  payBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  receiptBtn: {
    backgroundColor: '#FFF8EB',
    borderWidth: 1.5,
    borderColor: '#FAB75A',
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptText: { color: '#924E00', fontWeight: 'bold', fontSize: 14 },
  emptyFeesCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    marginBottom: 24,
    gap: 8,
  },
  emptyFeesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  emptyFeesSub: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
  historySection: { marginBottom: 32 },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  historyName: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  historyAmount: { fontSize: 15, fontWeight: 'bold', color: '#10B981' },
  historyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { fontSize: 12, color: theme.colors.textMuted },
  viewReceiptLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewReceiptText: { fontSize: 12, color: theme.colors.primary, fontWeight: 'bold' },
});
