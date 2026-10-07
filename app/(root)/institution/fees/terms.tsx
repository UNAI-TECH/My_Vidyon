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
import { Badge } from '../../../../src/components/common/Badge';
import { FormField } from '../../../../src/components/common/FormField';
import { LoadingState, EmptyState } from '../../../../src/components/common/FeedbackStates';
import { useFeeManagement } from '../../../../src/hooks/useFeeManagement';
import { ArrowLeft, Plus, Calendar, CheckCircle2, Clock } from 'lucide-react-native';

export default function AcademicTermsScreen() {
  const router = useRouter();
  const { terms, loading, createTerm, fetchTerms } = useFeeManagement();

  const [modalVisible, setModalVisible] = useState(false);
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [termName, setTermName] = useState('');
  const [termNumber, setTermNumber] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSaveTerm = async () => {
    if (!termName.trim()) {
      Alert.alert('Validation Error', 'Please enter a term name (e.g., Term 1).');
      return;
    }
    const num = parseInt(termNumber, 10);
    if (isNaN(num) || num < 1) {
      Alert.alert('Validation Error', 'Please enter a valid term number (1, 2, 3...).');
      return;
    }

    try {
      setSubmitting(true);
      await createTerm({
        academic_year: academicYear.trim(),
        term_name: termName.trim(),
        term_number: num,
        start_date: startDate.trim() || undefined,
        end_date: endDate.trim() || undefined,
      });
      setModalVisible(false);
      setTermName('');
      setTermNumber(String(terms.length + 2));
      setStartDate('');
      setEndDate('');
      Alert.alert('Success', 'Academic term created successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create academic term.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Academic Terms"
        subtitle="Configure institution terms, schedules, and active academic periods"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
        actions={
          <Button
            title="Add Term"
            size="sm"
            icon={<Plus size={16} color="#FFFFFF" />}
            onPress={() => {
              setTermNumber(String(terms.length + 1));
              setModalVisible(true);
            }}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {loading && terms.length === 0 ? (
          <LoadingState message="Loading academic terms..." />
        ) : terms.length === 0 ? (
          <EmptyState
            title="No Academic Terms Configured"
            description="Create terms like Term 1, Term 2, or Term 3 to manage term-wise fees and timelines."
            actionTitle="Create First Term"
            onAction={() => setModalVisible(true)}
          />
        ) : (
          <View style={styles.termsGrid}>
            {terms.map((term) => (
              <View key={term.id} style={styles.termCard}>
                <View style={styles.termCardHeader}>
                  <View style={styles.termIconBox}>
                    <Calendar size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.termTitle}>{term.term_name}</Text>
                    <Text style={styles.termYear}>Academic Year {term.academic_year}</Text>
                  </View>
                  <Badge variant={term.is_active ? 'success' : 'default'}>
                    {term.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </View>

                <View style={styles.termMetaBox}>
                  <View style={styles.metaRow}>
                    <Clock size={14} color={theme.colors.textMuted} />
                    <Text style={styles.metaLabel}>Term Index:</Text>
                    <Text style={styles.metaVal}>#{term.term_number}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Calendar size={14} color={theme.colors.textMuted} />
                    <Text style={styles.metaLabel}>Schedule:</Text>
                    <Text style={styles.metaVal}>
                      {term.start_date ? new Date(term.start_date).toLocaleDateString() : 'TBD'} —{' '}
                      {term.end_date ? new Date(term.end_date).toLocaleDateString() : 'TBD'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Term Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Academic Term</Text>
            <Text style={styles.modalSubtitle}>Define a school term for student fee schedules and billing</Text>

            <FormField
              label="Academic Year"
              value={academicYear}
              onChangeText={setAcademicYear}
              placeholder="e.g. 2026-27"
            />

            <FormField
              label="Term Name"
              value={termName}
              onChangeText={setTermName}
              placeholder="e.g. Term 1 (Autumn)"
              required
            />

            <FormField
              label="Term Number (Sequence)"
              value={termNumber}
              onChangeText={setTermNumber}
              placeholder="1"
              keyboardType="numeric"
              required
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Start Date (YYYY-MM-DD)"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-06-01"
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormField
                  label="End Date (YYYY-MM-DD)"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="2026-10-31"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              />
              <Button
                title="Create Term"
                onPress={handleSaveTerm}
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
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  termsGrid: {
    gap: 12,
  },
  termCard: {
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
  termCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  termIconBox: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  termYear: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  termMetaBox: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
    paddingTop: 10,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  metaVal: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
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
    maxWidth: 500,
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
