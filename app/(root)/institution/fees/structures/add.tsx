import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../../../src/theme';
import { PageHeader } from '../../../../../src/components/common/PageHeader';
import { Button } from '../../../../../src/components/common/Button';
import { FormField } from '../../../../../src/components/common/FormField';
import { Select } from '../../../../../src/components/common/Select';
import { useFeeManagement } from '../../../../../src/hooks/useFeeManagement';
import { ArrowLeft, Plus, Trash2, Layers, IndianRupee } from 'lucide-react-native';

interface ComponentInput {
  name: string;
  amount: string;
  is_optional: boolean;
  is_transport: boolean;
}

export default function AddFeeStructureScreen() {
  const router = useRouter();
  const { terms, createFeeStructure } = useFeeManagement();

  const [name, setName] = useState('');
  const [className, setClassName] = useState('Class 10');
  const [termId, setTermId] = useState(terms[0]?.id || '');
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [category, setCategory] = useState('tuition');
  const [submitting, setSubmitting] = useState(false);

  // Dynamic fee components
  const [components, setComponents] = useState<ComponentInput[]>([
    { name: 'Tuition Fee', amount: '15000', is_optional: false, is_transport: false },
    { name: 'Books & Stationery', amount: '3000', is_optional: false, is_transport: false },
    { name: 'Lab Fee', amount: '2000', is_optional: false, is_transport: false },
  ]);

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
      Alert.alert('Validation Error', 'Please enter a name for the fee structure.');
      return;
    }

    if (components.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one fee component.');
      return;
    }

    // Verify all components have names and amounts
    for (const c of components) {
      if (!c.name.trim()) {
        Alert.alert('Validation Error', 'All fee components must have a valid name.');
        return;
      }
      if (isNaN(parseFloat(c.amount)) || parseFloat(c.amount) < 0) {
        Alert.alert('Validation Error', `Invalid amount for component "${c.name}".`);
        return;
      }
    }

    try {
      setSubmitting(true);
      await createFeeStructure(
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

      Alert.alert('Success', 'Fee structure created successfully with all components!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create fee structure.');
    } finally {
      setSubmitting(false);
    }
  };

  const termOptions = terms.map((t) => ({ label: `${t.term_name} (${t.academic_year})`, value: t.id }));
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
