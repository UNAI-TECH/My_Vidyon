import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  ChevronRight, ChevronLeft, ChevronDown, Copy, FileSpreadsheet, Download, Users, Plus, Search, CheckCircle, X,
  Mail, GraduationCap, Briefcase, Calculator, Coffee, Bus, UserCheck, Shield, User
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CalendarModal } from '../../../../src/components/common/CalendarPicker';
import { uploadToSupabaseStorage } from '../../../../src/utils/fileUpload';
import { Select } from '../../../../src/components/common/Select';

type UserRole = 'student' | 'faculty' | 'admission_officer' | 'accountant' | 'reports_manager' | 'canteen_manager' | 'driver' | 'parent';

const ROLES: { id: UserRole; label: string; color: string; description?: string }[] = [
  { id: 'student', label: 'Student', color: '#3B82F6', description: 'Student profile' },
  { id: 'faculty', label: 'Faculty', color: '#A855F7', description: 'Teaching staff' },
  { id: 'admission_officer', label: 'Admissions', color: '#0EA5E9', description: 'Admissions in-charge' },
  { id: 'accountant', label: 'Fee / Finance', color: '#F59E0B', description: 'Fee management & collections' },
  { id: 'reports_manager', label: 'Reports', color: '#6366F1', description: 'Academic records & reports' },
  { id: 'canteen_manager', label: 'Canteen', color: '#10B981', description: 'Cafeteria manager' },
  { id: 'driver', label: 'Transport', color: '#EF4444', description: 'Bus driver' },
  { id: 'parent', label: 'Parent', color: '#8B5CF6', description: 'Student guardian' },
];

const BLOOD_GROUPS = [
  { label: 'A+', value: 'A+' },
  { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' },
  { label: 'B-', value: 'B-' },
  { label: 'O+', value: 'O+' },
  { label: 'O-', value: 'O-' },
  { label: 'AB+', value: 'AB+' },
  { label: 'AB-', value: 'AB-' },
];

const FACULTY_DESIGNATIONS = [
  { label: 'Teacher', value: 'Teacher' },
  { label: 'Senior Teacher', value: 'Senior Teacher' },
  { label: 'Head of Department (HOD)', value: 'Head of Department' },
  { label: 'Assistant Professor', value: 'Assistant Professor' },
  { label: 'Associate Professor', value: 'Associate Professor' },
  { label: 'Professor', value: 'Professor' },
  { label: 'Lecturer', value: 'Lecturer' },
  { label: 'Junior Lecturer', value: 'Junior Lecturer' },
  { label: 'Primary Teacher (PRT)', value: 'Primary Teacher' },
  { label: 'Trained Graduate Teacher (TGT)', value: 'TGT' },
  { label: 'Post Graduate Teacher (PGT)', value: 'PGT' },
  { label: 'Lab Assistant / Instructor', value: 'Lab Instructor' },
  { label: 'Special Educator', value: 'Special Educator' },
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
  const { institutionId, institutionUuid } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Fetch allowed roles
  const { data: allowedRoles } = useQuery({
    queryKey: ['institution-allowed-roles', institutionId],
    queryFn: async () => {
      if (!institutionId) return null;
      const { data } = await supabase
        .from('institutions')
        .select('allowed_roles')
        .eq('institution_id', institutionId)
        .maybeSingle() as any;
      return data?.allowed_roles || {};
    },
    enabled: !!institutionId,
  });

  const displayRoles = useMemo(() => {
    const roles = allowedRoles || {};
    return ROLES.filter(r => {
      if (r.id === 'accountant' && roles.finance === false) return false;
      if (r.id === 'canteen_manager' && roles.canteen === false) return false;
      if (r.id === 'driver' && roles.transport === false) return false;
      return true;
    });
  }, [allowedRoles]);

  const [selectedRole, setSelectedRole] = useState<UserRole>((params.role as UserRole) || 'student');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkResults, setBulkResults] = useState<any[] | null>(null);

  const roleLabel = displayRoles.find(r => r.id === selectedRole)?.label || 'User';

  const goToStep2 = () => {
    setCurrentStep(2);
  };

  const goToStep3 = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setAlertConfig({
        visible: true,
        title: 'Missing Details',
        message: 'Please enter First Name and Last Name to continue.',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(null) }]
      });
      return;
    }
    setCurrentStep(3);
  };

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
    // Staff & Faculty specific
    staffId: '', department: '', designation: '', extension: '', counter: '',
    // Transport & Fleet
    vehicleNumber: '', licenseNumber: '',
    // Parent specific
    wardInfo: '',
  });

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = useCallback(() => {
    setForm({
      firstName: '', lastName: '', dob: '', gender: 'male', bloodGroup: '',
      phone: '', address: '', city: '', zipCode: '',
      admissionNumber: '', className: '', section: '', rollNumber: '', academicYear: '2026-27',
      parentName: '', parentRelation: 'Father', parentPhone: '', parentEmail: '',
      staffId: '', department: '', designation: '', extension: '', counter: '',
      vehicleNumber: '', licenseNumber: '', wardInfo: '',
    });
    setImage(null);
    setGeneratedEmail('');
    setSelectedParent(null);
    setParentSearchQuery('');
    setCurrentStep(1);
  }, []);

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

  // Fetch existing staff for minimal ID auto-generation
  const { data: existingStaff = [] } = useQuery({
    queryKey: ['existing-staff-ids', institutionId],
    queryFn: async (): Promise<any[]> => {
      if (!institutionId) return [];
      const { data } = await (supabase
        .from('profiles') as any)
        .select('id, staff_id, role')
        .eq('institution_id', institutionId)
        .not('staff_id', 'is', null);
      return data || [];
    },
    enabled: !!institutionId
  });

  // Fetch subjects from the institution to populate Department dropdown
  const { data: institutionSubjects = [] } = useQuery({
    queryKey: ['institution-subjects-departments', institutionId],
    queryFn: async (): Promise<string[]> => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from('subjects')
        .select('name')
        .eq('institution_id', institutionId)
        .order('name');
      if (error) {
        console.warn('Error fetching subjects for departments:', error);
        return [];
      }
      if (!data) return [];
      const uniqueNames = Array.from(new Set(data.map((s: any) => s.name?.trim()).filter(Boolean)));
      return uniqueNames as string[];
    },
    enabled: !!institutionId
  });

  const departmentOptions = useMemo(() => {
    if (institutionSubjects.length > 0) {
      return institutionSubjects.map((sub: string) => ({
        label: sub,
        value: sub,
      }));
    }
    return [
      { label: 'English', value: 'English' },
      { label: 'Mathematics', value: 'Mathematics' },
      { label: 'Science', value: 'Science' },
      { label: 'Social Studies', value: 'Social Studies' },
      { label: 'Physics', value: 'Physics' },
      { label: 'Chemistry', value: 'Chemistry' },
      { label: 'Biology', value: 'Biology' },
      { label: 'Computer Science', value: 'Computer Science' },
      { label: 'Commerce', value: 'Commerce' },
      { label: 'Physical Education', value: 'Physical Education' },
      { label: 'General / Languages', value: 'General' },
    ];
  }, [institutionSubjects]);

  const generateMinimalStaffId = useCallback((role: UserRole) => {
    // Faculty defaults to 'TCH-' (continues TCH-01, TCH-02...), other staff roles default to 'STAFF-' (STAFF-01, STAFF-02...)
    const prefix = role === 'faculty' ? 'TCH-' : 'STAFF-';
    
    // Match any existing IDs with TCH-, T-, STAFF-, S-, or legacy prefixes
    const regex = role === 'faculty'
      ? /^(?:TCH-?|T-?)(\d+)$/i
      : /^(?:STAFF-?|S-?|ADM-?|FIN-?|REP-?|CAN-?|DRV-?)(\d+)$/i;
    
    let maxNum = 0;
    for (const s of existingStaff) {
      const id = s.staff_id;
      if (typeof id === 'string') {
        const match = id.trim().match(regex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    
    const nextNum = maxNum > 0 ? maxNum + 1 : 1;
    const formatted = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    return `${prefix}${formatted}`;
  }, [existingStaff]);

  useEffect(() => {
    if (selectedRole !== 'student' && selectedRole !== 'parent') {
      const autoId = generateMinimalStaffId(selectedRole);
      setForm(prev => {
        if (!prev.staffId || /^(?:TCH-?|STAFF-?|T|S|ADM-?|FIN-?|CAN-?|REP-?|DRV-?)\d{1,4}$/i.test(prev.staffId)) {
          return { ...prev, staffId: autoId };
        }
        return prev;
      });
    }
  }, [selectedRole, generateMinimalStaffId]);

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
    const fullName = `${form.firstName} ${form.lastName}`;

    try {
      let dbRole: string = selectedRole;
      let dbDept = form.department || null;

      if (selectedRole === 'admission_officer') {
        dbRole = 'faculty';
        dbDept = form.department || 'Admissions';
      } else if (selectedRole === 'accountant') {
        dbRole = 'accountant';
        dbDept = form.department || 'Fee Management';
      } else if (selectedRole === 'reports_manager') {
        dbRole = 'analytics';
        dbDept = form.department || 'Reports';
      } else if (selectedRole === 'canteen_manager') {
        dbRole = 'canteen_manager';
        dbDept = form.department || 'Canteen';
      } else if (selectedRole === 'driver') {
        dbRole = 'driver';
        dbDept = form.department || 'Transport';
      }

      const body: any = {
        email,
        role: dbRole,
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
        body.parent_contact = form.phone || null;
      } else {
        body.staff_id = form.staffId || `STF-${Date.now().toString(36).toUpperCase()}`;
        body.department = dbDept;
      }

      if (image) {
        try {
          const fileName = `user_${Date.now()}.jpg`;
          const { publicUrl } = await uploadToSupabaseStorage({
            bucket: 'student-photos',
            path: fileName,
            uri: image,
            mimeType: 'image/jpeg',
            upsert: true,
          });
          body.image_url = publicUrl;
        } catch (e) { console.error('[Student Photo Upload Error]:', e); }
      }

      const { data: responseData, error } = await supabase.functions.invoke('create-user', { body });
      if (error) throw error;
      if (responseData?.error) throw new Error(responseData.error);

      // Instantly reset the form so admin is ready for the next entry
      resetForm();

      setAlertConfig({
        visible: true,
        title: '✅ User Created & Form Reset!',
        message: `${fullName} has been successfully created as ${displayRoles.find(r => r.id === selectedRole)?.label || selectedRole}.\n\nOfficial Email:\n${email}\n\nThe form is now reset and ready for the next user.`,
        buttons: [
          { 
            text: 'Add Another User', 
            onPress: () => {
              copyEmail(email);
              setAlertConfig(null);
            } 
          },
          { 
            text: 'View Users List', 
            onPress: () => {
              setAlertConfig(null);
              router.back();
            } 
          }
        ]
      });
    } catch (error: any) {
      console.error('Create user error:', error);
      
      let errorMessage = 'Failed to create user';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Try to extract more details from Supabase Functions error
        if ((error as any).context) {
          try {
            const context = (error as any).context;
            // The context is often a Response object in Supabase Functions
            if (typeof context.json === 'function') {
              const body = await context.json();
              errorMessage = body.error || body.message || JSON.stringify(body);
            } else if (typeof context.text === 'function') {
              errorMessage = await context.text();
            }
          } catch (e) {
            console.warn('Failed to parse error context:', e);
          }
        }
      }

      setAlertConfig({
        visible: true,
        title: 'Error',
        message: String(errorMessage),
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
        const password = row.password || undefined; // Only use if explicitly provided in sheet

        try {
          const { data, error } = await supabase.functions.invoke('create-user', {
            body: {
              email,
              ...(password ? { password } : {}),
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
          if (data?.error) throw new Error(data.error);
          return { name, email, status: 'success' };
        } catch (err: any) {
          let msg = err.message;
          if (err.context) {
            try {
              const body = await err.context.json();
              if (body.error) msg = body.error;
            } catch (e) {}
          }
          return { name, email, status: 'error', message: msg };
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

  const STEPS = [
    { id: 1, label: 'Role', subtitle: 'Account Type', icon: Shield },
    { id: 2, label: 'Personal Details', subtitle: 'Profile Info', icon: User },
    { id: 3, label: `${roleLabel} Info`, subtitle: 'Role Data', icon: GraduationCap },
  ];

  // ---- RENDER ----
  return (
    <View style={styles.container}>
      <PageHeader
        title="Add User"
        subtitle="Create a new user account"
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <ArrowLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        }
        actions={
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={handleBulkUpload}>
              <Upload size={14} color={theme.colors.primary} {...({} as any)} />
              <Text style={styles.headerBtnText}>Bulk Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={handleDownloadTemplate}>
              <Download size={14} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={[styles.headerBtnText, { color: theme.colors.textMuted }]}>Template</Text>
            </TouchableOpacity>
            {bulkResults && (
              <TouchableOpacity style={[styles.headerBtn, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]} onPress={() => handleDownloadResults(bulkResults)}>
                <FileSpreadsheet size={14} color="#10B981" {...({} as any)} />
                <Text style={[styles.headerBtnText, { color: '#10B981' }]}>Export</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Steps Indicator Bar */}
      <View style={styles.stepsBar}>
        <View style={styles.stepsBarInner}>
          {STEPS.map((s, idx) => {
            const isDone = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <React.Fragment key={s.id}>
                <TouchableOpacity
                  style={styles.stepItem}
                  onPress={() => {
                    if (s.id < currentStep) {
                      setCurrentStep(s.id);
                    } else if (s.id === 2 && currentStep === 1) {
                      goToStep2();
                    } else if (s.id === 3 && currentStep === 2) {
                      goToStep3();
                    }
                  }}
                  disabled={s.id > currentStep}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.stepBadge,
                    isCurrent && styles.stepBadgeCurrent,
                    isDone && styles.stepBadgeDone,
                  ]}>
                    {isDone ? (
                      <CheckCircle size={14} color="white" {...({} as any)} />
                    ) : (
                      <Text style={[styles.stepBadgeText, isCurrent && styles.stepBadgeTextCurrent]}>
                        {s.id}
                      </Text>
                    )}
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={[styles.stepTitle, isCurrent && styles.stepTitleCurrent]}>
                      {s.label}
                    </Text>
                    <Text style={styles.stepSubtitle}>{s.subtitle}</Text>
                  </View>
                </TouchableOpacity>

                {idx < STEPS.length - 1 && (
                  <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* Bulk Progress */}
      {bulkProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }]} />
            <Text style={styles.progressText}>{bulkProgress.current}/{bulkProgress.total} users processed</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
        {/* PAGE 1: ROLE SELECTION */}
        {currentStep === 1 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Shield size={18} color={theme.colors.primary} {...({} as any)} />
              <Text style={styles.sectionTitle}>Account Role</Text>
            </View>

            <Select
              label="User Role / Account Type *"
              placeholder="Select user role..."
              value={selectedRole}
              options={displayRoles.map(r => ({
                value: r.id,
                label: r.label,
                subLabel: r.description,
              }))}
              onSelect={(val) => {
                setSelectedRole(val as UserRole);
                setForm(prev => ({
                  ...prev,
                  className: '',
                  section: '',
                  rollNumber: '',
                  admissionNumber: '',
                  parentName: '',
                  parentPhone: '',
                  parentEmail: '',
                  staffId: '',
                  department: '',
                  designation: '',
                  extension: '',
                  counter: '',
                  vehicleNumber: '',
                  licenseNumber: '',
                  wardInfo: '',
                }));
                setSelectedParent(null);
                setParentSearchQuery('');
              }}
              searchable={false}
            />

            {/* Auto Email Preview */}
            {autoEmail ? (
              <View style={styles.emailPreviewBox}>
                <Mail size={18} color={theme.colors.secondary} {...({} as any)} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.emailLabel}>Official Campus Email</Text>
                  <Text style={styles.emailText}>{autoEmail}</Text>
                </View>
                <TouchableOpacity style={styles.copyPillBtn} onPress={() => copyEmail(autoEmail)}>
                  <Copy size={13} color="#B45309" {...({} as any)} />
                  <Text style={styles.copyPillText}>Copy</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.passwordNote}>
              <Text style={styles.passwordNoteText}>
                Initial password will be set by the user upon first login.
              </Text>
            </View>
          </View>
        )}

        {/* CARD 2: PERSONAL DETAILS & AVATAR */}
        {currentStep === 2 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <User size={18} color={theme.colors.primary} {...({} as any)} />
              <Text style={styles.sectionTitle}>Personal Details</Text>
            </View>

            {/* Avatar and Name Top Row */}
            <View style={styles.profileTopRow}>
              <TouchableOpacity 
                style={styles.avatarWrap} 
                onPress={() => setPickerConfig({
                  visible: true,
                  title: 'Upload Profile Photo',
                  options: [
                    { label: 'Camera', icon: Camera, onPress: takePhoto, color: theme.colors.primary, bgColor: '#FFFBEB' },
                    { label: 'Gallery', icon: Upload, onPress: pickImage, color: theme.colors.secondary, bgColor: '#FFFBEB' },
                    ...(image ? [{ label: 'Remove Photo', icon: Trash2, onPress: () => setImage(null), color: '#EF4444', bgColor: '#FEF2F2' }] : []),
                  ]
                })}
              >
                {image ? (
                  <Image source={{ uri: image }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Camera size={26} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.avatarLabel}>Add Photo</Text>
                  </View>
                )}
                <View style={styles.avatarBadge}>
                  <Plus size={13} color="white" {...({} as any)} />
                </View>
              </TouchableOpacity>

              <View style={{ flex: 1, gap: 12 }}>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>First Name *</Text>
                    <TextInput style={styles.input} value={form.firstName} onChangeText={v => updateField('firstName', v)} placeholder="e.g. Rahul" />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Last Name *</Text>
                    <TextInput style={styles.input} value={form.lastName} onChangeText={v => updateField('lastName', v)} placeholder="e.g. Sharma" />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                      style={styles.input}
                      value={form.phone}
                      onChangeText={v => updateField('phone', v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      inputMode="numeric"
                      maxLength={15}
                      placeholder="e.g. 9840012345"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Date of Birth</Text>
                    <TouchableOpacity 
                      style={[styles.input, { justifyContent: 'center' }]} 
                      onPress={() => setShowDOBPicker(true)}
                    >
                      <Text style={{ color: form.dob ? theme.colors.text : '#94A3B8', fontSize: 14 }}>
                        {form.dob || 'YYYY-MM-DD'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Gender & Blood Group Row */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Select
                  label="Gender"
                  value={form.gender}
                  options={[
                    { label: 'Male', value: 'male' },
                    { label: 'Female', value: 'female' },
                    { label: 'Other', value: 'other' },
                  ]}
                  onSelect={(val) => updateField('gender', String(val))}
                  searchable={false}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Select
                  label="Blood Group"
                  placeholder="Select Blood Group..."
                  value={form.bloodGroup}
                  options={BLOOD_GROUPS}
                  onSelect={(val) => updateField('bloodGroup', String(val))}
                  searchable={false}
                />
              </View>
            </View>
          </View>
        )}

        {/* CARD 3: ROLE-SPECIFIC DETAILS */}
        {currentStep === 3 && (
          <View style={styles.card}>
          {/* 1. Student Details */}
          {selectedRole === 'student' && (
            <>
              <View style={styles.sectionHeader}>
                <GraduationCap size={18} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.sectionTitle}>Academic Information</Text>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Select
                    label="Class / Grade *"
                    placeholder="Select Class..."
                    value={form.className}
                    options={availableClasses.map((c: any) => ({
                      label: c.name,
                      value: c.name,
                    }))}
                    onSelect={(val) => {
                      updateField('className', String(val));
                      updateField('section', '');
                    }}
                    searchable={true}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Select
                    label="Section"
                    placeholder={availableSections.length > 0 ? "Select Section..." : "Select Class first"}
                    value={form.section}
                    disabled={availableSections.length === 0}
                    options={availableSections.map((s: string) => ({
                      label: `Section ${s}`,
                      value: s,
                    }))}
                    onSelect={(val) => updateField('section', String(val))}
                    searchable={false}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Roll Number</Text>
                  <TextInput
                    style={styles.input}
                    value={form.rollNumber}
                    onChangeText={v => updateField('rollNumber', v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    inputMode="numeric"
                    placeholder="e.g. 12"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Admission Number</Text>
                  <TextInput style={styles.input} value={form.admissionNumber} onChangeText={v => updateField('admissionNumber', v)} placeholder="e.g. ADM/2026/001" />
                </View>
              </View>

              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <Users size={18} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.sectionTitle}>Parent / Guardian Information</Text>
              </View>

              {/* Parent Search Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Link Existing Parent (search by email)</Text>
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
                    placeholder="Search registered parent email..."
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {selectedParent && (
                    <TouchableOpacity onPress={handleClearParent}>
                      <X size={16} color={theme.colors.textMuted} {...({} as any)} />
                    </TouchableOpacity>
                  )}
                </View>

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

                {selectedParent && (
                  <View style={styles.selectedParentCard}>
                    <View style={styles.selectedParentDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedParentName}>✓ Linked: {selectedParent.full_name}</Text>
                      <Text style={styles.selectedParentEmail}>{selectedParent.email}</Text>
                    </View>
                    <CheckCircle size={18} color="#10B981" {...({} as any)} />
                  </View>
                )}
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Parent Full Name {!selectedParent ? '*' : '(auto-filled)'}</Text>
                  <TextInput
                    style={[styles.input, selectedParent && styles.inputReadOnly]}
                    value={form.parentName}
                    onChangeText={v => updateField('parentName', v)}
                    placeholder="e.g. Suresh Sharma"
                    editable={!selectedParent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Select
                    label="Relationship"
                    value={form.parentRelation}
                    options={[
                      { label: 'Father', value: 'Father' },
                      { label: 'Mother', value: 'Mother' },
                      { label: 'Guardian', value: 'Guardian' },
                    ]}
                    onSelect={(v) => updateField('parentRelation', String(v))}
                    searchable={false}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Parent Phone</Text>
                  <TextInput
                    style={[styles.input, selectedParent && styles.inputReadOnly]}
                    value={form.parentPhone}
                    onChangeText={v => updateField('parentPhone', v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="e.g. 9840054321"
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
                    placeholder="parent@example.com"
                    editable={!selectedParent}
                  />
                </View>
              </View>
            </>
          )}

          {/* 2. Faculty Details */}
          {selectedRole === 'faculty' && (
            <>
              <View style={styles.sectionHeader}>
                <Briefcase size={18} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.sectionTitle}>Faculty Details</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Staff ID * (Auto-generated)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.staffId}
                    onChangeText={v => updateField('staffId', v)}
                    placeholder={generateMinimalStaffId('faculty')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Select
                    label="Department *"
                    placeholder="Select Department..."
                    value={form.department}
                    options={departmentOptions}
                    onSelect={(val) => updateField('department', String(val))}
                    searchable={true}
                  />
                </View>
              </View>
              <View>
                <Select
                  label="Designation"
                  placeholder="Select Designation..."
                  value={form.designation}
                  options={FACULTY_DESIGNATIONS}
                  onSelect={(val) => updateField('designation', String(val))}
                  searchable={true}
                />
              </View>
            </>
          )}

          {/* 3. Admissions Officer */}
          {selectedRole === 'admission_officer' && (
            <>
              <View style={styles.sectionHeader}>
                <UserCheck size={18} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.sectionTitle}>Admissions Desk Details</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Staff ID * (Auto-generated)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.staffId}
                    onChangeText={v => updateField('staffId', v)}
                    placeholder={generateMinimalStaffId('admission_officer')}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Desk / Office Extension</Text>
                  <TextInput style={styles.input} value={form.extension} onChangeText={v => updateField('extension', v)} placeholder="e.g. Ext 104 / Front Desk" />
                </View>
              </View>
            </>
          )}

          {/* 4. Accountant */}
          {selectedRole === 'accountant' && (
            <>
              <View style={styles.sectionHeader}>
                <Calculator size={18} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.sectionTitle}>Finance & Accounts Details</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Staff ID * (Auto-generated)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.staffId}
                    onChangeText={v => updateField('staffId', v)}
                    placeholder={generateMinimalStaffId('accountant')}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Fee Counter / Desk ID</Text>
                  <TextInput style={styles.input} value={form.counter} onChangeText={v => updateField('counter', v)} placeholder="e.g. Cash Counter 1" />
                </View>
              </View>
            </>
          )}

          {/* 5. Reports Manager */}
          {selectedRole === 'reports_manager' && (
            <>
              <View style={styles.sectionHeader}>
                <FileSpreadsheet size={18} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.sectionTitle}>Academic Records Details</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Staff ID * (Auto-generated)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.staffId}
                    onChangeText={v => updateField('staffId', v)}
                    placeholder={generateMinimalStaffId('reports_manager')}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Section / Department</Text>
                  <TextInput style={styles.input} value={form.department || 'Reports & Analytics'} onChangeText={v => updateField('department', v)} placeholder="Reports & Analytics" />
                </View>
              </View>
            </>
          )}

          {/* 6. Canteen Manager */}
          {selectedRole === 'canteen_manager' && (
            <>
              <View style={styles.sectionHeader}>
                <Coffee size={18} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.sectionTitle}>Cafeteria Details</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Staff ID * (Auto-generated)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.staffId}
                    onChangeText={v => updateField('staffId', v)}
                    placeholder={generateMinimalStaffId('canteen_manager')}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Canteen / Counter Name</Text>
                  <TextInput style={styles.input} value={form.department} onChangeText={v => updateField('department', v)} placeholder="e.g. Main Campus Dining" />
                </View>
              </View>
            </>
          )}

          {/* 7. Transport / Driver */}
          {selectedRole === 'driver' && (
            <>
              <View style={styles.sectionHeader}>
                <Bus size={18} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.sectionTitle}>Transport & Fleet Details</Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Driver Staff ID * (Auto-generated)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.staffId}
                    onChangeText={v => updateField('staffId', v)}
                    placeholder={generateMinimalStaffId('driver')}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Assigned Bus / Vehicle *</Text>
                  <TextInput style={styles.input} value={form.vehicleNumber} onChangeText={v => updateField('vehicleNumber', v)} placeholder="e.g. Bus 04 / Route 12" />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Driving License Number</Text>
                <TextInput style={styles.input} value={form.licenseNumber} onChangeText={v => updateField('licenseNumber', v)} placeholder="e.g. DL-0420110012345" />
              </View>
            </>
          )}

          {/* 8. Parent */}
          {selectedRole === 'parent' && (
            <>
              <View style={styles.sectionHeader}>
                <Users size={18} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.sectionTitle}>Parent & Ward Details</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Linked Student / Ward Info</Text>
                <TextInput style={styles.input} value={form.wardInfo} onChangeText={v => updateField('wardInfo', v)} placeholder="e.g. Student Name, Admission No, or Class" />
              </View>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Select
                    label="Relationship to Ward"
                    value={form.parentRelation}
                    options={[
                      { label: 'Father', value: 'Father' },
                      { label: 'Mother', value: 'Mother' },
                      { label: 'Guardian', value: 'Guardian' },
                    ]}
                    onSelect={(v) => updateField('parentRelation', String(v))}
                    searchable={false}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Occupation / Work</Text>
                  <TextInput style={styles.input} value={form.department} onChangeText={v => updateField('department', v)} placeholder="e.g. Professional / Business" />
                </View>
              </View>
            </>
          )}
        </View>
      )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sticky Bottom Actions Bar */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          {currentStep === 1 ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <ChevronLeft size={18} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCurrentStep(prev => prev - 1)}>
              <ChevronLeft size={18} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.cancelBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          {currentStep === 1 && (
            <TouchableOpacity style={styles.saveBtn} onPress={goToStep2}>
              <Text style={styles.saveBtnText}>Continue to Personal Details</Text>
              <ChevronRight size={18} color="white" {...({} as any)} />
            </TouchableOpacity>
          )}

          {currentStep === 2 && (
            <TouchableOpacity style={styles.saveBtn} onPress={goToStep3}>
              <Text style={styles.saveBtnText}>Continue to {roleLabel} Details</Text>
              <ChevronRight size={18} color="white" {...({} as any)} />
            </TouchableOpacity>
          )}

          {currentStep === 3 && (
            <TouchableOpacity
              style={[styles.saveBtn, isLoading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <UserPlus size={18} color="white" {...({} as any)} />
                  <Text style={styles.saveBtnText}>
                    Create {roleLabel}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
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
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  headerBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },

  // Steps Indicator Styles
  stepsBar: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  stepsBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeCurrent: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  stepBadgeDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stepBadgeTextCurrent: {
    color: 'white',
  },
  stepInfo: {
    gap: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  stepTitleCurrent: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  stepSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
    maxWidth: 60,
  },
  stepLineDone: {
    backgroundColor: '#10B981',
  },

  progressContainer: { paddingHorizontal: 20, paddingTop: 10 },
  progressBar: { height: 26, backgroundColor: '#E2E8F0', borderRadius: 13, overflow: 'hidden', justifyContent: 'center' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: theme.colors.primary, borderRadius: 13 },
  progressText: { textAlign: 'center', fontSize: 11, fontWeight: '700', color: 'white', zIndex: 1 },

  formContainer: { flex: 1 },
  formContent: {
    padding: 24,
    paddingBottom: 120,
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    gap: 20,
  },

  // Card Structure
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },

  // Email Preview Box
  emailPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  emailLabel: { fontSize: 10.5, fontWeight: '700', color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.5 },
  emailText: { fontSize: 13.5, fontWeight: '700', color: '#78350F', marginTop: 1 },
  copyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  copyPillText: { fontSize: 12, fontWeight: '700', color: '#B45309' },

  passwordNote: {
    paddingHorizontal: 4,
  },
  passwordNoteText: {
    fontSize: 12.5,
    color: theme.colors.textMuted,
  },

  // Profile Avatar Row
  profileTopRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    position: 'relative',
    marginTop: 4,
  },
  avatarImage: { width: 84, height: 84, borderRadius: 42 },
  avatarPlaceholder: { alignItems: 'center', gap: 2 },
  avatarLabel: { fontSize: 10.5, fontWeight: '600', color: '#64748B' },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: theme.colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },

  row: { flexDirection: 'row', gap: 14 },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  inputReadOnly: { backgroundColor: '#F8FAFC', color: '#64748B' },

  // Parent Search
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text, padding: 0 },
  dropdownList: {
    marginTop: 4,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    zIndex: 999,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  dropdownName: { fontSize: 13.5, fontWeight: '600', color: '#0F172A' },
  dropdownEmail: { fontSize: 12, color: '#64748B' },
  selectedParentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  selectedParentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  selectedParentName: { fontSize: 13, fontWeight: '700', color: '#15803D' },
  selectedParentEmail: { fontSize: 12, color: '#16A34A' },

  // Sticky Clean Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 4,
  },
  footerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 880,
    width: '100%',
    alignSelf: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: 'white',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 26,
    paddingVertical: 11,
    borderRadius: 20,
    minWidth: 160,
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: { color: 'white', fontSize: 14.5, fontWeight: '700' },

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
  alertContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center' },
  alertTitle: { fontSize: 19, fontWeight: 'bold', color: theme.colors.text, marginBottom: 10, textAlign: 'center' },
  alertMessage: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 20, lineHeight: 21 },
  alertActions: { width: '100%', gap: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  alertBtn: { flex: 1, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', minWidth: 120 },
  alertPrimaryBtn: { backgroundColor: theme.colors.primary },
  alertDestructiveBtn: { backgroundColor: '#EF4444' },
  alertCancelBtn: { backgroundColor: '#F1F5F9' },
  alertBtnText: { fontSize: 14, fontWeight: '700' },
  alertCancelBtnText: { color: theme.colors.textMuted },
});
