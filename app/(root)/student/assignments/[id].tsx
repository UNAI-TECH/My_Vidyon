import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { 
  Clock, 
  ChevronLeft,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import { useStudentDashboard } from '../../../../src/hooks/useStudentDashboard';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { uploadToSupabaseStorage } from '../../../../src/utils/fileUpload';

export default function StudentAssignmentDetails() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { studentProfile } = useStudentDashboard(
    user?.id,
    (user as any)?.user_metadata?.institution_id
  );
  
  const rawInstId = (user as any)?.user_metadata?.institution_id || studentProfile?.institution_id;
  const [pickedFile, setPickedFile] = React.useState<any>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [alertConfig, setAlertConfig] = React.useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });

  // Fetch assignment details
  const { data: assignment, isLoading: isLoadingAssignment, isError: isAssignmentError } = useQuery<any>({
    queryKey: ['student-assignment', id, rawInstId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*, subjects:subject_id(name)')
        .eq('id', id)
        .single();
      
      if (error) throw error;

      // Validate institution ownership to prevent cross-institution leakage
      if (data && rawInstId) {
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        let validInstIds: string[] = [rawInstId];
        try {
          const instQuery = supabase.from('institutions').select('id, institution_id');
          if (isUUID(rawInstId)) {
            instQuery.eq('id', rawInstId);
          } else {
            instQuery.eq('institution_id', rawInstId);
          }
          const { data: instData } = await (instQuery as any).maybeSingle();
          if (instData) {
            if (instData.id) validInstIds.push(instData.id);
            if (instData.institution_id) validInstIds.push(instData.institution_id);
          }
        } catch (_) {}

        const assignmentData = data as any;
        if (assignmentData?.institution_id && !validInstIds.includes(assignmentData.institution_id)) {
          throw new Error('Unauthorized: Assignment does not belong to your institution.');
        }
      }

      return data;
    },
    enabled: !!id,
  });

  const isPastDue = assignment?.due_date ? new Date() > new Date(assignment.due_date + 'T23:59:59') : false;

  // Fetch student's submission
  const { data: mySubmission, isLoading: isLoadingSubmission, refetch } = useQuery<any>({
    queryKey: ['student-submission', id, user?.id],
    queryFn: async () => {
      if (!id || !studentProfile?.id) return null;
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', id as string)
        .eq('student_id', studentProfile.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!studentProfile?.id,
  });

  const isPendingReview = mySubmission?.status === 'submitted';
  const isFinalized = mySubmission?.status === 'graded' || mySubmission?.status === 'verified';
  const canResubmit = !isPendingReview && !isFinalized;

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPickedFile(result.assets[0]);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const handleSubmit = async () => {
    if (!pickedFile || !studentProfile) {
      console.warn('Student: Submission blocked. PickedFile:', !!pickedFile, 'Profile:', !!studentProfile);
      return;
    }
    
    console.log('Student: Submit clicked. Auth UID:', user?.id);
    console.log('Student: Profile ID (student_id):', studentProfile.id);
    console.log('Student: Target Row to update:', mySubmission?.id);
    
    setIsUploading(true);
    if (!pickedFile) {
      setAlertConfig({
        visible: true,
        title: 'Selection Required',
        message: 'Please pick a file to submit',
        type: 'error'
      });
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload to Supabase Storage
      const fileExt = pickedFile.name.split('.').pop();
      const fileName = `${Date.now()}_submission_${studentProfile?.id}.${fileExt}`;
      const filePath = `submissions/${id}/${fileName}`;

      const { publicUrl } = await uploadToSupabaseStorage({
        bucket: 'assignments',
        path: filePath,
        uri: pickedFile.uri,
        mimeType: pickedFile.mimeType || 'application/octet-stream',
        upsert: true,
      });
      
      console.log('Student: Generated Public URL:', publicUrl);

      // 2. Upsert submission (Ensures only ONE row per student/assignment)
      // Delete old file if it exists (only if it's a resubmission)
      if (mySubmission && mySubmission.file_path) {
        const oldPath = mySubmission.file_path.split('/storage/v1/object/public/assignments/')[1];
        if (oldPath) {
          await supabase.storage.from('assignments').remove([decodeURIComponent(oldPath)]);
        }
      }

      const submissionData = {
        assignment_id: id as string,
        student_id: studentProfile?.id || user?.id,
        student_name: studentProfile?.name,
        file_path: publicUrl,
        file_name: pickedFile.name,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      };

      console.log('Student: Upserting submission data:', JSON.stringify(submissionData, null, 2));

      // Use upsert to handle both new and resubmissions in one call
      // We MUST include assignment_id and student_id to identify the record
      const { data: upsertedRow, error: dbError } = await (supabase.from('submissions') as any)
        .upsert(submissionData, { 
          onConflict: 'assignment_id,student_id',
          ignoreDuplicates: false 
        })
        .select('*');

      if (dbError) throw dbError;
      
      console.log('Student: DB UPSERT RESULT:', JSON.stringify(upsertedRow, null, 2));

      if (!upsertedRow || upsertedRow.length === 0) {
        throw new Error('Submission failed. Check your connection or permissions.');
      }

      setAlertConfig({
        visible: true,
        title: 'Success!',
        message: 'Assignment submitted successfully',
        type: 'success'
      });
      setPickedFile(null);
      await queryClient.invalidateQueries({ queryKey: ['student-submission', id, user?.id] });
      refetch();
    } catch (error: any) {
      console.error('[Student Assignment Submission Error]:', error);
      setAlertConfig({
        visible: true,
        title: 'Upload Failed',
        message: 'Something went wrong during submission. Please try again.',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoadingAssignment || isLoadingSubmission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isAssignmentError || !assignment) {
    return (
      <View style={styles.centered}>
        <AlertCircle size={48} color={theme.colors.textMuted} {...({} as any)} />
        <Text style={styles.emptyText}>Assignment not found or does not belong to your institution.</Text>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{ marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: theme.colors.primary, borderRadius: 12 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title={assignment.title} 
        subtitle={assignment.subjects?.name || 'Subject'}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        }
      />

      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Clock size={12} color={theme.colors.primary} {...({} as any)} />
            <Text style={styles.badgeText}>
              Due: {assignment.due_date ? format(new Date(assignment.due_date), 'MMM d, yyyy') : 'No deadline'}
            </Text>
          </View>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: isPastDue ? '#FEF2F2' : isFinalized ? '#F0FDF4' : mySubmission?.status === 'submitted' ? '#EFF6FF' : '#FFFBEB' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: isPastDue ? '#991B1B' : isFinalized ? '#166534' : mySubmission?.status === 'submitted' ? '#1E40AF' : '#92400E' }
            ]}>
              {isPastDue && !mySubmission ? 'EXPIRED' : (mySubmission?.status || 'Pending')}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>{assignment.description || 'No description provided.'}</Text>
      </View>

      {isFinalized && (
        <View style={styles.gradeCard}>
          <Text style={styles.gradeTitle}>Result & Feedback</Text>
          <View style={styles.gradeRow}>
            <Text style={styles.gradeLabel}>Grade:</Text>
            <Text style={styles.gradeValue}>{mySubmission.grade}/{assignment.total_marks || '100'}</Text>
          </View>
          {mySubmission.feedback && (
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackLabel}>Faculty Feedback:</Text>
              <Text style={styles.feedbackText}>{mySubmission.feedback}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {mySubmission ? 'Your Submission' : 'Submit Assignment'}
        </Text>
        
        {mySubmission && (
          <View style={styles.submissionBox}>
            <View style={styles.fileInfo}>
              <FileText size={20} color={theme.colors.primary} {...({} as any)} />
              <View style={styles.fileTextContent}>
                <Text style={styles.fileName}>{mySubmission.file_name}</Text>
                <Text style={styles.fileDate}>Submitted on {format(new Date(mySubmission.submitted_at), 'MMM d, hh:mm a')}</Text>
              </View>
            </View>
          </View>
        )}

        {isPastDue && !mySubmission ? (
          <View style={styles.expiredCard}>
            <AlertCircle size={24} color="#EF4444" {...({} as any)} />
            <Text style={styles.expiredText}>Due date has passed. Submissions are closed.</Text>
          </View>
        ) : isPendingReview ? (
          <View style={styles.pendingCard}>
            <Clock size={24} color="#3B82F6" {...({} as any)} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingText}>Awaiting Faculty Review</Text>
              <Text style={styles.pendingSubtext}>You cannot resubmit while your current work is being evaluated.</Text>
            </View>
          </View>
        ) : (isFinalized) ? (
          <View style={styles.successCard}>
            <CheckCircle size={24} color="#10B981" {...({} as any)} />
            <View style={{ flex: 1 }}>
              <Text style={styles.successText}>Assignment Finalized</Text>
              <Text style={styles.successSubtext}>Your work has been verified and graded. No further changes needed.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.uploadContainer}>
            <TouchableOpacity 
              style={[styles.filePicker, (isPastDue || !canResubmit) && styles.disabledPicker]} 
              onPress={handlePickDocument}
              disabled={isPastDue || !canResubmit}
            >
              <Upload size={24} color={isPastDue ? '#94A3B8' : theme.colors.primary} {...({} as any)} />
              <Text style={styles.filePickerText}>
                {pickedFile ? pickedFile.name : isPastDue ? 'Submissions Closed' : 'Pick a file to upload'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.submitBtn, (isUploading || !pickedFile || !canResubmit || (isPastDue && !mySubmission)) && styles.disabledBtn]} 
              onPress={handleSubmit}
              disabled={isUploading || !pickedFile || !canResubmit || (isPastDue && !mySubmission)}
            >
              {isUploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <CheckCircle size={20} color="white" {...({} as any)} />
                  <Text style={styles.submitBtnText}>
                    {mySubmission ? (isPastDue ? 'Late Submission' : 'Resubmit Assignment') : 'Submit Assignment'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {isPastDue && mySubmission && (
              <Text style={styles.lateNote}>Note: Any changes will be marked as late.</Text>
            )}
          </View>
        )}
      </View>
      
      <AlertModal 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary + '10', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  description: { fontSize: 14, color: theme.colors.text, lineHeight: 22 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  submissionBox: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  fileInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileTextContent: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  fileDate: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  uploadContainer: { gap: 16 },
  filePicker: { borderStyle: 'dashed', borderWidth: 2, borderColor: theme.colors.primary + '40', borderRadius: 16, padding: 24, alignItems: 'center', backgroundColor: 'white', gap: 8 },
  filePickerText: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '500' },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  disabledBtn: { opacity: 0.6 },
  gradeCard: { backgroundColor: '#F0FDF4', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#DCFCE7' },
  gradeTitle: { fontSize: 16, fontWeight: 'bold', color: '#166534', marginBottom: 12 },
  gradeRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  gradeLabel: { fontSize: 14, color: '#166534' },
  gradeValue: { fontSize: 18, fontWeight: 'bold', color: '#166534' },
  feedbackBox: { backgroundColor: 'white', borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: '#10B981' },
  feedbackLabel: { fontSize: 11, fontWeight: 'bold', color: theme.colors.textMuted, marginBottom: 4 },
  feedbackText: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  backBtn: { marginRight: 4, marginLeft: -4 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, marginTop: 12 },
  expiredCard: { backgroundColor: '#FEF2F2', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#FEE2E2' },
  expiredText: { color: '#B91C1C', fontSize: 14, fontWeight: '600', flex: 1 },
  pendingCard: { backgroundColor: '#EFF6FF', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#DBEAFE' },
  pendingText: { color: '#1E40AF', fontSize: 15, fontWeight: '700' },
  pendingSubtext: { color: '#1E40AF', fontSize: 12, marginTop: 2, opacity: 0.8 },
  disabledPicker: { opacity: 0.5, borderColor: '#CBD5E1' },
  successCard: { backgroundColor: '#F0FDF4', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#DCFCE7' },
  successText: { color: '#166534', fontSize: 15, fontWeight: '700' },
  successSubtext: { color: '#166534', fontSize: 12, marginTop: 2, opacity: 0.8 },
  lateNote: { fontSize: 12, color: '#B91C1C', textAlign: 'center', marginTop: -8, fontWeight: '500' },
});
