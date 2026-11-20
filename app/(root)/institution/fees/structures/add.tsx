import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../../../../../src/theme';
import { PageHeader } from '../../../../../src/components/common/PageHeader';
import { Button } from '../../../../../src/components/common/Button';
import { FormField } from '../../../../../src/components/common/FormField';
import { Select } from '../../../../../src/components/common/Select';
import { AlertModal } from '../../../../../src/components/common/AlertModal';
import { useFeeManagement } from '../../../../../src/hooks/useFeeManagement';
import { useInstitutionFaculty } from '../../../../../src/hooks/useInstitutionFaculty';
import { useAuth } from '../../../../../src/hooks/useAuth';
import { ArrowLeft, Plus, Trash2, Layers, IndianRupee } from 'lucide-react-native';

interface ComponentInput {
  name: string;
  amount: string;
  is_optional: boolean;
  is_transport: boolean;
}

export default function AddFeeStructureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ termId?: string; termName?: string; academicYear?: string }>();
  const { terms, createFeeStructure } = useFeeManagement();
  const { institutionId, academicYear: activeAcademicYear } = useAuth();
  const { classes: rawClasses = [] } = useInstitutionFaculty(institutionId);

  const [name, setName] = useState('');
  const [className, setClassName] = useState('All Classes');
  const [termId, setTermId] = useState(params.termId || terms[0]?.id || '');
  const [academicYear, setAcademicYear] = useState(params.academicYear || activeAcademicYear || '2026-27');
  const [category, setCategory] = useState('tuition');
  const [submitting, setSubmitting] = useState(false);

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

  // Dynamic fee components
  const [components, setComponents] = useState<ComponentInput[]>([
    { name: 'Tuition Fee', amount: '15000', is_optional: false, is_transport: false },
    { name: 'Books & Stationery', amount: '3000', is_optional: false, is_transport: false },
    { name: 'Lab Fee', amount: '2000', is_optional: false, is_transport: false },
  ]);

  useEffect(() => {
    if (params.termId) {
      setTermId(params.termId);
    } else if (!termId && terms.length > 0) {
      setTermId(terms[0].id);
    }
  }, [params.termId, terms]);

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

  const handleAddComponent = () => {
    setComponents((prev) => [
      ...prev,
      { name: '', amount: '0', is_optional: false, is_transport: false },
    ]);
  };

  const handleRemoveComponent = (idx: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateComponent = (idx: number, field: keyof ComponentInput, val: any) => {
    setComponents((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // Calculate total
  const totalAmount = components.reduce((sum, c) => {
    const val = parseFloat(c.amount) || 0;
    return sum + (c.is_optional ? 0 : val);
  }, 0);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a name for the fee structure.',
        type: 'error',
      });
      return;
    }

    if (components.length === 0) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please add at least one fee component.',
        type: 'error',
      });
      return;
    }

    // Verify all components have names and amounts
    for (const c of components) {
      if (!c.name.trim()) {
        setAlertConfig({
          visible: true,
          title: 'Validation Error',
          message: 'All fee components must have a valid name.',
          type: 'error',
        });
        return;
      }
      if (isNaN(parseFloat(c.amount)) || parseFloat(c.amount) < 0) {
        setAlertConfig({
          visible: true,
          title: 'Validation Error',
          message: `Invalid amount for component "${c.name}".`,
          type: 'error',
        });
        return;
      }
    }

    try {
      setSubmitting(true);
      const newStruct = await createFeeStructure(
        {
          name: name.trim(),
          term_id: termId || undefined,
          class_name: className.trim(),
          academic_year: academicYear.trim(),
          category,
        },
        components.map((c) => ({
          name: c.name.trim(),
          amount: parseFloat(c.amount),
          is_optional: c.is_optional,
          is_transport: c.is_transport,
        }))
      );

      const savedName = name.trim();
      const savedClass = className.trim();
      const savedTerm = termId;
      const savedYear = academicYear.trim();

      setAlertConfig({
        visible: true,
        title: 'Fee Structure Created!',
        message: `"${savedName}" has been created with ${components.length} components totaling ₹${totalAmount.toLocaleString('en-IN')}.\n\nWould you like to continue to assign this fee structure to classes?`,
        type: 'success',
        buttons: [
          {
            text: 'Continue to Assign Class',
            style: 'primary',
            onPress: () => {
              router.push({
                pathname: '/(root)/institution/fees/assign' as any,
                params: {
                  feeStructureId: newStruct.id,
                  termId: savedTerm,
                  academicYear: savedYear,
                  className: savedClass !== 'All Classes' ? savedClass : '',
                },
              });
            },
          },
          {
            text: 'View Structures',
            style: 'secondary',
            onPress: () => {
              router.push('/(root)/institution/fees/structures' as any);
            },
          },
        ],
      });
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        title: 'Creation Failed',
        message: err?.message || 'Failed to create fee structure. Please try again.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const termOptions = terms.map((t) => ({ label: `${t.term_name} (${t.academic_year})`, value: t.id }));

  return (
    <View style={styles.container}>
      <PageHeader
        title="Create Fee Structure"
        subtitle="Define a fee blueprint with itemized components (Tuition, Lab, Transport)"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Basic Information</Text>

          <FormField
            label="Structure Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Term 1 Fee - Class 10"
            required
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Select
                label="Target Class"
                options={classOptions}
                value={className}
                onSelect={(val) => setClassName(val as string)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Select
                label="Academic Term"
                options={termOptions.length > 0 ? termOptions : [{ label: 'Annual / General', value: '' }]}
                value={termId}
                onSelect={(val) => setTermId(val as string)}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField
                label="Academic Year"
                value={academicYear}
                onChangeText={setAcademicYear}
                placeholder="2026-27"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Select
                label="Category"
                options={[
                  { label: 'Tuition / Academic', value: 'tuition' },
                  { label: 'Transport Only', value: 'transport' },
                  { label: 'Hostel & Boarding', value: 'hostel' },
                  { label: 'Sports & Co-curricular', value: 'sports' },
                ]}
                value={category}
                onSelect={(val) => setCategory(val as string)}
              />
            </View>
          </View>
        </View>

        {/* Dynamic Components Section */}
        <View style={styles.card}>
          <View style={styles.compHeader}>
            <View>
              <Text style={styles.sectionHeading}>Fee Components Breakdown</Text>
              <Text style={styles.compSub}>Break total fee into transparent component lines</Text>
            </View>
            <Button
              title="Add Row"
              size="sm"
              variant="outline"
              icon={<Plus size={14} color={theme.colors.primary} />}
              onPress={handleAddComponent}
            />
          </View>

          {components.map((comp, idx) => (
            <View key={idx} style={styles.compInputRow}>
              <View style={{ flex: 2 }}>
                <FormField
                  label={idx === 0 ? 'Component Name' : ''}
                  value={comp.name}
                  onChangeText={(val) => handleUpdateComponent(idx, 'name', val)}
                  placeholder="e.g. Tuition / Lab / Transport"
                />
              </View>

              <View style={{ flex: 1 }}>
                <FormField
                  label={idx === 0 ? 'Amount (₹)' : ''}
                  value={comp.amount}
                  onChangeText={(val) => handleUpdateComponent(idx, 'amount', val)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.compActionCol, idx === 0 && { marginTop: 22 }]}>
                <TouchableOpacity
                  style={styles.trashBtn}
                  onPress={() => handleRemoveComponent(idx)}
                  disabled={components.length <= 1}
                >
                  <Trash2
                    size={18}
                    color={components.length <= 1 ? theme.colors.glassBorder : '#EF4444'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Total Bar */}
          <View style={styles.totalBar}>
            <Text style={styles.totalLabel}>Total Mandatory Fee:</Text>
            <Text style={styles.totalVal}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Submit Actions */}
        <View style={styles.submitRow}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => router.back()}
            disabled={submitting}
          />
          <Button
            title="Save Fee Structure"
            onPress={handleSubmit}
            loading={submitting}
          />
        </View>
      </ScrollView>

      {/* Continuation & Feedback Modal */}
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
    maxWidth: 800,
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
  sectionHeading: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  compHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  compSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  compInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  compActionCol: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  trashBtn: {
    padding: 8,
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.m,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  totalLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  totalVal: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  submitRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
});
