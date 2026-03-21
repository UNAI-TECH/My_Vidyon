import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useFacultyDashboard } from '../../../../src/hooks/useFacultyDashboard';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  CheckCircle2, 
  Circle, 
  Download, 
  ExternalLink, 
  MessageSquare, 
  Clock, 
  AlertCircle,
  Check,
  X,
  ChevronRight
} from 'lucide-react-native';
import { format } from 'date-fns';

export default function AssignmentDetails() {
  const { id } = useLocalSearchParams();
  const { user, institutionId, institutionUuid } = useAuth();
  const router = useRouter();
  const { 
    myAssignments, 
    fetchSubmissions, 
    fetchClassStudents, 
    verifySubmission,
    isLoadingMyAssignments
  } = useFacultyDashboard(user?.id, (institutionUuid || institutionId) || undefined);

  const [assignment, setAssignment] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Verification Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [verificationModal, setVerificationModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationData, setVerificationData] = useState({
    marks: '',
    feedback: '',
    status: 'verified' as 'verified' | 'rejected'
  });

  const openVerificationModal = (submission: any, intent: 'verified' | 'rejected') => {
    setSelectedSubmission(submission);
    setVerificationData({
      marks: intent === 'verified' ? assignment.total_marks.toString() : '',
      feedback: '',
      status: intent
    });
    setVerificationModal(true);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Find assignment details from the hook's cached data or re-fetch
      const currentAssignment = myAssignments.find((a: any) => a.id === id);
      if (!currentAssignment) {
        // If not in cache, fallback logic could go here, but usually it's in cache
        console.warn('Assignment not found in cache');
      }
      setAssignment(currentAssignment);

      if (currentAssignment) {
        // 2. Fetch all students in this class/section
        const classStudents = await fetchClassStudents(currentAssignment.classes?.name, currentAssignment.section);
        setStudents(classStudents || []);

        // 3. Fetch submissions for this assignment
        const assignmentSubmissions = await fetchSubmissions(id as string);
        setSubmissions(assignmentSubmissions || []);
      }
    } catch (error) {
      console.error('Error loading assignment details:', error);
      Alert.alert('Error', 'Failed to load assignment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id, myAssignments]);

  const handleVerify = async () => {
    if (!selectedSubmission) return;

    try {
      setVerifying(true);
      await verifySubmission(selectedSubmission.id, {
        status: verificationData.status,
        grade: parseInt(verificationData.marks) || 0,
        feedback: verificationData.feedback
      });
      
      Alert.alert('Success', `Submission ${verificationData.status === 'verified' ? 'verified' : 'rejected'} successfully`);
      setVerificationModal(false);
      loadData(); // Refresh
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify submission');
    } finally {
      setVerifying(false);
    }
  };

  if (loading || isLoadingMyAssignments) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.center}>
        <Text>Assignment not found</Text>
      </View>
    );
  }

  // Categorization
  const submittedStudents = students.filter(student => 
    submissions.some(sub => sub.student_id === student.id)
  ).map(student => {
    const submission = submissions.find(sub => sub.student_id === student.id);
    return { ...student, submission };
  });

  const pendingStudents = students.filter(student => 
    !submissions.some(sub => sub.student_id === student.id)
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader 
          title={assignment.title} 
          subtitle={`${assignment.subjects?.name || 'Subject'} • ${assignment.classes?.name || 'Class'} - ${assignment.section}`} 
        />

        <View style={styles.assignmentInfo}>
          <View style={styles.infoRow}>
            <Clock size={16} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.infoText}>
              Due: {assignment.due_date ? format(new Date(assignment.due_date), 'PPP') : 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <CheckCircle2 size={16} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.infoText}>{assignment.total_marks || 0} Total Marks</Text>
          </View>
        </View>

        <View style={styles.statsOverview}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{submittedStudents.length}</Text>
            <Text style={styles.statLabel}>Submitted</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{pendingStudents.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Submitted List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Submitted ({submittedStudents.length})</Text>
          {submittedStudents.map((item: any) => (
            <View key={item.id} style={styles.studentCard}>
              <View style={styles.studentInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.full_name?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{item.full_name}</Text>
                  <Text style={styles.rollNo}>Roll No: {item.roll_no || 'N/A'}</Text>
                </View>
                <View style={[
                  styles.statusBadge, 
                  (item.submission.status || 'pending') === 'verified' ? styles.verifiedBadge : 
                  (item.submission.status || 'pending') === 'rejected' ? styles.rejectedBadge : styles.pendingBadge
                ]}>
                  <Text style={[
                     styles.statusText,
                     (item.submission.status || 'pending') === 'verified' ? styles.verifiedText : 
                     (item.submission.status || 'pending') === 'rejected' ? styles.rejectedText : styles.pendingText
                  ]}>
                    {(item.submission.status || 'pending').toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.submissionMeta}>
                <Text style={styles.submittedAt}>
                  Submitted: {item.submission.created_at ? format(new Date(item.submission.created_at), 'MMM d, h:mm a') : 'N/A'}
                </Text>
                {item.submission.file_path ? (
                  <TouchableOpacity 
                    style={styles.attachmentBtn}
                    onPress={() => Linking.openURL(item.submission.file_path)}
                  >
                    <Download size={14} color={theme.colors.primary} {...({} as any)} />
                    <Text style={styles.attachmentText}>View Document</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.attachmentBtn, { opacity: 0.5 }]}>
                    <AlertCircle size={14} color="#94A3B8" {...({} as any)} />
                    <Text style={[styles.attachmentText, { color: '#94A3B8' }]}>No File Attached</Text>
                  </View>
                )}
              </View>

              {['submitted', 'resubmitted', 'pending'].includes(item.submission.status?.toLowerCase() || 'pending') ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { flex: 1, marginTop: 0 }]}
                    onPress={() => openVerificationModal(item.submission, 'verified')}
                  >
                    <CheckCircle2 size={16} color="white" {...({} as any)} />
                    <Text style={styles.actionBtnText}>Verify</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, { flex: 1, marginTop: 0, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }]}
                    onPress={() => openVerificationModal(item.submission, 'rejected')}
                  >
                    <MessageSquare size={16} color="#DC2626" {...({} as any)} />
                    <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Resend</Text>
                  </TouchableOpacity>
                </View>
              ) : item.submission.status === 'verified' ? (
                <View style={styles.finalizedInfo}>
                  <View style={styles.gradeBox}>
                    <Text style={styles.gradeLabel}>Grade:</Text>
                    <Text style={styles.gradeValue}>{item.submission.grade}/{assignment.total_marks}</Text>
                  </View>
                  {item.submission.feedback && (
                    <Text style={styles.feedbackText} numberOfLines={1}>"{item.submission.feedback}"</Text>
                  )}
                  <View style={styles.verifiedTag}>
                    <Check size={12} color="#059669" {...({} as any)} />
                    <Text style={styles.verifiedTagText}>Finalized</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.finalizedInfo, { backgroundColor: '#FEF2F2', paddingHorizontal: 12, borderRadius: 12, borderTopWidth: 0 }]}>
                    <AlertCircle size={14} color="#DC2626" {...({} as any)} />
                    <Text style={[styles.feedbackText, { color: '#DC2626', fontWeight: '500' }]}>
                      Returned for Rework: "{item.submission.feedback}"
                    </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Not Submitted List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Not Submitted ({pendingStudents.length})</Text>
          {pendingStudents.map((student: any) => (
            <View key={student.id} style={[styles.studentCard, { opacity: 0.7 }]}>
              <View style={styles.studentInfo}>
                <View style={[styles.avatar, { backgroundColor: '#F1F5F9' }]}>
                  <Text style={[styles.avatarText, { color: '#64748B' }]}>{student.full_name?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{student.full_name}</Text>
                  <Text style={styles.rollNo}>Roll No: {student.roll_no || 'N/A'}</Text>
                </View>
                <View style={styles.missingBadge}>
                  <Clock size={12} color="#94A3B8" {...({} as any)} />
                  <Text style={styles.missingText}>PENDING</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Verification Modal */}
      <Modal
        visible={verificationModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setVerificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Submission</Text>
              <TouchableOpacity onPress={() => setVerificationModal(false)}>
                <X size={24} color={theme.colors.text} {...({} as any)} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {verificationData.status === 'verified' ? (
                <>
                  <Text style={styles.label}>Award Marks</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={verificationData.marks}
                    onChangeText={(text) => setVerificationData({...verificationData, marks: text})}
                    placeholder={`Max ${assignment.total_marks}`}
                  />
                  <Text style={styles.label}>Feedback (Optional)</Text>
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    multiline
                    value={verificationData.feedback}
                    onChangeText={(text) => setVerificationData({...verificationData, feedback: text})}
                    placeholder="Good work..."
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>Changes to be done (Feedback)</Text>
                  <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    multiline
                    value={verificationData.feedback}
                    onChangeText={(text) => setVerificationData({...verificationData, feedback: text})}
                    placeholder="Explain what the student needs to fix to resubmit..."
                    autoFocus
                  />
                </>
              )}

              <TouchableOpacity 
                style={[styles.finalSubmitBtn, verifying && { opacity: 0.7 }]}
                onPress={handleVerify}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.finalSubmitText}>Final Submit</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.warningNote}>
                Note: Once finalized, this evaluation cannot be undone.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  assignmentInfo: { flexDirection: 'row', gap: 20, marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '500' },
  statsOverview: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: theme.colors.primary },
  statLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  studentCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 18 },
  studentName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  rollNo: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  pendingBadge: { backgroundColor: '#FEF3C7' },
  pendingText: { color: '#92400E' },
  verifiedBadge: { backgroundColor: '#D1FAE5' },
  verifiedText: { color: '#065F46' },
  rejectedBadge: { backgroundColor: '#FEE2E2' },
  rejectedText: { color: '#991B1B' },
  submissionMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  submittedAt: { fontSize: 12, color: theme.colors.textMuted },
  attachmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attachmentText: { fontSize: 12, color: theme.colors.primary, fontWeight: 'bold' },
  actionBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, padding: 12, marginTop: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  missingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  missingText: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold' },
  finalizedInfo: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F8FAFC', flexDirection: 'row', alignItems: 'center', gap: 12 },
  gradeBox: { backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', gap: 4 },
  gradeLabel: { fontSize: 11, color: theme.colors.textMuted },
  gradeValue: { fontSize: 11, fontWeight: 'bold', color: theme.colors.text },
  feedbackText: { flex: 1, fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic' },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedTagText: { fontSize: 11, color: '#059669', fontWeight: 'bold' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 28, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  modalBody: {},
  statusToggle: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  toggleBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  toggleBtnActive: { backgroundColor: '#059669', borderColor: '#059669' },
  toggleBtnRejected: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  toggleTextActive: { color: 'white' },
  toggleTextRejected: { color: 'white' },
  label: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 14, color: theme.colors.text },
  finalSubmitBtn: { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  finalSubmitText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  warningNote: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center', marginTop: 12 },
});
