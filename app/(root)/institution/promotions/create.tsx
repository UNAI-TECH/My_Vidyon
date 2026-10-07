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
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Button } from '../../../../src/components/common/Button';
import { Select } from '../../../../src/components/common/Select';
import { FormField } from '../../../../src/components/common/FormField';
import { usePromotions, CLASS_PROGRESSION } from '../../../../src/hooks/usePromotions';
import { ArrowLeft, UserCheck, CalendarRange, Info } from 'lucide-react-native';

export default function CreatePromotionRequestScreen() {
  const router = useRouter();
  const { createPromotionRequest } = usePromotions();

  const [requestType, setRequestType] = useState<'class' | 'institution' | 'individual'>('class');
  const [fromYear, setFromYear] = useState('2025-26');
  const [toYear, setToYear] = useState('2026-27');
  const [className, setClassName] = useState('Class 9');
  const [section, setSection] = useState('A');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const nextClass = CLASS_PROGRESSION[className] || 'Next Standard';

  const handleCreate = async () => {
    if (!fromYear.trim() || !toYear.trim()) {
      Alert.alert('Validation Error', 'Please specify both source and target academic years.');
      return;
    }

    if (requestType === 'class' && !className) {
      Alert.alert('Validation Error', 'Please select a standard / class to promote.');
      return;
    }

    try {
      setSubmitting(true);
      const req = await createPromotionRequest({
        requestType,
        fromYear: fromYear.trim(),
        toYear: toYear.trim(),
        className: requestType === 'class' ? className : undefined,
        section: requestType === 'class' && section !== 'all' ? section : undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        'Promotion Batch Initialized',
        'Student eligibility was auto-screened against active rules. You can now review and approve candidates.',
        [
          {
            text: 'Review Now',
            onPress: () => router.replace(`/(root)/institution/promotions/${req.id}` as any),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to initialize promotion batch.');
    } finally {
      setSubmitting(false);
    }
  };

  const classOptions = [
    { label: 'Pre-KG', value: 'Pre-KG' },
    { label: 'LKG', value: 'LKG' },
    { label: 'UKG', value: 'UKG' },
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
        title="Initialize Promotion Batch"
        subtitle="Screen students for academic year progression and automated eligibility"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardHeading}>1. Promotion Scope</Text>

          <Select
            label="Scope"
            options={[
              { label: 'By Specific Class / Section', value: 'class' },
              { label: 'Institution-wide (All Classes)', value: 'institution' },
            ]}
            value={requestType}
            onSelect={(val) => setRequestType(val as any)}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField
                label="From Academic Year"
                value={fromYear}
                onChangeText={setFromYear}
                placeholder="2025-26"
                required
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormField
                label="To Academic Year"
                value={toYear}
                onChangeText={setToYear}
                placeholder="2026-27"
                required
              />
            </View>
          </View>
        </View>

        {requestType === 'class' && (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>2. Class & Standard Selection</Text>

            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Select
                  label="Select Class"
                  options={classOptions}
                  value={className}
                  onSelect={(val) => setClassName(val as string)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Select
                  label="Section"
                  options={[
                    { label: 'All Sections', value: 'all' },
                    { label: 'Section A', value: 'A' },
                    { label: 'Section B', value: 'B' },
                    { label: 'Section C', value: 'C' },
                  ]}
                  value={section}
                  onSelect={(val) => setSection(val as string)}
                />
              </View>
            </View>

            {/* Progression Preview Banner */}
            <View style={styles.progressionBanner}>
              <Info size={16} color={theme.colors.primary} />
              <Text style={styles.progressionText}>
                Students will progress from <Text style={{ fontWeight: '700' }}>{className}</Text> to{' '}
                <Text style={{ fontWeight: '700' }}>{nextClass}</Text> upon promotion approval.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardHeading}>3. Administrative Notes</Text>
          <FormField
            label="Internal Remarks"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Annual examination promotions based on academic council review"
          />
        </View>

        <View style={styles.actionsRow}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => router.back()}
            disabled={submitting}
          />
          <Button
            title="Initialize & Screen Candidates"
            icon={<UserCheck size={16} color="#FFFFFF" />}
            onPress={handleCreate}
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
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  progressionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  progressionText: {
    color: theme.colors.text,
    fontSize: 13,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
