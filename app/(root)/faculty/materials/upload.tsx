import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { 
  Upload, 
  Book, 
  CheckCircle, 
  ChevronLeft,
  FileText,
  Save
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useFacultyDashboard } from '../../../../src/hooks/useFacultyDashboard';
import { AlertModal } from '../../../../src/components/common/AlertModal';

export default function FacultyMaterialsUpload() {
  const { user, institutionId, institutionUuid } = useAuth();
  const router = useRouter();
  const { assignedSubjects, uploadMaterial } = useFacultyDashboard(user?.id, (institutionUuid || institutionId) || undefined);

  const [selectedMapping, setSelectedMapping] = React.useState<any>(null);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [pickedFile, setPickedFile] = React.useState<any>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [alertConfig, setAlertConfig] = React.useState({
    visible: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

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

  const handleUpload = async () => {
    if (!selectedMapping || !title || !pickedFile) {
      setAlertConfig({
        visible: true,
        title: 'Required Fields',
        message: 'Please select a class/subject, enter a title, and pick a file.',
        type: 'warning'
      });
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload to Supabase Storage
      const fileExt = pickedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `materials/${selectedMapping.class_id}/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? pickedFile.uri.replace('file://', '') : pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.mimeType || 'application/octet-stream',
      } as any);

      const { error: storageError } = await supabase.storage
        .from('materials')
        .upload(filePath, formData as any);

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('materials')
        .getPublicUrl(filePath);

      // 2. Insert into subject_materials table using the validated hook method
      await uploadMaterial({
        institution_id: institutionUuid || institutionId,
        faculty_id: user?.id,
        subject_id: selectedMapping.subject_id,
        class_id: selectedMapping.class_id,
        section: selectedMapping.section,
        title: title,
        description: description,
        file_url: publicUrl,
        file_name: pickedFile.name,
        file_size: pickedFile.size,
        file_type: pickedFile.mimeType,
      });

      setAlertConfig({
        visible: true,
        title: 'Success',
        message: 'Study material uploaded successfully!',
        type: 'success'
      });
      setTimeout(() => router.back(), 2000);
    } catch (error: any) {
      console.error('Upload error:', error);
      setAlertConfig({
        visible: true,
        title: 'Upload Failed',
        message: error.message || 'There was an error uploading the material.',
        type: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title="Upload Materials" 
        subtitle="Share study materials with your classes"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        }
      />

      <View style={styles.form}>
        <Text style={styles.label}>Select Class & Subject *</Text>
        <View style={styles.mappingContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mappingList} contentContainerStyle={styles.mappingListContent}>
            {assignedSubjects.map((item: any) => (
              <TouchableOpacity 
                key={item.id} 
                style={[
                  styles.mappingCard, 
                  selectedMapping?.id === item.id && styles.selectedMapping
                ]}
                onPress={() => setSelectedMapping(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.mappingIcon, selectedMapping?.id === item.id && styles.selectedMappingIcon]}>
                  <Book size={20} color={selectedMapping?.id === item.id ? 'white' : theme.colors.primary} {...({} as any)} />
                </View>
                <View>
                  <Text style={[styles.mappingTitle, selectedMapping?.id === item.id && styles.selectedMappingText]} numberOfLines={1}>
                    {item.subjects?.name}
                  </Text>
                  <Text style={[styles.mappingSub, selectedMapping?.id === item.id && styles.selectedMappingText]} numberOfLines={1}>
                    {item.classes?.name} - {item.section}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Text style={styles.label}>Material Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Chapter 1 Notes, Practice Paper"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Briefly describe what this file contains..."
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>File *</Text>
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
              {pickedFile ? pickedFile.name : 'Select Study Material'}
            </Text>
            <Text style={styles.fileHint}>PDF, Docs, or Images supported</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.uploadBtn, (isUploading || !selectedMapping) && styles.disabledBtn]} 
          onPress={handleUpload}
          disabled={isUploading || !selectedMapping}
        >
          {isUploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Save size={20} color="white" {...({} as any)} />
              <Text style={styles.uploadBtnText}>Upload & Publish</Text>
            </>
          )}
        </TouchableOpacity>
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
  form: { gap: 18, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  
  mappingContainer: { marginHorizontal: -24 },
  mappingListContent: { paddingHorizontal: 24, paddingBottom: 4 },
  mappingList: { marginBottom: 4 },
  mappingCard: { backgroundColor: 'white', borderRadius: 24, padding: 18, marginRight: 14, borderWidth: 1, borderColor: '#F1F5F9', minWidth: 170, gap: 14, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  selectedMapping: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, elevation: 8, shadowColor: theme.colors.primary, shadowOpacity: 0.2, shadowRadius: 15 },
  mappingIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
  selectedMappingIcon: { backgroundColor: 'rgba(255,255,255,0.2)' },
  mappingTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  mappingSub: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  selectedMappingText: { color: 'white' },
  
  input: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, color: theme.colors.text },
  textArea: { height: 120, textAlignVertical: 'top' },
  
  filePicker: { flexDirection: 'row', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: theme.colors.primary + '30', borderRadius: 20, padding: 20, backgroundColor: theme.colors.primary + '03', gap: 16 },
  filePickerIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 5 },
  filePickerContent: { flex: 1 },
  filePickerText: { fontSize: 15, color: theme.colors.text, fontWeight: '600' },
  fileHint: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  
  uploadBtn: { backgroundColor: theme.colors.primary, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10, elevation: 4, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  uploadBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  disabledBtn: { opacity: 0.6, elevation: 0 },
  backBtn: { marginRight: 4, marginLeft: -4 },
});
