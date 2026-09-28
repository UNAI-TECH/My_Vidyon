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
  User, 
  ChevronLeft,
  AlertCircle,
  Save,
  Send,
  X,
  CheckCircle as CheckCircleIcon,
} from 'lucide-react-native';
import { Modal } from 'react-native';

export default function ExamGrading() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const [marks, setMarks] = React.useState<Record<string, { internal: string, external: string, remarks: string }>>({});
  const [maxMarks, setMaxMarks] = React.useState('100');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);

  // Status Modal State
  const [modalVisible, setModalVisible] = React.useState(false);
  const [modalType, setModalType] = React.useState<'success' | 'error' | 'confirm'>('success');
  const [modalTitle, setModalTitle] = React.useState('');
  const [modalMsg, setModalMsg] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);

  const showStatus = (type: 'success' | 'error', title: string, msg: string) => {
    setModalType(type);
    setModalTitle(title);
    setModalMsg(msg);
    setPendingAction(null);
    setModalVisible(true);
  };

  const showConfirm = (title: string, msg: string, onConfirm: () => void) => {
    setModalType('confirm');
    setModalTitle(title);
    setModalMsg(msg);
    setPendingAction(() => onConfirm);
    setModalVisible(true);
  };

  // Fetch exam schedule details
  const { data: exam, isLoading: isLoadingExam } = useQuery<any>({
    queryKey: ['faculty-exam-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_schedules')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  // Fetch Class Name separately (since TEXT class_id cannot be joined directly in query)
  const { data: classData } = useQuery({
    queryKey: ['faculty-exam-class', exam?.class_id],
    queryFn: async () => {
      if (!exam?.class_id) return null;
      // If it's a UUID, look it up. If not, it's likely already a name.
      if (!isUUID(exam.class_id)) return { name: exam.class_id };
      
      const { data, error } = await supabase
        .from('classes')
        .select('name')
        .eq('id', exam.class_id)
        .single();
      if (error) return { name: exam.class_id };
      return data;
    },
    enabled: !!exam?.class_id,
  });

  // Fetch subjects assigned to this faculty for this class
  const { data: facultySubjects = [] } = useQuery<any[]>({
    queryKey: ['faculty-exam-subjects', user?.id, exam?.class_id, exam?.section],
    queryFn: async () => {
      if (!user?.id || !exam) return [];
      const { data, error } = await supabase
        .from('faculty_subjects')
        .select('*, subjects:subject_id(name)')
        .eq('faculty_profile_id', user.id)
        .eq('class_id', exam.class_id)
        .eq('section', exam.section);
      if (error) throw error;
      // Filter out placeholders like SS1212 and ensure subjects join worked
      return (data || []).filter((fs: any) => fs.subject_id && isUUID(fs.subject_id) && fs.subjects);
    },
    enabled: !!exam && !!user?.id,
  });

  const isClassTeacher = React.useMemo(() => {
    return facultySubjects.some(fs => fs.assignment_type === 'class_teacher');
  }, [facultySubjects]);

  const [selectedSubject, setSelectedSubject] = React.useState<any>(null);

  // Set default subject
  React.useEffect(() => {
    if (facultySubjects.length > 0 && !selectedSubject) {
      setSelectedSubject(facultySubjects[0]);
    }
  }, [facultySubjects]);

  // Fetch students and existing marks
  const { data: studentMarks = [], isLoading: isLoadingMarks, refetch } = useQuery<any[]>({
    queryKey: ['exam-student-marks', id, selectedSubject?.subject_id],
    queryFn: async () => {
      if (!id || !selectedSubject?.subject_id || !isUUID(selectedSubject.subject_id)) return [];
      
      // 1. Get all students in this class/section for THIS institution
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, name, register_number')
        .eq('institution_id', exam.institution_id)
        .eq('class_name', classData?.name || exam.class_id)
        .eq('section', exam.section)
        .order('name');
      
      if (studentError) {
        console.error("Error fetching students:", studentError);
        return [];
      }

      // 2. Get existing marks
      const { data: existingResults } = await supabase
        .from('exam_results')
        .select('*')
        .eq('exam_id', id)
        .eq('subject_id', selectedSubject.subject_id);

      const resultsMap = (existingResults || []).reduce((acc: any, res: any) => {
        acc[res.student_id] = res;
        return acc;
      }, {});

      // Initial state for marks
      const initialMarks: any = {};
      const mapped = (students || []).map((s: any) => {
        const res = resultsMap[s.id] || {};
        initialMarks[s.id] = {
          internal: res.internal_marks?.toString() || '',
          external: res.external_marks?.toString() || '',
          remarks: res.remarks || ''
        };
        return { ...s, existing: res };
      });
      
      setMarks(initialMarks);
      return mapped;
    },
    enabled: !!exam && !!selectedSubject?.subject_id && isUUID(selectedSubject.subject_id) && !!classData,
  });

  const isPublished = studentMarks.some(s => s.existing?.status === 'PUBLISHED');

  const updateMark = (studentId: string, field: 'internal' | 'external' | 'remarks', value: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }));
  };

  const handleSaveMarks = async () => {
    if (!selectedSubject || !exam) return;
    setIsSaving(true);
    try {
      const records = Object.entries(marks).map(([studentId, data]) => ({
        exam_id: id,
        student_id: studentId,
        subject_id: selectedSubject.subject_id,
        institution_id: exam.institution_id,
        internal_marks: parseFloat(data.internal) || 0,
        external_marks: parseFloat(data.external) || 0,
        total_marks: (parseFloat(data.internal) || 0) + (parseFloat(data.external) || 0),
        max_marks: parseFloat(maxMarks) || 100,
        remarks: data.remarks,
        staff_id: user?.id,
        class_id: exam.class_id,
        section: exam.section,
        status: 'DRAFT',
      })).filter(r => r.subject_id && r.subject_id.includes('-')); // Only subject_id remains strict UUID

      if (records.length === 0) {
        showStatus('error', 'No Valid Data', 'No students or valid subject found to save.');
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('exam_results')
        .upsert(records as any, { onConflict: 'exam_id,student_id,subject_id' });

      if (error) throw error;
      showStatus('success', 'Marks Saved', 'The grades have been stored as draft.');
      refetch();
    } catch (error: any) {
      console.error('Error saving marks:', error);
      showStatus('error', 'Save Failed', error.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const executePublish = async () => {
    if (!selectedSubject || !exam) return;
    setIsPublishing(true);
    setModalVisible(false);
    try {
      const { error } = await (supabase
        .from('exam_results') as any)
        .update({ status: 'PUBLISHED' })
        .eq('exam_id', id)
        .eq('subject_id', selectedSubject.subject_id);

      if (error) throw error;
      showStatus('success', 'Published!', 'Marks are now visible to students and parents.');
      refetch();
    } catch (error: any) {
      showStatus('error', 'Publish Failed', error.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishMarks = async () => {
    showConfirm(
      'Confirm Publishing',
      'Once published, students and parents can view these marks. Are you sure?',
      executePublish
    );
  };

  if (isLoadingExam) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader 
        title={exam?.exam_display_name || 'Grading'} 
        subtitle={`Class ${classData?.name || (exam?.class_id || 'Class')} - ${exam?.section || '?'}`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Subject Selector */}
        {facultySubjects.length > 1 && (
          <View style={styles.subjectSelector}>
            <Text style={styles.label}>Select Subject:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {facultySubjects.map((s: any, idx: number) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[
                    styles.chip, 
                    selectedSubject?.id === s.id && styles.activeChip
                  ]}
                  onPress={() => setSelectedSubject(s)}
                >
                  <Text style={[
                    styles.chipText,
                    selectedSubject?.id === s.id && styles.activeChipText
                  ]}>
                    {s.subjects?.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.configCard}>
          <Text style={styles.label}>Max Marks:</Text>
          <TextInput
            style={styles.configInput}
            keyboardType="numeric"
            value={maxMarks}
            onChangeText={setMaxMarks}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedSubject?.subjects?.name} Marks
            </Text>
            <View style={styles.headerActions}>
              {!isPublished && (
                <TouchableOpacity 
                  style={styles.saveBtn} 
                  onPress={handleSaveMarks}
                  disabled={isSaving}
                >
                  <Save size={16} color="white" {...({} as any)} />
                  <Text style={styles.saveBtnText}>{isSaving ? '...' : 'Save'}</Text>
                </TouchableOpacity>
              )}
              
              {!isPublished && (
                <TouchableOpacity 
                  style={[styles.saveBtn, { backgroundColor: '#166534' }]} 
                  onPress={handlePublishMarks}
                  disabled={isPublishing}
                >
                  <Send size={16} color="white" {...({} as any)} />
                  <Text style={styles.saveBtnText}>{isPublishing ? '...' : 'Publish'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isLoadingMarks ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : studentMarks.length === 0 ? (
            <Text style={styles.emptyText}>No students found.</Text>
          ) : (
            studentMarks.map((student: any) => (
              <View key={student.id} style={styles.studentCard}>
                <View style={styles.studentHeader}>
                  <View style={styles.studentInfo}>
                    <User size={16} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.regNo}>#{student.register_number}</Text>
                  </View>
                  {student.existing?.status === 'PUBLISHED' && (
                    <View style={styles.publishedBadge}>
                      <CheckCircleIcon size={10} color="#166534" {...({} as any)} />
                      <Text style={styles.publishedText}>Published</Text>
                    </View>
                  )}
                </View>

                <View style={styles.marksRow}>
                  <View style={styles.markInputGroup}>
                    <Text style={styles.inputLabel}>Internal</Text>
                    <TextInput
                      style={[styles.input, isPublished && styles.disabledInput]}
                      keyboardType="numeric"
                      value={marks[student.id]?.internal}
                      onChangeText={(v) => updateMark(student.id, 'internal', v)}
                      placeholder="0"
                      editable={!isPublished}
                    />
                  </View>
                  <View style={styles.markInputGroup}>
                    <Text style={styles.inputLabel}>External</Text>
                    <TextInput
                      style={[styles.input, isPublished && styles.disabledInput]}
                      keyboardType="numeric"
                      value={marks[student.id]?.external}
                      onChangeText={(v) => updateMark(student.id, 'external', v)}
                      placeholder="0"
                      editable={!isPublished}
                    />
                  </View>
                  <View style={styles.totalGroup}>
                    <Text style={styles.inputLabel}>Total</Text>
                    <View style={styles.totalValue}>
                      <Text style={styles.totalText}>
                        {(parseFloat(marks[student.id]?.internal) || 0) + (parseFloat(marks[student.id]?.external) || 0)}
                      </Text>
                    </View>
                  </View>
                </View>

                <TextInput
                  style={[styles.remarksInput, isPublished && styles.disabledInput]}
                  placeholder="Remarks..."
                  value={marks[student.id]?.remarks}
                  onChangeText={(v) => updateMark(student.id, 'remarks', v)}
                  editable={!isPublished}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* CUSTOM THEMED MODAL */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconWrap, { 
              backgroundColor: modalType === 'error' ? '#FEF2F2' : (modalType === 'confirm' ? '#FFFBEB' : '#F0FDF4') 
            }]}>
              {modalType === 'error' ? (
                <AlertCircle size={32} color="#EF4444" {...({} as any)} />
              ) : modalType === 'confirm' ? (
                <AlertCircle size={32} color="#F59E0B" {...({} as any)} />
              ) : (
                <CheckCircleIcon size={32} color="#10B981" {...({} as any)} />
              )}
            </View>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMsg}>{modalMsg}</Text>
            
            <View style={styles.modalActions}>
              {modalType === 'confirm' ? (
                <>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.cancelBtn]} 
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.confirmBtn]} 
                    onPress={() => pendingAction?.()}
                  >
                    <Text style={styles.confirmBtnText}>Yes, Publish</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  backBtn: { marginRight: 8 },
  subjectSelector: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textMuted, marginBottom: 10 },
  chipScroll: { flexDirection: 'row' },
  chip: { backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  activeChip: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  activeChipText: { color: 'white' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  headerActions: { flexDirection: 'row', gap: 8 },
  saveBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  saveBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  configCard: { backgroundColor: 'white', borderRadius: 16, padding: 12, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  configInput: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 6, borderWidth: 1, borderColor: '#E2E8F0', width: 60, textAlign: 'center', fontWeight: 'bold' },
  studentCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  studentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  studentName: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  regNo: { fontSize: 11, color: theme.colors.textMuted },
  marksRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  markInputGroup: { flex: 1 },
  totalGroup: { width: 60 },
  inputLabel: { fontSize: 10, color: theme.colors.textMuted, marginBottom: 6, fontWeight: 'bold' },
  input: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#E2E8F0', textAlign: 'center', fontSize: 14 },
  totalValue: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 8, height: 40, justifyContent: 'center', alignItems: 'center' },
  totalText: { fontWeight: 'bold', color: theme.colors.primary },
  remarksInput: { fontSize: 12, color: theme.colors.text, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  publishedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  publishedText: { fontSize: 10, fontWeight: '700', color: '#166534' },
  emptyText: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40 },
  section: { marginBottom: 32 },
  disabledInput: { backgroundColor: '#F1F5F9', color: theme.colors.textMuted },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  modalIconWrap: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8 },
  modalMsg: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F1F5F9' },
  confirmBtn: { backgroundColor: theme.colors.primary },
  cancelBtnText: { color: theme.colors.textMuted, fontWeight: '600' },
  confirmBtnText: { color: 'white', fontWeight: 'bold' }
});
