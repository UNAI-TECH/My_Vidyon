import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { 
  UserPlus, ArrowLeft, Save, Camera, Upload, Trash2,
  ChevronRight, ChevronLeft, ChevronDown, Copy, FileSpreadsheet, Download, Users, Plus, Search, CheckCircle, X
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CalendarModal } from '../../../../src/components/common/CalendarPicker';

type UserRole = 'student' | 'faculty' | 'accountant' | 'canteen_manager' | 'driver' | 'parent';

const ROLES: { id: UserRole; label: string; color: string }[] = [
  { id: 'student', label: 'Student', color: '#3B82F6' },
  { id: 'faculty', label: 'Faculty', color: '#A855F7' },
  { id: 'accountant', label: 'Finance', color: '#F59E0B' },
  { id: 'canteen_manager', label: 'Canteen', color: '#10B981' },
  { id: 'driver', label: 'Transport', color: '#EF4444' },
  { id: 'parent', label: 'Parent', color: '#6366F1' },
];

// ---- EMAIL GENERATION UTILITY ----
function sanitize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
}

function generateUniqueEmail(
  role: UserRole, firstName: string, lastName: string,
  institutionId: string, className?: string, section?: string,
  rollNumber?: string, staffId?: string
): string {
  const inst = sanitize(institutionId || 'inst');
  const first = sanitize(firstName || 'user');
  const last = sanitize(lastName || '');

  if (role === 'student') {
    const cls = sanitize(className || '');
    const sec = sanitize(section || '');
    const roll = sanitize(rollNumber || String(Math.floor(Math.random() * 999)));
    return `${first}.${last}.${cls}${sec}${roll}@${inst}.vidyon.app`;
  }
  const sid = sanitize(staffId || String(Date.now()).slice(-6));
  return `${first}.${last}.${sid}@${inst}.vidyon.app`;
}

export default function AddUserScreen() {
  const { institutionId } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [selectedRole, setSelectedRole] = useState<UserRole>((params.role as UserRole) || 'student');
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkResults, setBulkResults] = useState<any[] | null>(null);

  // Parent search
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [selectedParent, setSelectedParent] = useState<any>(null);
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  
  // Generic Modal States
  const [pickerConfig, setPickerConfig] = useState<{
    visible: boolean;
    title: string;
    options: { label: string; icon?: any; onPress: () => void; color?: string; bgColor?: string }[];
  } | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: { text: string; onPress: () => void; style?: 'default' | 'destructive' | 'cancel' }[];
  } | null>(null);

  const [showDOBPicker, setShowDOBPicker] = useState(false);


  const [form, setForm] = useState({
    firstName: '', lastName: '', dob: '', gender: 'male', bloodGroup: '',
    phone: '', address: '', city: '', zipCode: '',
    // Student specific
    admissionNumber: '', className: '', section: '', rollNumber: '', academicYear: '2026-27',
    parentName: '', parentRelation: 'Father', parentPhone: '', parentEmail: '',
    // Staff specific
    staffId: '', department: '',
  });

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      firstName: '', lastName: '', dob: '', gender: 'male', bloodGroup: '',
      phone: '', address: '', city: '', zipCode: '',
      admissionNumber: '', className: '', section: '', rollNumber: '', academicYear: '2026-27',
      parentName: '', parentRelation: 'Father', parentPhone: '', parentEmail: '',
      staffId: '', department: '',
    });
    setImage(null);
    setGeneratedEmail('');
  };

  // Fetch available classes from groups
  const { data: availableClasses = [] } = useQuery({
    queryKey: ['add-user-classes', institutionId],
    queryFn: async (): Promise<any[]> => {
      if (!institutionId) return [];
      const { data } = await supabase
        .from('groups')
        .select('id, name, classes(id, name, sections)')
        .eq('institution_id', institutionId);
      if (!data) return [];
      return data.flatMap((g: any) =>
        (g.classes || []).map((c: any) => ({
          id: c.id, name: c.name, sections: c.sections || []
        }))
      );
    },
    enabled: !!institutionId
  });

  // Search parents by email
  const { data: parentResults = [] } = useQuery({
    queryKey: ['parent-search', institutionId, parentSearchQuery],
    queryFn: async (): Promise<any[]> => {
      if (!institutionId || parentSearchQuery.length < 2) return [];
      const { data } = await (supabase
        .from('profiles') as any)
        .select('id, full_name, email, phone')
        .eq('institution_id', institutionId)
        .eq('role', 'parent')
        .ilike('email', `%${parentSearchQuery}%`)
        .limit(10);
      return data || [];
    },
    enabled: !!institutionId && parentSearchQuery.length >= 2
  });

  const handleSelectParent = useCallback((parent: any) => {
    setSelectedParent(parent);
    setForm(prev => ({
      ...prev,
      parentName: parent.full_name || '',
      parentEmail: parent.email || '',
      parentPhone: parent.phone || '',
    }));
    setParentSearchQuery(parent.email || '');
    setShowParentDropdown(false);
  }, []);

  const handleClearParent = useCallback(() => {
    setSelectedParent(null);
    setParentSearchQuery('');
    setForm(prev => ({ ...prev, parentName: '', parentEmail: '', parentPhone: '' }));
  }, []);

  const availableSections = useMemo(() => {
    const cls = availableClasses.find((c: any) => c.name === form.className);
    return cls ? cls.sections : [];
  }, [availableClasses, form.className]);

  // Auto-generate email when relevant fields change
  const autoEmail = useMemo(() => {
    if (!form.firstName) return '';
    return generateUniqueEmail(
      selectedRole, form.firstName, form.lastName,
      institutionId || '', form.className, form.section,
      form.rollNumber, form.staffId
    );
  }, [selectedRole, form.firstName, form.lastName, form.className, form.section, form.rollNumber, form.staffId, institutionId]);

  const copyEmail = async (email: string) => {
    await Clipboard.setStringAsync(email);
    setAlertConfig({
      visible: true,
      title: 'Copied!',
      message: `Email copied to clipboard:\n${email}`,
      buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }]
    });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setAlertConfig({
        visible: true,
        title: 'Permission Denied',
        message: 'Camera permission is required to take photos.',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }]
      });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // ---- SUBMIT (Single User) ----
  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName) {
      setAlertConfig({
        visible: true,
        title: 'Missing Info',
        message: 'First name and last name are required.',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }]
      });
      return;
    }
    if (selectedRole === 'student' && !form.className) {
      setAlertConfig({
        visible: true,
        title: 'Missing Info',
        message: 'Class is required for students.',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }]
      });
      return;
    }

    setIsLoading(true);
    const email = autoEmail;
    const password = institutionId || 'password123';
    const fullName = `${form.firstName} ${form.lastName}`;

    try {
      const body: any = {
        email,
        password,
        role: selectedRole,
        full_name: fullName,
        institution_id: institutionId,
        phone: form.phone || null,
        date_of_birth: form.dob || null,
        gender: form.gender,
        address: form.address || null,
        blood_group: form.bloodGroup || null,
        city: form.city || null,
        zip_code: form.zipCode || null,
      };

      if (selectedRole === 'student') {
        body.register_number = form.admissionNumber || `REG-${Date.now().toString(36).toUpperCase()}`;
        body.class_name = form.className;
        body.section = form.section;
        body.academic_year = form.academicYear;
        body.parent_name = form.parentName;
        body.parent_email = form.parentEmail || null;
        body.parent_phone = form.parentPhone || null;
        body.parent_relation = form.parentRelation;
        // Link to existing parent profile if selected
        if (selectedParent?.id) {
          body.parent_id = selectedParent.id;
        }
      } else if (selectedRole === 'parent') {
        // parent-specific fields would go here
      } else {
        body.staff_id = form.staffId || `STF-${Date.now().toString(36).toUpperCase()}`;
        body.department = form.department || null;
      }

      if (image) {
        try {
          const fileName = `user_${Date.now()}.jpg`;
          const formDataBlob = new FormData();
          formDataBlob.append('file', { uri: image, name: fileName, type: 'image/jpeg' } as any);
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('student-photos')
            .upload(fileName, formDataBlob);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('student-photos').getPublicUrl(fileName);
            body.image_url = publicUrl;
          }
        } catch (e) { console.warn('Photo upload failed:', e); }
      }

      const { data: responseData, error } = await supabase.functions.invoke('create-user', { body });
      if (error) throw error;
      if (responseData?.error) throw new Error(responseData.error);

      setGeneratedEmail(email);
      setAlertConfig({
        visible: true,
        title: '✅ User Created!',
        message: `${fullName} (${selectedRole})\n\nEmail: ${email}\nPassword: ${password}`,
        buttons: [
          { 
            text: 'Add Another', 
            onPress: () => {
              copyEmail(email);
              resetForm();
              setAlertConfig(null);
            } 
          },
          { 
            text: 'Done', 
            onPress: () => {
              setAlertConfig(null);
              router.back();
            } 
          }
        ]
      });
    } catch (error: any) {
      console.error('Create user error:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to create user',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ---- BULK UPLOAD ----
  const handleBulkUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const fileUri = result.assets[0].uri;
      // Read file using legacy FileSystem API
      const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: (FileSystem as any).EncodingType.Base64 });
      const wb = XLSX.read(fileContent, { type: 'base64' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        setAlertConfig({
          visible: true,
          title: 'Empty File',
          message: 'No data found in the file.',
          buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }]
        });
        return;
      }

      setAlertConfig({
        visible: true,
        title: 'Confirm Bulk Upload',
        message: `Found ${rows.length} records. Each user will be created via the auth system. Proceed?`,
        buttons: [
          { text: 'Cancel', onPress: () => setAlertConfig(null), style: 'cancel' },
          { text: `Create ${rows.length} Users`, onPress: () => { setAlertConfig(null); processBulkUpload(rows); } }
        ]
      });
    } catch (e: any) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: e.message || 'Failed to read file',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }]
      });
    }
  };

  const processBulkUpload = async (rows: any[]) => {
    setBulkProgress({ current: 0, total: rows.length });
    const results: any[] = [];
    const CHUNK = 3;

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const promises = chunk.map(async (row) => {
        const name = row.name || row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim();
        const role = (row.role || selectedRole).toLowerCase();
        const nameParts = name.split(' ');
        const email = row.email || generateUniqueEmail(
          role as UserRole, nameParts[0] || 'user', nameParts.slice(1).join('') || '',
          institutionId || '', row.class_name || row.class || '',
          row.section || '', row.register_number || row.roll_number || '',
          row.staff_id || ''
        );
        const password = row.password || institutionId || 'password123';

        try {
          const { data, error } = await supabase.functions.invoke('create-user', {
            body: {
              email, password,
              role: role === 'teacher' ? 'faculty' : role,
              full_name: name,
              institution_id: institutionId,
              register_number: row.register_number || row.roll_number,
              staff_id: row.staff_id,
              class_name: row.class_name || row.class,
              section: row.section,
              date_of_birth: row.dob || row.date_of_birth,
              gender: row.gender,
              parent_name: row.parent_name,
              parent_email: row.parent_email,
              parent_phone: row.parent_phone,
              phone: row.phone || row.mobile,
              academic_year: row.academic_year || '2026-27',
              address: row.address,
              blood_group: row.blood_group,
              city: row.city,
              zip_code: row.zip_code,
            }
          });
          if (error) throw error;
          return { name, email, password, status: 'success' };
        } catch (err: any) {
          return { name, email, password, status: 'error', message: err.message };
        }
      });

      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
      setBulkProgress({ current: Math.min(i + CHUNK, rows.length), total: rows.length });
    }

    setBulkProgress(null);
    setBulkResults(results);
    const successes = results.filter(r => r.status === 'success').length;
    setAlertConfig({
      visible: true,
      title: 'Bulk Upload Complete',
      message: `${successes}/${results.length} users created successfully. You can download the results with credentials.`,
      buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }]
    });
  };

  // ---- BULK DOWNLOAD / EXPORT ----
  const handleDownloadResults = async (data: any[]) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Credentials');
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      const fileUri = `${(FileSystem as any).cacheDirectory}user_credentials_${Date.now()}.xlsx`;
      await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: (FileSystem as any).EncodingType.Base64 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      } else {
        setAlertConfig({
          visible: true,
          title: 'Saved',
          message: `File saved to:\n${fileUri}`,
          buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }]
        });
      }
    } catch (e: any) {
      setAlertConfig({
        visible: true,
        title: 'Export Failed',
        message: e.message || 'Failed to export',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }]
      });
    }
  };

  const handleDownloadTemplate = async () => {
    const templateData = selectedRole === 'student' ? [
      { name: 'John Doe', register_number: 'STU001', class_name: 'Grade 10', section: 'A', dob: '2008-05-15', gender: 'male', parent_name: 'Richard Doe', parent_email: 'richard@example.com', parent_phone: '9876543210', phone: '', address: '', blood_group: '', academic_year: '2026-27' },
      { name: 'Sarah Smith', register_number: 'STU002', class_name: 'Grade 10', section: 'B', dob: '2008-06-20', gender: 'female', parent_name: 'Robert Smith', parent_email: 'robert@example.com', parent_phone: '1234567890', phone: '', address: '', blood_group: '', academic_year: '2026-27' },
    ] : [
      { name: 'Jane Smith', staff_id: 'TCH001', role: selectedRole, phone: '9876543210', dob: '1985-10-20', department: '' },
      { name: 'Mike Wilson', staff_id: 'TCH002', role: selectedRole, phone: '1234567890', dob: '1980-01-01', department: '' },
    ];
    await handleDownloadResults(templateData);
  };

  // ---- RENDER ----
  return (
    <View style={styles.container}>
      <PageHeader
        title="Add User"
        subtitle={`Create ${ROLES.find(r => r.id === selectedRole)?.label || 'User'} Account`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        }
      />

      {/* Role Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleBar} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {ROLES.map(role => (
          <TouchableOpacity
            key={role.id}
            style={[styles.roleChip, selectedRole === role.id && { backgroundColor: role.color }]}
            onPress={() => setSelectedRole(role.id)}
          >
            <Text style={[styles.roleChipText, selectedRole === role.id && { color: 'white' }]}>{role.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bulk Actions Bar */}
      <View style={styles.bulkBar}>
        <TouchableOpacity style={styles.bulkBtn} onPress={handleBulkUpload}>
          <Upload size={16} color={theme.colors.primary} {...({} as any)} />
          <Text style={styles.bulkBtnText}>Bulk Upload</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkBtn} onPress={handleDownloadTemplate}>
          <Download size={16} color={theme.colors.primary} {...({} as any)} />
          <Text style={styles.bulkBtnText}>Template</Text>
        </TouchableOpacity>
        {bulkResults && (
          <TouchableOpacity style={[styles.bulkBtn, { backgroundColor: '#10B98115' }]} onPress={() => handleDownloadResults(bulkResults)}>
            <FileSpreadsheet size={16} color="#10B981" {...({} as any)} />
            <Text style={[styles.bulkBtnText, { color: '#10B981' }]}>Export Results</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bulk Progress */}
      {bulkProgress && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }]} />
          <Text style={styles.progressText}>{bulkProgress.current}/{bulkProgress.total} users processed</Text>
        </View>
      )}

      {/* Auto Email Preview */}
      {autoEmail ? (
        <TouchableOpacity style={styles.emailPreview} onPress={() => copyEmail(autoEmail)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.emailLabel}>Auto-generated Email</Text>
            <Text style={styles.emailText}>{autoEmail}</Text>
          </View>
          <Copy size={18} color={theme.colors.primary} {...({} as any)} />
        </TouchableOpacity>
      ) : null}

      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
        <View style={styles.photoContainer}>
          <TouchableOpacity 
            style={styles.photoPicker} 
            onPress={() => setPickerConfig({
              visible: true,
              title: 'Upload Photo',
              options: [
                { label: 'Camera', icon: Camera, onPress: takePhoto, color: '#3B82F6', bgColor: '#EFF6FF' },
                { label: 'Gallery', icon: Upload, onPress: pickImage, color: '#8B5CF6', bgColor: '#F5F3FF' },
                ...(image ? [{ label: 'Remove', icon: Trash2, onPress: () => setImage(null), color: '#EF4444', bgColor: '#FEF2F2' }] : []),
              ]
            })}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Camera size={32} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.photoText}>Add Photo</Text>
              </View>
            )}
            <View style={styles.photoEditBadge}>
              <Plus size={16} color="white" {...({} as any)} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Personal Details - Common */}
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput style={styles.input} value={form.firstName} onChangeText={v => updateField('firstName', v)} placeholder="First Name" />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput style={styles.input} value={form.lastName} onChangeText={v => updateField('lastName', v)} placeholder="Last Name" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>DOB (YYYY-MM-DD)</Text>
            <TouchableOpacity 
              style={[styles.input, { justifyContent: 'center' }]} 
              onPress={() => setShowDOBPicker(true)}
            >
              <Text style={{ color: form.dob ? theme.colors.text : '#94A3B8' }}>
                {form.dob || 'Select Date'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={form.phone} onChangeText={v => updateField('phone', v)} keyboardType="phone-pad" placeholder="+91..." />
          </View>
        </View>

        {/* Student-specific */}
        {selectedRole === 'student' && (
          <>
            <Text style={styles.sectionTitle}>Academic Details</Text>
            <View style={styles.inputGroup}>
            <Text style={styles.label}>Class *</Text>
            <TouchableOpacity style={styles.select} onPress={() => {
              if (availableClasses.length === 0) {
                setAlertConfig({
                  visible: true,
                  title: 'No Classes',
                  message: 'No classes configured for this institution.',
                  buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }]
                });
                return;
              }
              setPickerConfig({
                visible: true,
                title: 'Select Class',
                options: availableClasses.map((c: any) => ({
                  label: c.name,
                  onPress: () => updateField('className', c.name)
                }))
              });
            }}>
                <Text style={[styles.selectText, !form.className && styles.placeholder]}>{form.className || 'Select Class'}</Text>
                <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Section</Text>
                <TouchableOpacity style={styles.select} onPress={() => {
                  if (availableSections.length === 0) {
                    setAlertConfig({
                      visible: true,
                      title: 'Info',
                      message: 'Select a class first.',
                      buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }]
                    });
                    return;
                  }
                  setPickerConfig({
                    visible: true,
                    title: 'Select Section',
                    options: availableSections.map((s: string) => ({
                      label: `Section ${s}`,
                      onPress: () => updateField('section', s)
                    }))
                  });
                }}>
                  <Text style={[styles.selectText, !form.section && styles.placeholder]}>{form.section || 'Section'}</Text>
                  <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
                </TouchableOpacity>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Roll Number</Text>
                <TextInput style={styles.input} value={form.rollNumber} onChangeText={v => updateField('rollNumber', v)} keyboardType="numeric" placeholder="12" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admission Number</Text>
              <TextInput style={styles.input} value={form.admissionNumber} onChangeText={v => updateField('admissionNumber', v)} placeholder="ADM/2026/001" />
            </View>

            <Text style={styles.sectionTitle}>Parent Details</Text>

            {/* Parent Search Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Link to Existing Parent (search by email)</Text>
              <View style={styles.searchWrapper}>
                <Search size={16} color={theme.colors.textMuted} {...({} as any)} />
                <TextInput
                  style={styles.searchInput}
                  value={parentSearchQuery}
                  onChangeText={(v) => {
                    setParentSearchQuery(v);
                    setShowParentDropdown(true);
                    if (!v) handleClearParent();
                  }}
                  onFocus={() => setShowParentDropdown(true)}
                  placeholder="Search parent email..."
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {selectedParent && (
                  <TouchableOpacity onPress={handleClearParent}>
                    <X size={16} color={theme.colors.textMuted} {...({} as any)} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Dropdown results */}
              {showParentDropdown && parentResults.length > 0 && (
                <View style={styles.dropdownList}>
                  {parentResults.map((p: any) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectParent(p)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dropdownName}>{p.full_name || 'Parent'}</Text>
                        <Text style={styles.dropdownEmail}>{p.email}</Text>
                      </View>
                      {selectedParent?.id === p.id && (
                        <CheckCircle size={16} color="#10B981" {...({} as any)} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Selected Parent Card */}
              {selectedParent && (
                <View style={styles.selectedParentCard}>
                  <View style={styles.selectedParentDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedParentName}>{selectedParent.full_name}</Text>
                    <Text style={styles.selectedParentEmail}>{selectedParent.email}</Text>
                  </View>
                  <CheckCircle size={18} color="#10B981" {...({} as any)} />
                </View>
              )}
            </View>

            {/* Auto-filled / manual parent details */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Parent Name {!selectedParent ? '*' : '(auto-filled)'}</Text>
              <TextInput
                style={[styles.input, selectedParent && styles.inputReadOnly]}
                value={form.parentName}
                onChangeText={v => updateField('parentName', v)}
                placeholder="Parent Full Name"
                editable={!selectedParent}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Parent Phone</Text>
                <TextInput
                  style={[styles.input, selectedParent && styles.inputReadOnly]}
                  value={form.parentPhone}
                  onChangeText={v => updateField('parentPhone', v)}
                  keyboardType="phone-pad"
                  placeholder="+91..."
                  editable={!selectedParent}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Parent Email</Text>
                <TextInput
                  style={[styles.input, selectedParent && styles.inputReadOnly]}
                  value={form.parentEmail}
                  onChangeText={v => updateField('parentEmail', v)}
                  keyboardType="email-address"
                  placeholder="email@..."
                  editable={!selectedParent}
                />
              </View>
            </View>
          </>
        )}

        {/* Staff-specific */}
        {(selectedRole !== 'student' && selectedRole !== 'parent') && (
          <>
            <Text style={styles.sectionTitle}>Staff Details</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Staff ID *</Text>
                <TextInput style={styles.input} value={form.staffId} onChangeText={v => updateField('staffId', v)} placeholder="TCH001" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Department</Text>
                <TextInput style={styles.input} value={form.department} onChangeText={v => updateField('department', v)} placeholder="Science" />
              </View>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.prevBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={theme.colors.text} {...({} as any)} />
          <Text style={styles.prevBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, isLoading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Save size={20} color="white" {...({} as any)} />
              <Text style={styles.saveBtnText}>Create User</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Unified Premium Picker Sheet */}
      <Modal
        visible={!!pickerConfig?.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerConfig(null)}
      >
        <TouchableOpacity 
          style={styles.sheetOverlay} 
          activeOpacity={1} 
          onPress={() => setPickerConfig(null)}
        >
          <View style={[styles.sheetContent, { maxHeight: '80%' }]}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{pickerConfig?.title}</Text>
            </View>
            
            <ScrollView style={{ marginBottom: 16 }}>
              <View style={styles.sheetBody}>
                {pickerConfig?.options.map((opt, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.sheetOption} 
                    onPress={() => {
                      opt.onPress();
                      setPickerConfig(null);
                    }}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: opt.bgColor || '#F1F5F9' }]}>
                      {opt.icon ? (
                        <opt.icon size={22} color={opt.color || theme.colors.text} {...({} as any)} />
                      ) : (
                        <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{opt.label[0]}</Text>
                      )}
                    </View>
                    <Text style={[styles.optionText, opt.color ? { color: opt.color } : {}]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.sheetCancelBtn} 
              onPress={() => setPickerConfig(null)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Unified Premium Alert Modal */}
      <Modal
        visible={!!alertConfig?.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertConfig(null)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>{alertConfig?.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig?.message}</Text>
                        <View style={styles.alertActions}>
              {alertConfig?.buttons.map((btn, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[
                    styles.alertBtn, 
                    btn.style === 'cancel' ? styles.alertCancelBtn : (btn.style === 'destructive' ? styles.alertDestructiveBtn : styles.alertPrimaryBtn),
                    alertConfig.buttons.length > 2 && { width: '100%' }
                  ]}
                  onPress={btn.onPress}
                >
                  <Text style={[
                    styles.alertBtnText,
                    btn.style === 'cancel' ? styles.alertCancelBtnText : { color: 'white' }
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <CalendarModal
        visible={showDOBPicker}
        title="Select Date of Birth"
        initialDate={form.dob}
        onSelect={(date) => updateField('dob', date)}
        onClose={() => setShowDOBPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  roleBar: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  roleChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F1F5F9' },
  roleChipText: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted },
  bulkBar: { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#3B82F610', borderWidth: 1, borderColor: '#3B82F620' },
  bulkBtnText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  progressBar: { height: 28, backgroundColor: '#E2E8F0', marginHorizontal: 16, marginTop: 8, borderRadius: 14, overflow: 'hidden', justifyContent: 'center' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#3B82F6', borderRadius: 14 },
  progressText: { textAlign: 'center', fontSize: 11, fontWeight: 'bold', color: 'white', zIndex: 1 },
  emailPreview: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, padding: 14, backgroundColor: '#3B82F610', borderRadius: 16, borderWidth: 1, borderColor: '#3B82F620', gap: 12 },
  emailLabel: { fontSize: 10, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  emailText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary, marginTop: 2 },
  formContainer: { flex: 1 },
  formContent: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginTop: 8, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { gap: 4 },
  label: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: theme.colors.text },
  inputReadOnly: { backgroundColor: '#F8FAFC', color: theme.colors.textMuted },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  selectText: { fontSize: 14, color: theme.colors.text },
  placeholder: { color: '#94A3B8' },
  // Parent search
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text, padding: 0 },
  dropdownList: { marginTop: 4, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', zIndex: 999 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  dropdownName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  dropdownEmail: { fontSize: 12, color: theme.colors.textMuted },
  selectedParentCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#D1FAE5' },
  selectedParentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  selectedParentName: { fontSize: 13, fontWeight: 'bold', color: '#065F46' },
  selectedParentEmail: { fontSize: 12, color: '#10B981' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: 'white' },
  prevBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  prevBtnText: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, minWidth: 150, justifyContent: 'center' },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  
  // Photo Picker
  photoContainer: { alignItems: 'center', marginVertical: 16 },
  photoPicker: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', position: 'relative' },
  photo: { width: 116, height: 116, borderRadius: 58 },
  photoPlaceholder: { alignItems: 'center', gap: 4 },
  photoText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
  photoEditBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: theme.colors.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'white' },

  // Action Sheet Styles
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, paddingHorizontal: 20 },
  sheetHeader: { alignItems: 'center', paddingVertical: 12 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  sheetBody: { gap: 8, marginVertical: 12 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 16, borderRadius: 16, backgroundColor: '#F8FAFC' },
  optionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  optionText: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  sheetCancelBtn: { marginTop: 8, padding: 16, borderRadius: 16, alignItems: 'center', backgroundColor: '#F1F5F9' },
  sheetCancelText: { fontSize: 16, fontWeight: '700', color: theme.colors.textMuted },

  // Alert Modal Styles
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  alertTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12, textAlign: 'center' },
  alertMessage: { fontSize: 15, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  alertActions: { width: '100%', gap: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  alertBtn: { flex: 1, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', minWidth: 120 },
  alertPrimaryBtn: { backgroundColor: theme.colors.primary },
  alertDestructiveBtn: { backgroundColor: '#EF4444' },
  alertCancelBtn: { backgroundColor: '#F1F5F9' },
  alertBtnText: { fontSize: 15, fontWeight: '700' },
  alertCancelBtnText: { color: theme.colors.textMuted },
});
