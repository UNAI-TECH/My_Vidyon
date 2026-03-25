import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { 
  CreditCard, 
  Lock, 
  CheckCircle2,
  Gift,
  Download,
  FileText
} from 'lucide-react-native';
import { useAuth } from '../../../src/hooks/useAuth';
import { useParentDashboard } from '../../../src/hooks/useParentDashboard';
import { useFeeWorkflow } from '../../../src/hooks/useFeeWorkflow';
import { supabase } from '../../../src/lib/supabase';
import { AlertModal } from '../../../src/components/common/AlertModal';
import { InvoiceModal } from '../../../src/components/fees/InvoiceModal';

export default function FeeGateway() {
  const { user } = useAuth();
  const { children, institution, totalPaid, pendingFees, paymentHistory, isLoading: isDashLoading } = useParentDashboard(user?.id);
  const { completeStudentPayment } = useFeeWorkflow();
  
  useEffect(() => {
    console.log('FeeGateway Render - Children:', children.length);
    console.log('FeeGateway Render - Payment History:', paymentHistory.length);
  }, [children, paymentHistory]);
  
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [feeData, setFeeData] = useState<any>(null);
  const [isFeesLoading, setIsFeesLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  
  const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' }>({
    visible: false, title: '', message: '', type: 'success'
  });
  
  const [invoice, setInvoice] = useState<{ visible: boolean; data: any | null }>({
    visible: false, data: null
  });

  const selectedChild = children[selectedChildIndex];

  useEffect(() => {
    if (selectedChild) {
      fetchFees(selectedChild.id);
    }
  }, [selectedChild]);

  const fetchFees = async (studentId: string) => {
    setIsFeesLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_fees')
        .select('*, fee_structures(*)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      setFeeData(data);
    } catch (e) {
      console.error('Fetch fees error:', e);
    } finally {
      setIsFeesLoading(false);
    }
  };

  const handlePay = async () => {
    if (!feeData || !selectedChild) return;
    setIsPaying(true);
    try {
      if (!user?.id) throw new Error("User session not found.");
      
      // Use institution_id (slug) from current profile context
      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id as string)
        .single() as any;
      
      const instId = profile?.institution_id;

      if (!instId) throw new Error("Institution context not found. Please log in again.");

      const success = await completeStudentPayment(
        instId,
        selectedChild.id,
        feeData.fee_structure_id,
        feeData.amount_due
      );

      if (success) {
        setAlert({
          visible: true,
          title: 'Payment Successful',
          message: `Receipt generated for ${selectedChild.name}`,
          type: 'success'
        });
        
        // Prepare data for immediate invoice popup
        let components = [{ title: 'Fees', amount: feeData.amount_due }];
        try {
          if (feeData.description) {
            const parsed = JSON.parse(feeData.description);
            if (Array.isArray(parsed)) components = parsed;
          } else if (feeData.fee_structures?.description) {
            const parsed = JSON.parse(feeData.fee_structures.description);
            if (Array.isArray(parsed)) components = parsed;
          }
        } catch (e) {}

        setInvoice({
          visible: true,
          data: {
            amount: feeData.amount_due,
            date: new Date().toISOString(),
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
              address: institution?.address || ''
            }
          }
        });
        setFeeData(null);
      }
    } catch (e: any) {
      console.error('Payment failed:', e);
      setAlert({
        visible: true,
        title: 'Payment Error',
        message: e.message || 'Something went wrong while processing your payment.',
        type: 'error'
      });
    } finally {
      setIsPaying(false);
    }
  };

  if (isDashLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Fees & Payments" subtitle="Track payment status and download receipts" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Statistics Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <CreditCard size={20} color="#D97706" {...({} as any)} />
            </View>
            <View>
              <Text style={styles.statLabel}>Total Due</Text>
              <Text style={styles.statValue}>₹ -{pendingFees.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
              <CheckCircle2 size={20} color="#10B981" {...({} as any)} />
            </View>
            <View>
              <Text style={styles.statLabel}>Paid This Year</Text>
              <Text style={styles.statValue}>₹ {totalPaid.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Security Banner */}
        <View style={styles.securityBanner}>
          <View style={styles.securityIconBox}>
            <Lock size={18} color="white" {...({} as any)} />
          </View>
          <View style={styles.securityMsg}>
            <Text style={styles.securityTitle}>Protect Your Family's Education</Text>
            <Text style={styles.securitySub}>Get comprehensive education insurance coverage for your children at exclusive partner rates.</Text>
          </View>
          <Text style={styles.securityTag}>FINANCIAL SECURITY</Text>
        </View>

        {/* Child Selector */}
        <View style={styles.selectorSection}>
          <Text style={styles.sectionTitle}>Fee Records</Text>
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

        {/* Fee Status Card */}
        {isFeesLoading ? (
          <View style={styles.feeLoader}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : feeData ? (
          <View style={styles.feeStatusCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardName}>{selectedChild?.name}</Text>
              <View style={feeData.status === 'paid' ? styles.paidBadge : styles.pendingBadge}>
                <Text style={feeData.status === 'paid' ? styles.paidText : styles.pendingText}>
                  {feeData.status === 'paid' ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>
            <Text style={styles.cardInfo}>{feeData.fee_structures?.name || 'Tuition Fee'}</Text>
            
            <View style={styles.cardGrid}>
              <View>
                <Text style={styles.cardLabel}>Amount</Text>
                <Text style={styles.cardValue}>₹ {(feeData.status === 'paid' ? feeData.amount_paid : feeData.amount_due).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardLabel}>{feeData.status === 'paid' ? 'Paid Date' : 'Due Date'}</Text>
                <Text style={styles.cardValue}>
                  {new Date(feeData.status === 'paid' ? (feeData.last_payment_date || feeData.created_at) : feeData.due_date).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {feeData.status !== 'paid' ? (
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
                    <Text style={styles.payBtnText}>Pay Now</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.receiptBtn} 
                onPress={() => {
                  let components = [{ title: 'Fees', amount: feeData.amount_paid }];
                  try {
                    if (feeData.description) {
                      const parsed = JSON.parse(feeData.description);
                      if (Array.isArray(parsed)) components = parsed;
                    } else if (feeData.fee_structures?.description) {
                      const parsed = JSON.parse(feeData.fee_structures.description);
                      if (Array.isArray(parsed)) components = parsed;
                    }
                  } catch (e) {}

                  setInvoice({
                    visible: true,
                    data: {
                      amount: feeData.amount_paid,
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
                        address: institution?.address || ''
                      }
                    }
                  });
                }}
              >
                <FileText size={18} color="#924E00" style={{ marginRight: 8 }} {...({} as any)} />
                <Text style={styles.receiptText}>Receipt</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Payment History Section */}
        {paymentHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Previous Payments</Text>
            {paymentHistory
              .filter(p => p.student_id === selectedChild?.id)
              .map((payment) => (
              <TouchableOpacity 
                key={payment.id} 
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
                        name: selectedChild.name,
                        register_number: selectedChild.register_number,
                        class_name: selectedChild.class_name,
                        roll_no: selectedChild.roll_no
                      },
                      institution: {
                        name: institution?.name || 'Institution',
                        logo_url: institution?.logo_url || null,
                        address: institution?.address || ''
                      }
                    }
                  });
                }}
              >
                <View style={styles.historyIconBox}>
                  <CheckCircle2 size={16} color="#10B981" {...({} as any)} />
                </View>
                <View style={styles.historyDetails}>
                  <Text style={styles.historyTitle}>{payment.fee_structures?.name || 'Fee Payment'}</Text>
                  <Text style={styles.historySub}>{new Date(payment.payment_date).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.historyValue}>₹ {payment.amount_paid.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <AlertModal 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />

      {invoice.data && (
        <InvoiceModal 
          visible={invoice.visible}
          onClose={() => setInvoice({ ...invoice, visible: false })}
          institution={invoice.data.institution}
          student={invoice.data.student}
          payment={invoice.data}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBEB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFBEB' },
  content: { padding: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  statIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginTop: 2 },
  
  securityBanner: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, flexDirection: 'row', gap: 16, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  securityIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  securityMsg: { flex: 1 },
  securityTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  securitySub: { fontSize: 11, color: '#64748B', marginTop: 4, lineHeight: 16 },
  securityTag: { fontSize: 9, fontWeight: 'bold', color: '#94A3B8', position: 'absolute', top: 12, right: 12 },

  selectorSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
  childScroller: { flexDirection: 'row' },
  childChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'white', marginRight: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  activeChip: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  chipText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  activeChipText: { color: 'white' },
  
  feeLoader: { padding: 40 },
  feeStatusCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, marginBottom: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  cardInfo: { fontSize: 13, color: '#64748B', marginBottom: 20 },
  cardGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  cardLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 4 },
  
  pendingBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pendingText: { fontSize: 11, fontWeight: 'bold', color: '#EF4444' },
  paidBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  paidText: { fontSize: 11, fontWeight: 'bold', color: '#10B981' },
  
  payBtn: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  payBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  
  receiptBtn: { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  receiptText: { color: '#924E00', fontWeight: 'bold', fontSize: 15 },

  historySection: { marginBottom: 40 },
  historyCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  historyIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  historyDetails: { flex: 1 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  historySub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  historyValue: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' }
});
