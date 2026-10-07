import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Button } from '../../../../src/components/common/Button';
import { Select } from '../../../../src/components/common/Select';
import { FormField } from '../../../../src/components/common/FormField';
import { Badge } from '../../../../src/components/common/Badge';
import { DataTable, ColumnDef } from '../../../../src/components/common/DataTable';
import { useFeeManagement, StudentFeeLedgerItem } from '../../../../src/hooks/useFeeManagement';
import { ArrowLeft, Gift, Plus, Award, CheckCircle } from 'lucide-react-native';

export default function FeeConcessionsScreen() {
  const router = useRouter();
  const { ledgers, loading, grantConcession } = useFeeManagement();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFeeId, setSelectedFeeId] = useState('');
  const [concessionType, setConcessionType] = useState('merit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter records that have concessions or pending balance
  const concessionList = ledgers.filter((l) => Number(l.concession_amount || 0) > 0);

  const selectedRecord = ledgers.find((l) => l.id === selectedFeeId);

  const handleGrant = async () => {
    if (!selectedFeeId) {
      Alert.alert('Validation Error', 'Please select a student fee record.');
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid concession amount.');
      return;
    }

    try {
      setSubmitting(true);
      await grantConcession({
        studentFeeId: selectedFeeId,
        concessionType,
        amount: val,
        reason: reason.trim() || undefined,
      });

      Alert.alert('Success', 'Concession applied successfully to student fee account.');
      setModalVisible(false);
      setAmount('');
      setReason('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to apply concession.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<StudentFeeLedgerItem>[] = [
    {
      key: 'student',
      title: 'Student',
      render: (item) => (
        <View>
          <Text style={styles.studentName}>{item.student?.name || 'Unknown'}</Text>
          <Text style={styles.studentSub}>
            Roll: {item.student?.roll_number || 'N/A'} • {item.class_name || '-'}
          </Text>
        </View>
      ),
    },
    {
      key: 'amount_due',
      title: 'Total Invoiced',
      render: (item) => <Text style={styles.numText}>₹{Number(item.amount_due).toLocaleString('en-IN')}</Text>,
    },
    {
      key: 'concession',
      title: 'Concession Amount',
      render: (item) => (
        <Text style={[styles.numText, { color: theme.colors.primary, fontWeight: '700' }]}>
          ₹{Number(item.concession_amount).toLocaleString('en-IN')}
        </Text>
      ),
    },
    {
      key: 'paid',
      title: 'Paid',
      render: (item) => (
        <Text style={[styles.numText, { color: theme.colors.accent || '#10B981' }]}>
          ₹{Number(item.amount_paid).toLocaleString('en-IN')}
        </Text>
      ),
    },
    {
      key: 'balance',
      title: 'Remaining',
      render: (item) => {
        const bal = item.balance ?? Math.max(0, Number(item.amount_due) - Number(item.amount_paid) - Number(item.concession_amount));
        return <Text style={[styles.numText, { fontWeight: '700' }]}>₹{bal.toLocaleString('en-IN')}</Text>;
      },
    },
    {
      key: 'status',
      title: 'Status',
      align: 'center',
      render: (item) => <Badge variant={item.status === 'paid' ? 'success' : 'warning'}>{item.status.toUpperCase()}</Badge>,
    },
  ];

  const feeOptions = ledgers.map((l) => ({
    label: `${l.student?.name || 'Student'} (${l.class_name || '-'}) — Due: ₹${Number(l.amount_due).toLocaleString('en-IN')}`,
    value: l.id,
  }));

  return (
    <View style={styles.container}>
      <PageHeader
        title="Fee Concessions & Waivers"
        subtitle="Manage merit scholarships, sibling discounts, and fee concessions"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
        actions={
          <Button
            title="Grant Concession"
            size="sm"
            icon={<Plus size={16} color="#FFFFFF" />}
            onPress={() => {
              if (ledgers.length > 0 && !selectedFeeId) {
                setSelectedFeeId(ledgers[0].id);
              }
              setModalVisible(true);
            }}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tableCard}>
          <DataTable
            columns={columns}
            data={concessionList}
            keyExtractor={(item) => item.id}
            searchable
            searchPlaceholder="Search students with concessions..."
            searchKeys={['student.name', 'student.roll_number', 'class_name']}
            loading={loading}
            emptyTitle="No Concessions Granted"
            emptyDescription="No fee concessions or scholarships have been granted yet. Click 'Grant Concession' to add one."
          />
        </View>
      </ScrollView>

      {/* Grant Concession Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Grant Fee Concession</Text>
            <Text style={styles.modalSubtitle}>Apply scholarship or fee waiver to a student's ledger</Text>

            <Select
              label="Target Student Fee Account"
              options={feeOptions}
              value={selectedFeeId}
              onSelect={(val) => setSelectedFeeId(val as string)}
            />

            <Select
              label="Concession Category"
              options={[
                { label: 'Merit Scholarship', value: 'merit' },
                { label: 'Financial Aid / Need-based', value: 'financial_aid' },
                { label: 'Sibling Discount', value: 'sibling_discount' },
                { label: 'Staff Ward Concession', value: 'staff_child' },
                { label: 'Sports / Special Talent', value: 'sports' },
                { label: 'Discretionary Principal Waiver', value: 'waiver' },
              ]}
              value={concessionType}
              onSelect={(val) => setConcessionType(val as string)}
            />

            <FormField
              label="Discount Amount (₹)"
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 5000"
              keyboardType="numeric"
              required
            />

            <FormField
              label="Reason & Justification"
              value={reason}
              onChangeText={setReason}
              placeholder="Approved by Principal / Governing Board"
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              />
              <Button
                title="Apply Concession"
                onPress={handleGrant}
                loading={submitting}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  numText: {
    color: theme.colors.text,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    padding: 24,
    maxWidth: 520,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
});
