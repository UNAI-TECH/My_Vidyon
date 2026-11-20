import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Button } from '../../../../src/components/common/Button';
import { Badge } from '../../../../src/components/common/Badge';
import { FormField } from '../../../../src/components/common/FormField';
import { LoadingState, EmptyState } from '../../../../src/components/common/FeedbackStates';
import { useFeeManagement } from '../../../../src/hooks/useFeeManagement';
import { useAuth } from '../../../../src/hooks/useAuth';
import { CalendarModal } from '../../../../src/components/common/CalendarPicker';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { ArrowLeft, Plus, Calendar, CheckCircle2, Clock, X, Trash2 } from 'lucide-react-native';

export default function AcademicTermsScreen() {
  const router = useRouter();
  const { terms, loading, createTerm, fetchTerms, deleteTerm } = useFeeManagement();
  const { academicYear: activeAcademicYear } = useAuth();

  const [modalVisible, setModalVisible] = useState(false);
  const [academicYear, setAcademicYear] = useState(activeAcademicYear || '2026-27');
  const [termName, setTermName] = useState('');
  const [termNumber, setTermNumber] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [datePickerConfig, setDatePickerConfig] = useState<{
    visible: boolean;
    type: 'start' | 'end';
  }>({ visible: false, type: 'start' });

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

  React.useEffect(() => {
    if (activeAcademicYear) {
      setAcademicYear(activeAcademicYear);
    }
  }, [activeAcademicYear]);

  const handleDateSelect = (date: string) => {
    if (datePickerConfig.type === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
    setDatePickerConfig(prev => ({ ...prev, visible: false }));
  };

  const handleSaveTerm = async () => {
    if (!termName.trim()) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a term name (e.g., Term 1).',
        type: 'error',
      });
      return;
    }
    const num = parseInt(termNumber, 10);
    if (isNaN(num) || num < 1) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a valid term number (1, 2, 3...).',
        type: 'error',
      });
      return;
    }

    try {
      setSubmitting(true);
      const createdTerm = await createTerm({
        academic_year: academicYear.trim(),
        term_name: termName.trim(),
        term_number: num,
        start_date: startDate.trim() || undefined,
        end_date: endDate.trim() || undefined,
      });

      const savedName = termName.trim();
      const savedYear = academicYear.trim();

      setModalVisible(false);
      setTermName('');
      setTermNumber(String(terms.length + 2));
      setStartDate('');
      setEndDate('');

      setAlertConfig({
        visible: true,
        title: 'Academic Term Created!',
        message: `Academic term "${savedName}" has been configured successfully.\n\nWould you like to move to Fee Structures to assign classes and payment methods for this term?`,
        type: 'success',
        buttons: [
          {
            text: 'Continue to Fee Structure',
            style: 'primary',
            onPress: () => {
              router.push({
                pathname: '/(root)/institution/fees/structures/add' as any,
                params: {
                  termId: createdTerm?.id || '',
                  termName: savedName,
                  academicYear: savedYear,
                },
              });
            },
          },
          {
            text: 'Stay on Terms',
            style: 'secondary',
            onPress: () => {},
          },
        ],
      });
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        title: 'Creation Failed',
        message: err?.message || 'Failed to create academic term. Please try again.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteTerm = (term: any) => {
    setAlertConfig({
      visible: true,
      title: 'Delete Academic Term',
      message: `Are you sure you want to delete "${term.term_name}" (Academic Year: ${term.academic_year})?\n\nAssociated fee structures and uncollected fee schedules for this term will also be removed.`,
      type: 'warning',
      buttons: [
        {
          text: 'Cancel',
          style: 'secondary',
          onPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
        },
        {
          text: 'Delete Term',
          style: 'destructive',
          onPress: async () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            try {
              setDeletingId(term.id);
              await deleteTerm(term.id);
              setAlertConfig({
                visible: true,
                title: 'Term Deleted',
                message: `Academic term "${term.term_name}" has been deleted successfully.`,
                type: 'success',
              });
            } catch (err: any) {
              setAlertConfig({
                visible: true,
                title: 'Cannot Delete Term',
                message: err?.message || 'Failed to delete academic term.',
                type: 'error',
              });
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    });
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
                  <TouchableOpacity
                    style={styles.deleteTermBtn}
                    onPress={() => confirmDeleteTerm(term)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                    disabled={deletingId === term.id}
                    accessibilityLabel="Delete academic term"
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
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

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => setDatePickerConfig({ visible: true, type: 'start' })}
                  activeOpacity={0.7}
                >
                  <View style={styles.datePickerContent}>
                    <Calendar size={18} color={startDate ? theme.colors.primary : '#94A3B8'} {...({} as any)} />
                    <Text style={[styles.datePickerText, !startDate && styles.datePlaceholderText]}>
                      {startDate || 'YYYY-MM-DD'}
                    </Text>
                  </View>
                  {startDate ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setStartDate('');
                      }}
                      style={styles.dateClearBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={14} color="#94A3B8" {...({} as any)} />
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>End Date</Text>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => setDatePickerConfig({ visible: true, type: 'end' })}
                  activeOpacity={0.7}
                >
                  <View style={styles.datePickerContent}>
                    <Calendar size={18} color={endDate ? theme.colors.primary : '#94A3B8'} {...({} as any)} />
                    <Text style={[styles.datePickerText, !endDate && styles.datePlaceholderText]}>
                      {endDate || 'YYYY-MM-DD'}
                    </Text>
                  </View>
                  {endDate ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setEndDate('');
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

      {/* Calendar Date Picker Modal */}
      <CalendarModal
        visible={datePickerConfig.visible}
        onClose={() => setDatePickerConfig(prev => ({ ...prev, visible: false }))}
        onSelect={handleDateSelect}
        initialDate={datePickerConfig.type === 'start' ? startDate : endDate}
        title={datePickerConfig.type === 'start' ? 'Select Term Start Date' : 'Select Term End Date'}
      />

      {/* Continuation & Alert Modal */}
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
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
  deleteTermBtn: {
    marginLeft: 10,
    padding: 8,
    borderRadius: theme.borderRadius.m,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
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
