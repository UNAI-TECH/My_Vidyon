import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { 
  Upload, 
  Users, 
  CheckCircle, 
  ChevronLeft,
  FileText,
  ChevronDown,
  X
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useFacultyDashboard } from '../../../../src/hooks/useFacultyDashboard';
import { useQuery } from '@tanstack/react-query';
import { Modal } from 'react-native';
import { useThemedAlert } from '../../../../src/components/common/ThemedAlert';

export default function FacultyCertificateUpload() {
  const { user, institutionId } = useAuth();
  const router = useRouter();
  const { facultyProfile, assignedSubjects } = useFacultyDashboard(user?.id, institutionId || undefined);

  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  const [showStudentPicker, setShowStudentPicker] = React.useState(false);
  const [category, setCategory] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [pickedFile, setPickedFile] = React.useState<any>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const { showAlert } = useThemedAlert();

  // Fetch students for classes where faculty is the class teacher
  const { data: students = [], isLoading: isLoadingStudents } = useQuery<any[]>({
    queryKey: ['class-teacher-students', user?.id],
    queryFn: async () => {
      if (!user?.id || !institutionId) return [];
      
      // 1. Get classes where faculty is class teacher
      const { data: classRows } = await supabase
        .from('classes')
        .select('name')
        .eq('class_teacher_id', user.id)
        .eq('institution_id', institutionId);
        
      if (!classRows || classRows.length === 0) return [];
      
      // 2. Get students for those classes
      const classNames = (classRows || []).map((c: any) => c.name);
      const { data: studentList, error } = await supabase
        .from('students')
        .select('*')
        .in('class_name', classNames)
        .eq('institution_id', institutionId as string)
        .order('name');
        
      if (error) throw error;
      return studentList || [];
    },
    enabled: !!user?.id && !!institutionId,
  });

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPickedFile(result.assets[0]);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const handleUpload = async () => {
    if (!selectedStudent || !category || !pickedFile) {
      showAlert({ title: 'Missing Fields', message: 'Please fill all required fields and pick a file', type: 'warning' });
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload to Supabase Storage
      const fileExt = pickedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `certificates/${selectedStudent.id}/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? pickedFile.uri.replace('file://', '') : pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.mimeType || 'application/octet-stream',
      } as any);

      const { error: storageError } = await supabase.storage
        .from('certificates')
        .upload(filePath, formData as any);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

      // 2. Insert into certificates table
      const { error: dbError } = await (supabase.from('certificates') as any).insert({
        student_id: selectedStudent.id,
        student_email: selectedStudent.email,
        student_name: selectedStudent.name,
        faculty_id: user?.id,
        faculty_name: facultyProfile?.full_name,
        institution_id: institutionId,
        category: category,
        course_description: description,
        file_url: publicUrl,
        file_name: pickedFile.name,
        file_size: pickedFile.size,
        file_type: pickedFile.mimeType,
        class_name: selectedStudent.class_name,
        section: selectedStudent.section,
        uploaded_by: facultyProfile?.full_name,
      });

      if (dbError) throw dbError;

      showAlert({ title: 'Success', message: 'Certificate uploaded successfully', type: 'success' });
      router.back();
    } catch (error: any) {
      console.error('Upload error:', error);
      showAlert({ title: 'Upload Failed', message: error.message, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title="Upload Certificate" 
        subtitle="Issue certificates to students"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        }
      />

      <View style={styles.form}>
        <Text style={styles.label}>Select Student *</Text>
        <TouchableOpacity 
          style={styles.pickerTrigger} 
          onPress={() => setShowStudentPicker(true)}
        >
          <View style={styles.pickerContent}>
            {selectedStudent ? (
              <View>
                <Text style={styles.selectedName}>{selectedStudent.name}</Text>
                <Text style={styles.selectedInfo}>{selectedStudent.class_name} - {selectedStudent.section}</Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>Choose a student from your class...</Text>
            )}
          </View>
          <ChevronDown size={20} color={theme.colors.textMuted} {...({} as any)} />
        </TouchableOpacity>

        <Modal visible={showStudentPicker} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Student</Text>
                <TouchableOpacity onPress={() => setShowStudentPicker(false)}>
                  <X size={24} color={theme.colors.text} {...({} as any)} />
                </TouchableOpacity>
              </View>
              
              {isLoadingStudents ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
              ) : students.length === 0 ? (
                <View style={styles.emptyState}>
                  <Users size={48} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.emptyText}>No students found in your managed classes</Text>
                </View>
              ) : (
                <ScrollView style={styles.studentList}>
                  {students.map((s) => (
                    <TouchableOpacity 
                      key={s.id} 
                      style={[
                        styles.studentItem,
                        selectedStudent?.id === s.id && styles.activeStudentItem
                      ]}
                      onPress={() => {
                        setSelectedStudent(s);
                        setShowStudentPicker(false);
                      }}
                    >
                      <View style={styles.studentItemMain}>
                        <Text style={[
                          styles.studentItemName,
                          selectedStudent?.id === s.id && styles.activeStudentText
                        ]}>{s.name}</Text>
                        <Text style={styles.studentItemMeta}>{s.class_name} - {s.section} • {s.register_number}</Text>
                      </View>
                      {selectedStudent?.id === s.id && (
                        <CheckCircle size={20} color={theme.colors.primary} {...({} as any)} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <Text style={styles.label}>Category / Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Excellence in Arts, Sports Meet 2024"
          value={category}
          onChangeText={setCategory}
        />

        <Text style={styles.label}>Short Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter details about the achievement..."
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity 
          style={styles.filePicker} 
          onPress={handlePickDocument}
          activeOpacity={0.6}
        >
          <View style={styles.filePickerIcon}>
            <Upload size={24} color={theme.colors.primary} {...({} as any)} />
          </View>
          <View style={styles.filePickerContent}>
            <Text style={styles.filePickerText}>
              {pickedFile ? pickedFile.name : 'Select Certificate File'}
            </Text>
            {!pickedFile && (
              <Text style={styles.filePickerSubtext}>Supports PDF, JPEG, PNG</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.uploadBtn, (isUploading || !selectedStudent) && styles.disabledBtn]} 
          onPress={handleUpload}
          disabled={isUploading || !selectedStudent}
        >
          {isUploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <CheckCircle size={20} color="white" {...({} as any)} />
              <Text style={styles.uploadBtnText}>Issue Certificate</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  form: { gap: 16, marginTop: 8 },
  label: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 },
  backBtn: { marginRight: 4, marginLeft: -4 },
  
  // Picker Styles
  pickerTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 74 },
  pickerContent: { flex: 1 },
  placeholderContainer: { flexDirection: 'row', alignItems: 'center', paddingLeft: 4 },
  placeholderText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '500' },
  selectedStudentContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarSmallText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 16 },
  selectedName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  selectedInfo: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%', padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalHeaderTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  modalCloseBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 12 },
  studentList: { marginBottom: 10 },
  studentItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  activeStudentItem: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  avatarList: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarListText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 18 },
  studentItemMain: { flex: 1 },
  studentItemName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  activeStudentText: { color: 'white' },
  studentItemMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  checkBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  loadingStudents: { padding: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 },
  emptyText: { color: theme.colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  
  // Input Tweaks
  input: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, color: theme.colors.text },
  textArea: { height: 120, textAlignVertical: 'top' },
  
  // File Picker Tweaks
  filePicker: { flexDirection: 'row', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: theme.colors.primary + '30', borderRadius: 20, padding: 20, backgroundColor: theme.colors.primary + '03', gap: 16 },
  filePickerIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  filePickerContent: { flex: 1 },
  filePickerText: { fontSize: 15, color: theme.colors.text, fontWeight: '600' },
  filePickerSubtext: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  uploadBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  uploadBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  disabledBtn: { opacity: 0.6 },
});
