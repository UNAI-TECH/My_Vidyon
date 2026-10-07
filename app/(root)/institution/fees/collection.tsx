import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Button } from '../../../../src/components/common/Button';
import { Select } from '../../../../src/components/common/Select';
import { FormField } from '../../../../src/components/common/FormField';
import { Badge } from '../../../../src/components/common/Badge';
import { useFeeManagement, StudentFeeLedgerItem } from '../../../../src/hooks/useFeeManagement';
import { ArrowLeft, CreditCard, Receipt, CheckCircle, ShieldCheck } from 'lucide-react-native';

export default function FeeCollectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ studentFeeId?: string }>();
  const { ledgers, recordPayment } = useFeeManagement();

  const [selectedFeeId, setSelectedFeeId] = useState(params.studentFeeId || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'netbanking' | 'cheque' | 'dd' | 'online' | 'other'>('upi');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptResult, setReceiptResult] = useState<{ receiptNo: string; amount: number } | null>(null);

  // Find selected fee record
  const selectedRecord = ledgers.find((l) => l.id === selectedFeeId) || ledgers[0];

  useEffect(() => {
    if (params.studentFeeId) {
      setSelectedFeeId(params.studentFeeId);
    } else if (ledgers.length > 0 && !selectedFeeId) {
      setSelectedFeeId(ledgers[0].id);
    }
  }, [params.studentFeeId, ledgers]);

  useEffect(() => {
    if (selectedRecord) {
      const remaining = selectedRecord.balance ?? Math.max(0, Number(selectedRecord.amount_due || 0) - Number(selectedRecord.amount_paid || 0) - Number(selectedRecord.concession_amount || 0));
      setAmount(String(remaining));
    }
  }, [selectedRecord]);

  const handleProcessPayment = async () => {
    if (!selectedRecord) {
      Alert.alert('Validation Error', 'Please select a student fee record.');
      return;
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid payment amount greater than 0.');
      return;
    }

    const remaining = selectedRecord.balance ?? Math.max(0, Number(selectedRecord.amount_due || 0) - Number(selectedRecord.amount_paid || 0) - Number(selectedRecord.concession_amount || 0));
    if (payAmount > remaining) {
      Alert.alert('Validation Warning', `Amount exceeds outstanding balance (₹${remaining.toLocaleString('en-IN')}). Proceed anyway?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed', onPress: () => executePayment(payAmount) },
      ]);
      return;
    }

    await executePayment(payAmount);
  };

  const executePayment = async (payAmount: number) => {
    try {
      setSubmitting(true);
      const res = await recordPayment({
        studentFeeId: selectedRecord.id,
        studentId: selectedRecord.student_id,
        amount: payAmount,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setReceiptResult({
        receiptNo: res.receiptNo,
        amount: payAmount,
      });
    } catch (err: any) {
      Alert.alert('Payment Error', err?.message || 'Failed to record fee payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const feeOptions = ledgers.map((l) => {
    const bal = l.balance ?? Math.max(0, Number(l.amount_due || 0) - Number(l.amount_paid || 0) - Number(l.concession_amount || 0));
    return {
      label: `${l.student?.name || 'Student'} (${l.class_name || '-'}) — Bal: ₹${bal.toLocaleString('en-IN')}`,
      value: l.id,
    };
  });

  return (
    <View style={styles.container}>
      <PageHeader
        title="Fee Collection"
        subtitle="Record append-only payments and issue verifiable digital fee receipts"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {receiptResult ? (
          <View style={styles.successCard}>
            <CheckCircle size={48} color={theme.colors.accent || '#10B981'} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.successTitle}>Payment Recorded Successfully</Text>
            <Text style={styles.successSub}>
              An append-only transaction entry and receipt have been issued.
            </Text>

            <View style={styles.receiptBox}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Receipt Number:</Text>
                <Text style={styles.receiptVal}>{receiptResult.receiptNo}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Amount Collected:</Text>
                <Text style={[styles.receiptVal, { color: theme.colors.accent || '#10B981', fontSize: 16 }]}>
                  ₹{receiptResult.amount.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Student:</Text>
                <Text style={styles.receiptVal}>{selectedRecord?.student?.name}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Payment Method:</Text>
                <Text style={styles.receiptVal}>{paymentMethod.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.successActions}>
              <Button
                title="Collect Another"
                variant="outline"
                onPress={() => {
                  setReceiptResult(null);
                  setPaymentReference('');
                  setNotes('');
                }}
              />
              <Button
                title="Back to Fees"
                onPress={() => router.push('/(root)/institution/fees' as any)}
              />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Select Student Fee Account</Text>

              <Select
                label="Student Account"
                options={feeOptions.length > 0 ? feeOptions : [{ label: 'No fee records found', value: '' }]}
                value={selectedFeeId}
                onSelect={(val) => setSelectedFeeId(val as string)}
              />

              {selectedRecord && (
                <View style={styles.studentDetailsBox}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Student Name:</Text>
                    <Text style={styles.detailVal}>{selectedRecord.student?.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Class & Roll:</Text>
                    <Text style={styles.detailVal}>
                      {selectedRecord.class_name || selectedRecord.student?.class} • Roll #{selectedRecord.student?.roll_number || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Fee Invoiced:</Text>
                    <Text style={styles.detailVal}>₹{Number(selectedRecord.amount_due || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Already Paid:</Text>
                    <Text style={[styles.detailVal, { color: theme.colors.accent || '#10B981' }]}>
                      ₹{Number(selectedRecord.amount_paid || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Concession Applied:</Text>
                    <Text style={styles.detailVal}>₹{Number(selectedRecord.concession_amount || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={[styles.detailRow, styles.balanceHighlightRow]}>
                    <Text style={styles.balanceHighlightLabel}>Remaining Outstanding:</Text>
                    <Text style={styles.balanceHighlightVal}>
                      ₹{(selectedRecord.balance ?? 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeading}>Transaction Details</Text>

              <FormField
                label="Payment Amount (₹)"
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 5000"
                keyboardType="numeric"
                required
              />

              <Select
                label="Payment Method"
                options={[
                  { label: 'UPI / QR Code', value: 'upi' },
                  { label: 'Cash', value: 'cash' },
                  { label: 'Credit / Debit Card', value: 'card' },
                  { label: 'Net Banking', value: 'netbanking' },
                  { label: 'Cheque', value: 'cheque' },
                  { label: 'Demand Draft (DD)', value: 'dd' },
                  { label: 'Online Gateway', value: 'online' },
                ]}
                value={paymentMethod}
                onSelect={(val) => setPaymentMethod(val as any)}
              />

              <FormField
                label="Transaction Reference / Cheque No."
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder="e.g. UPI-93821034 / CHQ-1002"
              />

              <FormField
                label="Notes / Remarks"
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional payment notes"
              />

              <View style={styles.actionsRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => router.back()}
                  disabled={submitting}
                />
                <Button
                  title="Confirm & Issue Receipt"
                  icon={<Receipt size={16} color="#FFFFFF" />}
                  onPress={handleProcessPayment}
                  loading={submitting}
                  disabled={!selectedRecord}
                />
              </View>
            </View>
          </>
        )}
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
    maxWidth: 750,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeading: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  studentDetailsBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 14,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  detailLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  detailVal: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  balanceHighlightRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
    marginTop: 6,
    paddingTop: 8,
  },
  balanceHighlightLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  balanceHighlightVal: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  successTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  successSub: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  receiptBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    marginBottom: 24,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  receiptLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  receiptVal: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  successActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
});
