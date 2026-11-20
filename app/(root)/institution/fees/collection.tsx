import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Button } from '../../../../src/components/common/Button';
import { Select } from '../../../../src/components/common/Select';
import { FormField } from '../../../../src/components/common/FormField';
import { Badge } from '../../../../src/components/common/Badge';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { useFeeManagement, StudentFeeLedgerItem } from '../../../../src/hooks/useFeeManagement';
import { ArrowLeft, CreditCard, CheckCircle, ShieldCheck, User, BookOpen, Layers, IndianRupee } from 'lucide-react-native';

export default function FeeCollectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ studentFeeId?: string }>();
  const { ledgers, recordPayment } = useFeeManagement();

  // Cascaded Selection States: Class -> Section -> Student -> Fee Schedule
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedFeeId, setSelectedFeeId] = useState<string>(params.studentFeeId || '');

  // Payment Form States
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'netbanking' | 'cheque' | 'dd' | 'online' | 'other'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptResult, setReceiptResult] = useState<{
    receiptNo: string;
    amount: number;
    remainingAfter: number;
    studentName?: string;
    termName?: string;
  } | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    buttons?: {
      text: string;
      style?: 'primary' | 'secondary' | 'destructive';
      onPress: () => void;
    }[];
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  // 1. Available Classes from ledgers
  const classOptions = useMemo(() => {
    const classes = Array.from(
      new Set(
        ledgers
          .map((l) => l.class_name || l.student?.class_name || l.student?.class)
          .filter(Boolean)
      )
    ).sort();
    return classes.map((c) => ({ label: c as string, value: c as string }));
  }, [ledgers]);

  // 2. Available Sections for chosen class
  const sectionOptions = useMemo(() => {
    if (!selectedClass) return [];
    const sections = Array.from(
      new Set(
        ledgers
          .filter((l) => (l.class_name || l.student?.class_name || l.student?.class) === selectedClass)
          .map((l) => l.student?.section)
          .filter(Boolean)
      )
    ).sort();

    const opts = sections.map((s) => ({ label: `Section ${s}`, value: s as string }));
    if (sections.length > 1) {
      return [{ label: 'All Sections', value: 'ALL' }, ...opts];
    }
    return opts.length > 0 ? opts : [{ label: 'Section A', value: 'A' }];
  }, [ledgers, selectedClass]);

  // 3. Students for chosen class & section
  const studentOptions = useMemo(() => {
    if (!selectedClass) return [];
    const filteredLedgers = ledgers.filter((l) => {
      const c = l.class_name || l.student?.class_name || l.student?.class;
      if (c !== selectedClass) return false;
      if (selectedSection && selectedSection !== 'ALL') {
        const s = l.student?.section;
        if (s && s !== selectedSection) return false;
      }
      return true;
    });

    const studMap = new Map<string, { id: string; name: string; register_number?: string; totalPending: number }>();
    filteredLedgers.forEach((l) => {
      if (l.student_id && l.student) {
        const bal = l.balance !== undefined
          ? Number(l.balance)
          : Math.max(0, Number(l.amount_due || 0) - Number(l.amount_paid || 0) - Number(l.concession_amount || 0));
        const prev = studMap.get(l.student_id);
        if (prev) {
          prev.totalPending += bal;
        } else {
          studMap.set(l.student_id, {
            id: l.student_id,
            name: l.student.name,
            register_number: l.student.register_number,
            totalPending: bal,
          });
        }
      }
    });

    return Array.from(studMap.values()).map((s) => ({
      label: `${s.name} (${s.register_number || 'N/A'}) — Due: ₹${s.totalPending.toLocaleString('en-IN')}`,
      value: s.id,
    }));
  }, [ledgers, selectedClass, selectedSection]);

  // 4. Fee schedules for the chosen student
  const studentFeeOptions = useMemo(() => {
    if (!selectedStudentId) return [];
    const fees = ledgers.filter((l) => l.student_id === selectedStudentId);
    return fees.map((f) => {
      const bal = f.balance !== undefined
        ? Number(f.balance)
        : Math.max(0, Number(f.amount_due || 0) - Number(f.amount_paid || 0) - Number(f.concession_amount || 0));
      const termTitle = f.term_name || f.fee_structure?.name || 'Academic Fee';
      const statusText = bal <= 0 ? 'PAID' : f.status === 'partial' ? `PARTIAL (Due: ₹${bal.toLocaleString('en-IN')})` : `DUE: ₹${bal.toLocaleString('en-IN')}`;
      return {
        label: `${termTitle} — [${statusText}]`,
        value: f.id,
      };
    });
  }, [ledgers, selectedStudentId]);

  // Pre-select if studentFeeId param was provided, otherwise default to first available
  useEffect(() => {
    if (params.studentFeeId && ledgers.length > 0) {
      const match = ledgers.find((l) => l.id === params.studentFeeId);
      if (match) {
        setSelectedFeeId(match.id);
        setSelectedClass(match.class_name || match.student?.class_name || match.student?.class || '');
        setSelectedSection(match.student?.section || 'A');
        setSelectedStudentId(match.student_id);
      }
    } else if (ledgers.length > 0 && !selectedClass) {
      const firstClass = ledgers[0].class_name || ledgers[0].student?.class_name || ledgers[0].student?.class || '';
      if (firstClass) setSelectedClass(firstClass);
    }
  }, [params.studentFeeId, ledgers]);

  // Auto-sync section on class change
  useEffect(() => {
    if (selectedClass && sectionOptions.length > 0) {
      if (!selectedSection || !sectionOptions.some((s) => s.value === selectedSection)) {
        setSelectedSection(sectionOptions[0].value);
      }
    }
  }, [selectedClass, sectionOptions]);

  // Auto-sync student on section change
  useEffect(() => {
    if (studentOptions.length > 0) {
      if (!selectedStudentId || !studentOptions.some((s) => s.value === selectedStudentId)) {
        setSelectedStudentId(studentOptions[0].value);
      }
    } else {
      setSelectedStudentId('');
    }
  }, [studentOptions]);

  // Auto-sync fee on student change: prefer pending/partial fee
  useEffect(() => {
    if (studentFeeOptions.length > 0) {
      const currentFees = ledgers.filter((l) => l.student_id === selectedStudentId);
      const pendingFee = currentFees.find((f) => {
        const bal = f.balance !== undefined
          ? Number(f.balance)
          : Math.max(0, Number(f.amount_due || 0) - Number(f.amount_paid || 0) - Number(f.concession_amount || 0));
        return bal > 0;
      });
      if (pendingFee) {
        setSelectedFeeId(pendingFee.id);
      } else if (!studentFeeOptions.some((f) => f.value === selectedFeeId)) {
        setSelectedFeeId(studentFeeOptions[0].value);
      }
    } else {
      setSelectedFeeId('');
    }
  }, [selectedStudentId, studentFeeOptions]);

  // Selected Fee Record
  const selectedRecord = useMemo(() => {
    return ledgers.find((l) => l.id === selectedFeeId) || null;
  }, [ledgers, selectedFeeId]);

  // Populate initial payment amount when selectedRecord changes
  useEffect(() => {
    if (selectedRecord) {
      const remaining = selectedRecord.balance ?? Math.max(0, Number(selectedRecord.amount_due || 0) - Number(selectedRecord.amount_paid || 0) - Number(selectedRecord.concession_amount || 0));
      setAmount(String(remaining));
    } else {
      setAmount('0');
    }
  }, [selectedRecord]);

  const currentRemaining = selectedRecord
    ? (selectedRecord.balance ?? Math.max(0, Number(selectedRecord.amount_due || 0) - Number(selectedRecord.amount_paid || 0) - Number(selectedRecord.concession_amount || 0)))
    : 0;
  const enteredAmount = parseFloat(amount) || 0;
  const remainingAfterPayment = Math.max(0, currentRemaining - enteredAmount);

  const handleProcessPayment = async () => {
    if (!selectedRecord) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please select a student fee record to record payment.',
        type: 'error',
      });
      return;
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a valid payment amount greater than 0.',
        type: 'error',
      });
      return;
    }

    if (payAmount > currentRemaining && currentRemaining > 0) {
      setAlertConfig({
        visible: true,
        title: 'Validation Warning',
        message: `Amount (₹${payAmount.toLocaleString('en-IN')}) exceeds the current outstanding balance (₹${currentRemaining.toLocaleString('en-IN')}). Do you wish to proceed?`,
        type: 'warning',
        buttons: [
          {
            text: 'Cancel',
            style: 'secondary',
            onPress: () => {},
          },
          {
            text: 'Proceed',
            style: 'primary',
            onPress: () => executePayment(payAmount),
          },
        ],
      });
      return;
    }

    await executePayment(payAmount);
  };

  const executePayment = async (payAmount: number) => {
    if (!selectedRecord) return;
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
        remainingAfter: Math.max(0, currentRemaining - payAmount),
        studentName: selectedRecord.student?.name,
        termName: selectedRecord.term_name || selectedRecord.fee_structure?.name || 'Term Fee',
      });
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        title: 'Payment Error',
        message: err?.message || 'Failed to record fee payment.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Fee Collection"
        subtitle="Record cash, UPI or cheque payments at school counter and issue instant receipts"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {receiptResult ? (
          <View style={styles.successCard}>
            <CheckCircle size={48} color="#10B981" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.successTitle}>Payment Recorded Successfully</Text>
            <Text style={styles.successSub}>
              An append-only transaction entry and receipt have been issued and reconciled.
            </Text>

            <View style={styles.receiptBox}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Receipt Number:</Text>
                <Text style={styles.receiptVal}>{receiptResult.receiptNo}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Student Name:</Text>
                <Text style={styles.receiptVal}>{receiptResult.studentName}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Fee Term / Schedule:</Text>
                <Text style={styles.receiptVal}>{receiptResult.termName}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Amount Collected:</Text>
                <Text style={[styles.receiptVal, { color: '#10B981', fontSize: 16 }]}>
                  ₹{receiptResult.amount.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Remaining Pending Due:</Text>
                <Text style={[styles.receiptVal, { color: receiptResult.remainingAfter > 0 ? '#DC2626' : '#10B981' }]}>
                  ₹{receiptResult.remainingAfter.toLocaleString('en-IN')}
                </Text>
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
                title="Back to Fee Dashboard"
                onPress={() => router.push('/(root)/institution/fees' as any)}
              />
            </View>
          </View>
        ) : (
          <>
            {/* 1. Cascaded Student & Fee Selector */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Select Student & Fee Schedule</Text>

              {/* Row 1: Class & Section Filters */}
              <View style={styles.filterGrid}>
                <View style={{ flex: 1 }}>
                  <Select
                    label="Class"
                    options={classOptions.length > 0 ? classOptions : [{ label: 'No classes found', value: '' }]}
                    value={selectedClass}
                    onSelect={(val) => setSelectedClass(val as string)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Select
                    label="Section"
                    options={sectionOptions.length > 0 ? sectionOptions : [{ label: 'Section A', value: 'A' }]}
                    value={selectedSection}
                    onSelect={(val) => setSelectedSection(val as string)}
                  />
                </View>
              </View>

              {/* Row 2: Student Name Dropdown */}
              <Select
                label="Student Name"
                options={studentOptions.length > 0 ? studentOptions : [{ label: 'No students found in this class', value: '' }]}
                value={selectedStudentId}
                onSelect={(val) => setSelectedStudentId(val as string)}
              />

              {/* Row 3: Fee Schedule / Term to Pay */}
              <Select
                label="Fee Schedule / Term"
                options={studentFeeOptions.length > 0 ? studentFeeOptions : [{ label: 'No fee schedules found for this student', value: '' }]}
                value={selectedFeeId}
                onSelect={(val) => setSelectedFeeId(val as string)}
              />

              {/* Active Fee & Student Summary */}
              {selectedRecord && (
                <View style={styles.studentDetailsBox}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Student Name:</Text>
                    <Text style={styles.detailVal}>{selectedRecord.student?.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Class & Roll / Reg:</Text>
                    <Text style={styles.detailVal}>
                      {selectedRecord.class_name || selectedRecord.student?.class_name || selectedRecord.student?.class} • Reg: {selectedRecord.student?.register_number || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fee Term:</Text>
                    <Text style={[styles.detailVal, { color: theme.colors.primary, fontWeight: '700' }]}>
                      {selectedRecord.term_name || selectedRecord.fee_structure?.name || 'Academic Fee'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Fee Invoiced:</Text>
                    <Text style={styles.detailVal}>₹{Number(selectedRecord.amount_due || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Concession Applied:</Text>
                    <Text style={[styles.detailVal, { color: '#D97706' }]}>
                      ₹{Number(selectedRecord.concession_amount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Already Paid:</Text>
                    <Text style={[styles.detailVal, { color: '#10B981' }]}>
                      ₹{Number(selectedRecord.amount_paid || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={[styles.detailRow, styles.balanceHighlightRow]}>
                    <Text style={styles.balanceHighlightLabel}>Remaining Outstanding:</Text>
                    <Text style={[styles.balanceHighlightVal, { color: currentRemaining > 0 ? '#DC2626' : '#10B981' }]}>
                      ₹{currentRemaining.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* 2. Transaction Details Card */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Payment Collection Details</Text>

              <FormField
                label="Payment Amount (₹) *"
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter payment amount"
                keyboardType="numeric"
                required
              />

              {/* Minimal / Partial Payment Helper Notice */}
              {selectedRecord && (
                <View style={styles.paymentHelperBox}>
                  {enteredAmount >= currentRemaining && currentRemaining > 0 ? (
                    <Text style={[styles.paymentHelperText, { color: '#059669' }]}>
                      Full Payment: Paying ₹{enteredAmount.toLocaleString('en-IN')} will clear this fee schedule in full.
                    </Text>
                  ) : enteredAmount > 0 && enteredAmount < currentRemaining ? (
                    <Text style={[styles.paymentHelperText, { color: '#B45309' }]}>
                      Partial Payment: Paying ₹{enteredAmount.toLocaleString('en-IN')}. Remaining pending balance for this term will be updated to ₹{remainingAfterPayment.toLocaleString('en-IN')} (Status: Partial).
                    </Text>
                  ) : currentRemaining <= 0 ? (
                    <Text style={[styles.paymentHelperText, { color: '#059669' }]}>
                      This fee schedule is already cleared (Paid in Full).
                    </Text>
                  ) : null}
                </View>
              )}

              <Select
                label="Payment Method"
                options={[
                  { label: 'Cash (Counter Collection)', value: 'cash' },
                  { label: 'UPI / QR Code', value: 'upi' },
                  { label: 'Credit / Debit Card', value: 'card' },
                  { label: 'Cheque', value: 'cheque' },
                  { label: 'Demand Draft (DD)', value: 'dd' },
                  { label: 'Net Banking', value: 'netbanking' },
                  { label: 'Online Gateway', value: 'online' },
                ]}
                value={paymentMethod}
                onSelect={(val) => setPaymentMethod(val as any)}
              />

              <FormField
                label="Transaction Reference / Cheque No. / Slip No."
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder="e.g. Cash Slip #042 / CHQ-100234 / UPI-94821034"
              />

              <FormField
                label="Notes / Remarks"
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes (e.g. Paid by father in cash at fee counter)"
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
                  onPress={handleProcessPayment}
                  loading={submitting}
                  disabled={!selectedRecord || enteredAmount <= 0}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Alert Modal */}
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
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
  filterGrid: {
    flexDirection: 'row',
    gap: 12,
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
    fontSize: 16,
    fontWeight: '800',
  },
  paymentHelperBox: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  paymentHelperText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
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
