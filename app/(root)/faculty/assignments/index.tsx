import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Plus, 
  FileEdit, 
  Send,
  Users,
  Clock,
  ChevronRight,
  ChevronDown,
  X,
  ClipboardList,
  BookOpen,
  Calendar
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { format } from 'date-fns';
import { useFacultyDashboard } from '../../../../src/hooks/useFacultyDashboard';
import { Trash2, Calendar as CalendarIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { CalendarModal } from '../../../../src/components/common/CalendarPicker';
import { AlertModal } from '../../../../src/components/common/AlertModal';

export default function FacultyAssignments() {
  const { user, institutionId, institutionUuid } = useAuth();
  const router = useRouter();
  const { 
    assignedSubjects, 
    deleteAssignment, 
    myAssignments: assignments = [], 
    isLoadingMyAssignments: isLoading, 
    refetchAssignments: refetch 
  } = useFacultyDashboard(user?.id, (institutionUuid || institutionId) || undefined);
  
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    subject_id: '',
    class_id: '',
    section: '',
    due_date: new Date().toISOString().split('T')[0],
    total_marks: '100',
  });

  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    buttons?: { text: string; style?: 'primary' | 'secondary' | 'destructive'; onPress: () => void }[];
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', buttons?: any[]) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      buttons
    });
  };

  // Fetching moved to hook

  const handleCreateAssignment = async () => {
    if (!formData.title || !formData.subject_id || !formData.class_id) {
      showAlert('Error', 'Please fill in all required fields', 'error');
      return;
    }

    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    if (!isUUID(formData.subject_id) || !isUUID(formData.class_id)) {
      showAlert('Data Error', 'One of the selected items has an invalid internal ID. Please select a valid subject/class.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find the selected subject/class names to fill required text columns
      const selected = assignedSubjects.find((s: any) => 
        s.subject_id === formData.subject_id && 
        s.class_id === formData.class_id && 
        s.section === formData.section
      );

      const payload = {
        institution_id: institutionUuid || institutionId,
        teacher_id: user?.id,
        created_by: user?.id,
        title: formData.title,
        description: formData.description,
        subject_id: formData.subject_id,
        class_id: formData.class_id,
        subject: selected?.subjects?.name || 'Unknown',
        class_name: selected?.classes?.name || 'Unknown',
        section: formData.section,
        due_date: formData.due_date,
        total_marks: parseInt(formData.total_marks),
      };

      const query = isEditing 
        ? (supabase.from('assignments') as any).update(payload).eq('id', editId as string).select()
        : (supabase.from('assignments') as any).insert(payload).select();

      console.log(`UI: Performing ${isEditing ? 'UPDATE' : 'INSERT'} on assignment:`, editId || 'NEW');
      const { data: affectedRows, error } = await query;

      if (error) {
        console.error('UI: Supabase write error:', error);
        throw error;
      }

      if (isEditing && (!affectedRows || affectedRows.length === 0)) {
        console.warn('UI: UPDATE executed but NO rows were affected. RLS likely blocking write.');
        showAlert('Warning', 'Assignment was not updated. You might not have permission to edit this record.', 'error');
        setIsSubmitting(false);
        return;
      }

      console.log('UI: Write successful, rows affected:', affectedRows?.length);

      showAlert('Success', `Assignment ${isEditing ? 'updated' : 'created'} successfully`, 'success');
      setShowCreateModal(false);
      setIsEditing(false);
      setEditId(null);
      setFormData({
        title: '',
        description: '',
        subject_id: '',
        class_id: '',
        section: '',
        due_date: new Date().toISOString().split('T')[0],
        total_marks: '100',
      });
      refetch();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      showAlert('Error', error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (assignment: any) => {
    console.log('UI: handleEdit called for assignment:', JSON.stringify(assignment, null, 2));
    setIsEditing(true);
    setEditId(assignment.id);
    console.log('UI: Setting form data for edit...', assignment.title);
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      subject_id: assignment.subject_id,
      class_id: assignment.class_id,
      section: assignment.section,
      due_date: assignment.due_date,
      total_marks: (assignment.total_marks || 100).toString(),
    });
    setShowCreateModal(true);
  };

  const handleDelete = (assignment: any) => {
    showAlert(
      'Delete Assignment',
      `Are you sure you want to delete "${assignment.title}"? All submissions will also be deleted.`,
      'warning',
      [
        { text: 'Cancel', style: 'secondary', onPress: () => {} },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('UI: Initiating deletion for:', assignment.id);
              const result = await deleteAssignment(assignment.id);
              console.log('UI: Delete operation result:', result);
              if (result) {
                showAlert('Success', 'Assignment and all its data deleted successfully', 'success');
                refetch();
              } else {
                console.warn('UI: Deletion returned false, possibly no rows affected');
                showAlert('Info', 'Assignment might already be deleted or permission denied', 'info');
              }
            } catch (error: any) {
              console.error('UI: Deletion error caught:', error);
              showAlert('Error', error.message || 'Failed to delete assignment', 'error');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="Assignment Control" subtitle="Create and manage class tasks" />

        <TouchableOpacity 
          style={styles.createBtn}
          onPress={() => {
            setIsEditing(false);
            setEditId(null);
            setFormData({
              title: '',
              description: '',
              subject_id: '',
              class_id: '',
              section: '',
              due_date: new Date().toISOString().split('T')[0],
              total_marks: '100',
            });
            setShowCreateModal(true);
          }}
        >
          <Plus size={20} color="white" {...({} as any)} />
          <Text style={styles.createBtnText}>Create New Assignment</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Assignments</Text>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : assignments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No assignments created yet.</Text>
            </View>
          ) : (
            assignments.map((assignment: any) => (
              <View key={assignment.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{assignment.title}</Text>
                    <Text style={styles.subjectSub}>
                      {assignment.subjects?.name} • {assignment.classes?.name} - {assignment.section}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                      style={styles.editIcon}
                      onPress={() => handleEdit(assignment)}
                    >
                      <FileEdit size={16} color={theme.colors.primary} {...({} as any)} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.editIcon, { backgroundColor: '#FEF2F2' }]}
                      onPress={() => handleDelete(assignment)}
                    >
                      <Trash2 size={16} color="#EF4444" {...({} as any)} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statBadge, { backgroundColor: '#F0F9FF' }]}>
                    <Users size={12} color="#0369A1" {...({} as any)} />
                    <Text style={[styles.statText, { color: '#0369A1' }]}>{assignment.submissionCount} Submissions</Text>
                  </View>
                  {assignment.pendingCount > 0 && (
                    <View style={[styles.statBadge, { backgroundColor: '#FEF2F2' }]}>
                      <ClipboardList size={12} color="#B91C1C" {...({} as any)} />
                      <Text style={[styles.statText, { color: '#B91C1C' }]}>{assignment.pendingCount} Pending</Text>
                    </View>
                  )}
                </View>

                <View style={styles.meta}>
                  <View style={styles.metaItem}>
                    <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.metaText}>
                      Due: {assignment.due_date ? format(new Date(assignment.due_date), 'MMM d, yyyy') : 'No due date'}
                    </Text>
                  </View>
                  <Text style={styles.marksText}>{assignment.total_marks} Marks</Text>
                </View>

                <TouchableOpacity 
                  style={styles.reviewBtn}
                  onPress={() => router.push(`/faculty/assignments/${assignment.id}`)}
                >
                  <Send size={14} color="white" {...({} as any)} />
                  <Text style={styles.reviewBtnText}>Review Submissions</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Assignment' : 'New Assignment'}</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color={theme.colors.text} {...({} as any)} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Assignment Title"
                value={formData.title}
                onChangeText={(text) => setFormData({...formData, title: text})}
              />

              <Text style={styles.inputLabel}>Select subject & Class</Text>
              <View style={styles.subjectsGrid}>
                {assignedSubjects.map((s: any, i: number) => (
                  <TouchableOpacity 
                    key={i} 
                    style={[
                      styles.subjectOption,
                      formData.subject_id === s.subject_id && formData.class_id === s.class_id && formData.section === s.section && styles.subjectOptionSelected
                    ]}
                    onPress={() => setFormData({
                      ...formData, 
                      subject_id: s.subject_id, 
                      class_id: s.class_id, 
                      section: s.section
                    })}
                  >
                    <Text style={[
                      styles.subjectOptionText,
                      formData.subject_id === s.subject_id && formData.class_id === s.class_id && formData.section === s.section && styles.subjectOptionTextSelected
                    ]}>
                      {s.subjects?.name} ({s.classes?.name}-{s.section})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Due Date</Text>
                  <TouchableOpacity 
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <CalendarIcon size={18} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.dateText}>
                      {format(new Date(formData.due_date), 'MMM d, yyyy')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Total Marks (max 100)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="100"
                    keyboardType="numeric"
                    value={formData.total_marks}
                    onChangeText={(text) => setFormData({...formData, total_marks: text})}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Instructions for students..."
                multiline
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
              />

              <TouchableOpacity 
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleCreateAssignment}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {isEditing ? 'Update Assignment' : 'Create Assignment'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Unified Calendar Picker for Due Date */}
      <CalendarModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(selectedDate: string) => {
          setFormData({ ...formData, due_date: selectedDate });
          setShowDatePicker(false);
        }}
        initialDate={formData.due_date}
      />

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  createBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 32 },
  createBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  subjectSub: { fontSize: 12, color: theme.colors.primary, marginTop: 2, fontWeight: '600' },
  editIcon: { padding: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statText: { fontSize: 11, fontWeight: 'bold' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: theme.colors.textMuted },
  marksText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.text },
  reviewBtn: { backgroundColor: '#1E293B', borderRadius: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  reviewBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 32, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
  
  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.7)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 36, 
    borderTopRightRadius: 36, 
    padding: 24, 
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: theme.colors.text,
    letterSpacing: -0.5
  },
  inputLabel: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: theme.colors.text, 
    marginBottom: 8, 
    marginTop: 16,
    marginLeft: 4
  },
  input: { 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0', 
    fontSize: 15, 
    color: theme.colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  row: { flexDirection: 'row', marginTop: 8 },
  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  subjectOption: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12, 
    backgroundColor: '#F1F5F9', 
    borderWidth: 1.5, 
    borderColor: 'transparent' 
  },
  subjectOptionSelected: { 
    backgroundColor: theme.colors.primary + '15', 
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  subjectOptionText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  subjectOptionTextSelected: { color: theme.colors.primary, fontWeight: '800' },
  submitBtn: { 
    backgroundColor: theme.colors.primary, 
    borderRadius: 18, 
    padding: 20, 
    alignItems: 'center', 
    marginTop: 32, 
    marginBottom: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnText: { color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  
  dateInput: { 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0', 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  dateText: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
});
