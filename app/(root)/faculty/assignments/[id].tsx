import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { 
  CheckCircle, 
  Clock, 
  User, 
  ChevronRight,
  FileText,
  AlertCircle,
  ChevronLeft
} from 'lucide-react-native';
import { format } from 'date-fns';

export default function AssignmentDetails() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const [gradingId, setGradingId] = React.useState<string | null>(null);
  const [gradeValue, setGradeValue] = React.useState('');
  const [feedback, setFeedback] = React.useState('');
  const [isGrading, setIsGrading] = React.useState(false);

  // Fetch assignment details
  const { data: assignment, isLoading: isLoadingAssignment } = useQuery<any>({
    queryKey: ['faculty-assignment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*, subjects:subject_id(name), classes:class_id(name)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch submissions
  const { data: submissions = [], isLoading: isLoadingSubmissions, refetch } = useQuery<any[]>({
    queryKey: ['faculty-assignment-submissions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('*, student:student_id(full_name, admissions(admission_number))')
        .eq('assignment_id', id)
        .order('submission_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const handleGradeSubmission = async (submissionId: string) => {
    if (!gradeValue) {
      Alert.alert('Error', 'Please enter a grade');
      return;
    }

    setIsGrading(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          grade: gradeValue,
          feedback: feedback,
          status: 'graded',
        } as any)
        .eq('id', submissionId);

      if (error) throw error;

      Alert.alert('Success', 'Submission graded successfully');
      setGradingId(null);
      setGradeValue('');
      setFeedback('');
      refetch();
    } catch (error: any) {
      console.error('Error grading submission:', error);
      Alert.alert('Error', error.message);
    } finally {
      setIsGrading(false);
    }
  };

  if (isLoadingAssignment) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.centered}>
        <AlertCircle size={48} color={theme.colors.textMuted} {...({} as any)} />
        <Text style={styles.emptyText}>Assignment not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title={assignment?.title || 'Assignment'} 
        subtitle={`${assignment?.subjects?.name || ''} • ${assignment?.classes?.name || ''} - ${assignment?.section || ''}`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        }
      />

      <View style={styles.assignmentInfo}>
        <View style={styles.infoRow}>
          <Clock size={16} color={theme.colors.textMuted} {...({} as any)} />
          <Text style={styles.infoText}>
            Due: {assignment?.due_date ? format(new Date(assignment.due_date), 'MMM d, yyyy') : 'No due date'}
          </Text>
        </View>
        <Text style={styles.description}>{assignment?.description}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Submissions ({submissions.length})</Text>
        
        {isLoadingSubmissions ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : submissions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No submissions yet.</Text>
          </View>
        ) : (
          submissions.map((sub: any) => (
            <View key={sub.id} style={styles.submissionCard}>
              <View style={styles.subHeader}>
                <View style={styles.studentInfo}>
                  <View style={styles.studentAvatar}>
                    <User size={20} color={theme.colors.primary} {...({} as any)} />
                  </View>
                  <View>
                    <Text style={styles.studentName}>{sub.student?.full_name || 'Student'}</Text>
                    <Text style={styles.admissionNum}>ID: {sub.student?.admissions?.admission_number || 'N/A'}</Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: sub.status === 'graded' ? '#F0FDF4' : '#FFFBEB' }
                ]}>
                  <Text style={[
                    styles.statusText, 
                    { color: sub.status === 'graded' ? '#166534' : '#92400E' }
                  ]}>
                    {sub.status === 'graded' ? 'Graded' : 'Pending'}
                  </Text>
                </View>
              </View>

              {sub.content && (
                <View style={styles.subContent}>
                  <FileText size={14} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.subContentText} numberOfLines={1}>{sub.content}</Text>
                </View>
              )}

              {gradingId === sub.id ? (
                <View style={styles.gradingForm}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Grade / Marks (Max: {assignment?.total_marks})</Text>
                      <TextInput
                        style={styles.gradeInput}
                        placeholder="Enter score"
                        value={gradeValue}
                        onChangeText={setGradeValue}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <Text style={styles.label}>Feedback</Text>
                  <TextInput
                    style={styles.feedbackInput}
                    placeholder="Add comments..."
                    multiline
                    value={feedback}
                    onChangeText={setFeedback}
                  />
                  <View style={styles.gradingActions}>
                    <TouchableOpacity 
                      style={styles.cancelBtn}
                      onPress={() => setGradingId(null)}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.saveBtn}
                      onPress={() => handleGradeSubmission(sub.id)}
                      disabled={isGrading}
                    >
                      {isGrading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.saveBtnText}>Submit Grade</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.subFooter}>
                  {sub.status === 'graded' ? (
                    <View style={styles.gradeDisplay}>
                      <Text style={styles.gradeLabel}>Grade: </Text>
                      <Text style={styles.gradeText}>{sub.grade}/{assignment?.total_marks}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.gradeBtn}
                      onPress={() => {
                        setGradingId(sub.id);
                        setGradeValue(sub.grade || '');
                        setFeedback(sub.feedback || '');
                      }}
                    >
                      <CheckCircle size={14} color="white" {...({} as any)} />
                      <Text style={styles.gradeBtnText}>Enter Grade</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  assignmentInfo: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#F1F5F9' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  infoText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600' },
  description: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  submissionCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary + '10', alignItems: 'center', justifyContent: 'center' },
  studentName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  admissionNum: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  subContent: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 12, marginBottom: 12 },
  subContentText: { fontSize: 12, color: theme.colors.textMuted, flex: 1 },
  subFooter: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, alignItems: 'flex-end' },
  gradeBtn: { backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  gradeBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  gradeDisplay: { flexDirection: 'row', alignItems: 'center' },
  gradeLabel: { fontSize: 13, color: theme.colors.textMuted },
  gradeText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary },
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 32, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
  
  // Grading Form
  gradingForm: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginTop: 12 },
  label: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted, marginBottom: 8 },
  gradeInput: { backgroundColor: 'white', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 14, marginBottom: 16 },
  feedbackInput: { backgroundColor: 'white', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 14, height: 80, textAlignVertical: 'top', marginBottom: 16 },
  gradingActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelBtnText: { color: theme.colors.textMuted, fontWeight: 'bold', fontSize: 13 },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  backBtn: { marginRight: 4, marginLeft: -4 },
  row: { flexDirection: 'row' },
});
