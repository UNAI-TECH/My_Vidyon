import React, { useState } from 'react';
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
import { useFeeManagement } from '../../../../src/hooks/useFeeManagement';
import { ArrowLeft, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react-native';

export default function AssignFeeStructureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ feeStructureId?: string; className?: string }>();
  const { structures, terms, assignFeeStructureToClass } = useFeeManagement();

  const [selectedStructureId, setSelectedStructureId] = useState(params.feeStructureId || structures[0]?.id || '');
  const [selectedClass, setSelectedClass] = useState(params.className || 'Class 10');
  const [dueDate, setDueDate] = useState('2026-07-15');
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [assigning, setAssigning] = useState(false);

  const selectedStructure = structures.find((s) => s.id === selectedStructureId);

  const handleAssign = async () => {
    if (!selectedStructureId) {
      Alert.alert('Validation Error', 'Please select a fee structure.');
      return;
    }
    if (!selectedClass) {
      Alert.alert('Validation Error', 'Please select a class.');
      return;
    }

    try {
      setAssigning(true);
      const res = await assignFeeStructureToClass({
        feeStructureId: selectedStructureId,
        className: selectedClass,
        dueDate: dueDate.trim() || undefined,
        academicYear: academicYear.trim(),
      });

      Alert.alert(
        'Fees Assigned Successfully',
        `Successfully assigned fee structure to ${res.assignedCount} students in ${selectedClass}.`,
        [{ text: 'View Ledger', onPress: () => router.push('/(root)/institution/fees' as any) }]
      );
    } catch (err: any) {
      Alert.alert('Assignment Error', err?.message || 'Failed to assign fees to class.');
    } finally {
      setAssigning(false);
    }
  };

  const structureOptions = structures.map((s) => ({
    label: `${s.name} (₹${Number(s.amount).toLocaleString('en-IN')})`,
    value: s.id,
  }));

  const classOptions = [
    { label: 'Class 1', value: 'Class 1' },
    { label: 'Class 2', value: 'Class 2' },
    { label: 'Class 3', value: 'Class 3' },
    { label: 'Class 4', value: 'Class 4' },
    { label: 'Class 5', value: 'Class 5' },
    { label: 'Class 6', value: 'Class 6' },
    { label: 'Class 7', value: 'Class 7' },
    { label: 'Class 8', value: 'Class 8' },
    { label: 'Class 9', value: 'Class 9' },
    { label: 'Class 10', value: 'Class 10' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title="Assign Fees to Class"
        subtitle="Bulk assign fee schedules and due dates to all enrolled students of a standard"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Assignment Configuration</Text>

          <Select
            label="Fee Structure Blueprint"
            options={
              structureOptions.length > 0
                ? structureOptions
                : [{ label: 'No structures available. Create one first.', value: '' }]
            }
            value={selectedStructureId}
            onSelect={(val) => setSelectedStructureId(val as string)}
          />

          <Select
            label="Target Student Class"
            options={classOptions}
            value={selectedClass}
            onSelect={(val) => setSelectedClass(val as string)}
          />

          <FormField
            label="Academic Year"
            value={academicYear}
            onChangeText={setAcademicYear}
            placeholder="2026-27"
          />

          <FormField
            label="Payment Due Date (YYYY-MM-DD)"
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="2026-07-15"
          />
        </View>

        {/* Preview Summary Box */}
        {selectedStructure && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryHeading}>Assignment Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Structure Name:</Text>
              <Text style={styles.summaryVal}>{selectedStructure.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount Per Student:</Text>
              <Text style={[styles.summaryVal, { color: theme.colors.primary, fontWeight: '800' }]}>
                ₹{Number(selectedStructure.amount).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Target Standard:</Text>
              <Text style={styles.summaryVal}>{selectedClass}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Deadline:</Text>
              <Text style={styles.summaryVal}>{dueDate || 'Immediate'}</Text>
            </View>
          </View>
        )}

        <View style={styles.actionsRow}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => router.back()}
            disabled={assigning}
          />
          <Button
            title="Confirm & Assign to Class"
            icon={<UserPlus size={16} color="#FFFFFF" />}
            onPress={handleAssign}
            loading={assigning}
            disabled={!selectedStructureId}
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
  content: {
    padding: 16,
    maxWidth: 700,
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
  summaryCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    marginBottom: 20,
  },
  summaryHeading: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  summaryVal: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
