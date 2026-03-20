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
import { useRouter } from 'expo-router';

export default function FacultyAssignments() {
  const { user, institutionId } = useAuth();
  const router = useRouter();
  const { assignedSubjects } = useFacultyDashboard(user?.id, institutionId || undefined);
  
  const [showCreateModal, setShowCreateModal] = React.useState(false);
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

  // Fetch assignments with submission counts
  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ['faculty-assignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: assignmentsData, error } = await supabase
        .from('assignments')
        .select(`
          *,
          subjects:subject_id(name),
          classes:class_id(name),
          submissions(id, status)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (assignmentsData as any[]).map(assignment => ({
        ...assignment,
        submissionCount: assignment.submissions?.length || 0,
        pendingCount: assignment.submissions?.filter((s: any) => s.status === 'pending').length || 0
      }));
    },
    enabled: !!user?.id,
  });

  const handleCreateAssignment = async () => {
    if (!formData.title || !formData.subject_id || !formData.class_id) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('assignments')
        .insert({
          institution_id: institutionId,
          teacher_id: user?.id,
          title: formData.title,
          description: formData.description,
          subject_id: formData.subject_id,
          class_id: formData.class_id,
          section: formData.section,
          due_date: formData.due_date,
          total_marks: parseInt(formData.total_marks),
        } as any);

      if (error) throw error;

      Alert.alert('Success', 'Assignment created successfully');
      setShowCreateModal(false);
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
      Alert.alert('Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="Assignment Control" subtitle="Create and manage class tasks" />

        <TouchableOpacity 
          style={styles.createBtn}
          onPress={() => setShowCreateModal(true)}
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
                  <TouchableOpacity style={styles.editIcon}>
                    <FileEdit size={16} color={theme.colors.primary} {...({} as any)} />
                  </TouchableOpacity>
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
                  onPress={() => router.push(`/(root)/faculty/assignments/${assignment.id}`)}
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
              <Text style={styles.modalTitle}>New Assignment</Text>
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
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={formData.due_date}
                    onChangeText={(text) => setFormData({...formData, due_date: text})}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Total Marks</Text>
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
                  <Text style={styles.submitBtnText}>Create Assignment</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 14, color: theme.colors.text },
  row: { flexDirection: 'row', marginTop: 8 },
  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  subjectOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: 'transparent' },
  subjectOptionSelected: { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary },
  subjectOptionText: { fontSize: 12, color: theme.colors.textMuted },
  subjectOptionTextSelected: { color: theme.colors.primary, fontWeight: 'bold' },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 32, marginBottom: 16 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
