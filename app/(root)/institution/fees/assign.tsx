import React, { useState, useMemo, useEffect } from 'react';
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
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { useFeeManagement } from '../../../../src/hooks/useFeeManagement';
import { useInstitutionFaculty } from '../../../../src/hooks/useInstitutionFaculty';
import { useAuth } from '../../../../src/hooks/useAuth';
import { CalendarModal } from '../../../../src/components/common/CalendarPicker';
import { ArrowLeft, UserPlus, CheckCircle2, AlertCircle, Calendar, X } from 'lucide-react-native';

export default function AssignFeeStructureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    feeStructureId?: string;
    termId?: string;
    academicYear?: string;
    className?: string;
  }>();
  const { structures, terms, assignFeeStructureToClass } = useFeeManagement();
  const { institutionId, academicYear: activeAcademicYear } = useAuth();
  const { classes: rawClasses = [] } = useInstitutionFaculty(institutionId);

  const [selectedStructureId, setSelectedStructureId] = useState(params.feeStructureId || structures[0]?.id || '');
  const [selectedClass, setSelectedClass] = useState(params.className || 'All Classes');
  const [dueDate, setDueDate] = useState('2026-07-15');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [academicYear, setAcademicYear] = useState(params.academicYear || activeAcademicYear || '2026-27');
  const [assigning, setAssigning] = useState(false);

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

  useEffect(() => {
    if (params.feeStructureId) {
      setSelectedStructureId(params.feeStructureId);
    } else if (!selectedStructureId && structures.length > 0) {
      setSelectedStructureId(structures[0].id);
    }
  }, [params.feeStructureId, structures]);

  useEffect(() => {
    if (params.className) {
      setSelectedClass(params.className);
    }
  }, [params.className]);

  useEffect(() => {
    if (params.academicYear) {
      setAcademicYear(params.academicYear);
    } else if (activeAcademicYear) {
      setAcademicYear(activeAcademicYear);
    }
  }, [params.academicYear, activeAcademicYear]);

  const uniqueClassNames = useMemo(() => {
    const names = new Set<string>();
    (rawClasses || []).forEach((c: any) => {
      if (c.name) names.add(c.name);
    });
    if (names.size > 0) return Array.from(names);
    return [
      'Pre-KG', 'LKG', 'UKG',
      '1st Standard', '2nd Standard', '3rd Standard', '4th Standard', '5th Standard',
      '6th Standard', '7th Standard', '8th Standard', '9th Standard', '10th Standard',
      '11th Standard', '12th Standard'
    ];
  }, [rawClasses]);

  const classOptions = useMemo(() => {
    return [
      { label: 'All Classes (Institution-wide)', value: 'All Classes' },
      ...uniqueClassNames.map((cName) => ({ label: cName, value: cName })),
    ];
  }, [uniqueClassNames]);

  const selectedStructure = structures.find((s) => s.id === selectedStructureId);

  const handleAssign = async () => {
    if (!selectedStructureId) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please select a fee structure blueprint.',
        type: 'error',
      });
      return;
    }
    if (!selectedClass) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please select a target student class.',
        type: 'error',
      });
      return;
    }

    try {
      setAssigning(true);
      const res = await assignFeeStructureToClass({
        feeStructureId: selectedStructureId,
        className: selectedClass,
        dueDate: dueDate.trim() || undefined,
        academicYear: academicYear.trim(),
        termId: (params.termId || selectedStructure?.term_id) || undefined,
      });

      const classDisplay = selectedClass === 'All Classes' ? 'all classes' : selectedClass;

      if (res.assignedCount > 0) {
        let msg = `Successfully assigned "${selectedStructure?.name}" to ${res.assignedCount} student(s) in ${classDisplay}.\n• Amount: ₹${Number(selectedStructure?.amount || 0).toLocaleString('en-IN')}\n• Due Date: ${dueDate || 'Immediate'}\n• Academic Year: ${academicYear}`;
        if (res.alreadyAssignedCount > 0) {
          msg += `\n• ${res.alreadyAssignedCount} student(s) were already assigned.`;
        }

        setAlertConfig({
          visible: true,
          title: 'Fees Assigned Successfully!',
          message: msg,
          type: 'success',
          buttons: [
            {
              text: 'View Fee Ledger',
              style: 'primary',
              onPress: () => router.push('/(root)/institution/fees' as any),
            },
            {
              text: 'Assign Another Class',
              style: 'secondary',
              onPress: () => {},
            },
          ],
        });
      } else {
        setAlertConfig({
          visible: true,
          title: 'Already Assigned',
          message: `All ${res.totalStudents || 0} students in ${classDisplay} have already been assigned to "${selectedStructure?.name}". No duplicate fee records were created.`,
          type: 'info',
          buttons: [
            {
              text: 'View Fee Ledger',
              style: 'primary',
              onPress: () => router.push('/(root)/institution/fees' as any),
            },
            {
              text: 'Assign Another Class',
              style: 'secondary',
              onPress: () => {},
            },
          ],
        });
      }
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        title: 'Assignment Not Done',
        message: err?.message || 'Failed to assign fees to class. Please check enrolled students in Admissions and try again.',
        type: 'error',
      });
    } finally {
      setAssigning(false);
    }
  };

  const structureOptions = structures.map((s) => ({
    label: `${s.name} (₹${Number(s.amount).toLocaleString('en-IN')})`,
    value: s.id,
  }));

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

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.inputLabel}>Payment Due Date</Text>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.datePickerContent}>
                <Calendar size={18} color={dueDate ? theme.colors.primary : '#94A3B8'} {...({} as any)} />
                <Text style={[styles.datePickerText, !dueDate && styles.datePlaceholderText]}>
                  {dueDate || 'YYYY-MM-DD'}
                </Text>
              </View>
              {dueDate ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setDueDate('');
                  }}
                  style={styles.dateClearBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color="#94A3B8" {...({} as any)} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          </View>
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

      {/* Calendar Date Picker Modal */}
      <CalendarModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date) => {
          setDueDate(date);
          setShowDatePicker(false);
        }}
        initialDate={dueDate || undefined}
        title="Select Payment Due Date"
      />

      {/* Done / Not Done Feedback Modal */}
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
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: 14,
    minHeight: 46,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  datePickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  datePlaceholderText: {
    color: '#94A3B8',
    fontWeight: 'normal',
  },
  dateClearBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
});
