import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import { theme } from '../../../../src/theme';

const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { 
  Building2, 
  MapPin, 
  Users, 
  BookOpen, 
  UserCog, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Plus,
  Trash2,
  Upload,
  School,
  X,
  ChevronDown,
  ChevronUp,
  Pencil
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { uploadToSupabaseStorage } from '../../../../src/utils/fileUpload';

// Removed global steps array to make it dynamic inside component

export default function InstitutionOnboarding() {
  const router = useRouter();
  const { mode, id } = useLocalSearchParams();
  const isEditMode = mode === 'edit';
  const isSecurityMode = mode === 'security';

  const allSteps = [
    { id: 1, name: 'Basic Info', icon: Building2, visible: !isSecurityMode },
    { id: 2, name: 'Admin Account', icon: UserCog, visible: !isEditMode || isSecurityMode },
    { id: 3, name: 'Structure', icon: School, visible: !isSecurityMode },
    { id: 4, name: 'Subjects', icon: BookOpen, visible: !isSecurityMode },
    { id: 5, name: 'Review', icon: Check, visible: !isSecurityMode },
  ];

  const steps = allSteps.filter(s => s.visible);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const insets = useSafeAreaInsets();

  // Form State
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    type: 'school',
    address: '',
    city: '',
    state: '',
    email: '',
    phone: '',
    academic_year: '2025-26',
    school_code: '',
    office_phone: '',
    guard_phone: '',
    transport_phone: '',
    allowed_roles: { canteen: true, finance: true, transport: true },
  });
  const [logo, setLogo] = useState<string | null>(null);
  const [pendingLogo, setPendingLogo] = useState<string | null>(null);
  const [showLogoPreview, setShowLogoPreview] = useState(false);
  
  const [adminInfo, setAdminInfo] = useState({
    email: '',
    password: '',
  });

  const [verification, setVerification] = useState({
    oldEmail: '',
    oldPassword: ''
  });
  const [existingCreds, setExistingCreds] = useState({
    email: '',
    password: ''
  });
  const [credentialsVerified, setCredentialsVerified] = useState(false);
  const [showSecurityFields, setShowSecurityFields] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

  const [structure, setStructure] = useState<any[]>([]);

  interface Subject {
    id: string;
    name: string;
    code: string;
    className: string;
    group: string;
  }

  // Subjects State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(true);
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [currentSubjectInput, setCurrentSubjectInput] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(''); // for higher secondary
  
  const [pendingSubjects, setPendingSubjects] = useState<string[]>([]);
  
  // Alert State
  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    onClose?: () => void;
    buttons?: any[];
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: any = 'info', onClose?: () => void, buttons?: any[]) => {
    setAlert({ visible: true, title, message, type, onClose, buttons });
  };  useFocusEffect(
    useCallback(() => {
      if (isEditMode && id) {
        fetchInstitutionData();
      } else if (!isEditMode && !isSecurityMode) {
        // Reset all form state for fresh "New Onboarding"
        setBasicInfo({
          name: '',
          type: 'school',
          address: '',
          city: '',
          state: '',
          email: '',
          phone: '',
          academic_year: '2025-26',
          school_code: '',
          office_phone: '',
          guard_phone: '',
          transport_phone: '',
          allowed_roles: { canteen: true, finance: true, transport: true },
        });
        setLogo(null);
        setPendingLogo(null);
        setAdminInfo({ email: '', password: '' });
        setStructure([]);
        setSubjects([]);
        setCurrentStep(1);
        setCredentialsVerified(false);
        setShowSecurityFields(false);
      }
    }, [isEditMode, id])
  );

  const fetchInstitutionData = async () => {
    try {
      setLoading(true);
      
      // Parallelize all main data fetches
      const [instResult, groupsResult, subjectsResult] = await Promise.all([
        (supabase.from('institutions') as any).select('*').eq('institution_id', id).single(),
        supabase.from('groups').select('id, name, classes(*)').eq('institution_id', id),
        supabase.from('subjects').select('*').eq('institution_id', id)
      ]);

      if (instResult.error) throw instResult.error;
      const data = instResult.data;

      if (data) {
        setBasicInfo({
          name: data.name,
          type: data.type,
          address: data.address,
          city: data.city,
          state: data.state,
          email: data.email,
          phone: data.phone,
          academic_year: data.current_academic_year || '2025-26',
          school_code: data.institution_id,
          office_phone: data.office_phone || '',
          guard_phone: data.guard_phone || '',
          transport_phone: data.transport_phone || '',
          allowed_roles: data.allowed_roles || { canteen: true, finance: true, transport: true },
        });
        setLogo(data.logo_url);
        setExistingCreds({
          email: data.admin_email || '',
          password: data.admin_password || ''
        });
        setAdminInfo({
          email: data.admin_email || '',
          password: ''
        });

        // 2. Map Groups & Classes (Capturing IDs to prevent cloning)
        if (groupsResult.data) {
          const mappedStructure = groupsResult.data.map((g: { id: string, name: string, classes?: any[] }) => ({
            id: g.id,
            name: g.name,
            classes: (g.classes || []).map((c: any) => ({
              id: c.id,
              name: c.name,
              sections: c.sections || ['A', 'B'],
              class_order: c.class_order || 0,
              is_final_class: c.is_final_class || false
            }))
          }));
          setStructure(mappedStructure);
        }

        // 3. Map Subjects (Capturing IDs)
        if (subjectsResult.data) {
          const mappedSubjects = subjectsResult.data.map((s: { id: string, name: string, code?: string, class_name: string, group_name?: string }) => ({
            id: s.id,
            name: s.name,
            code: s.code || '',
            className: s.class_name,
            group: s.group_name || 'Core'
          }));
          setSubjects(mappedSubjects);
        }
      }
    } catch (err: any) {
      console.error('[Optimized Fetch Fail]', err);
      showAlert('Error', 'Failed to fetch: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.5,
    });

    if (!result.canceled) {
      setPendingLogo(result.assets[0].uri);
      setShowLogoPreview(true);
    }
  };

  const confirmLogo = () => {
    setLogo(pendingLogo);
    setPendingLogo(null);
    setShowLogoPreview(false);
  };

  const cancelLogo = () => {
    setPendingLogo(null);
    setShowLogoPreview(false);
  };

  const renderStepIndicator = () => (
    <View style={styles.indicatorContainer}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <View style={styles.stepWrapper}>
            <View style={[
              styles.stepIcon, 
              (isSecurityMode ? currentStep === 1 : currentStep === step.id) && styles.activeStepIcon,
              (isSecurityMode ? false : currentStep > step.id) && styles.completedStepIcon
            ]}>
              <step.icon 
                size={18} 
                color={(isSecurityMode || currentStep >= step.id) ? 'white' : theme.colors.textMuted} 
                {...({} as any)} 
              />
            </View>
            <Text style={[
              styles.stepLabel, 
              (isSecurityMode ? currentStep === 1 : currentStep === step.id) && styles.activeStepLabel
            ]}>{step.name}</Text>
          </View>
          {index < steps.length - 1 && (
            <View style={[styles.stepLine, (isSecurityMode ? false : currentStep > step.id) && styles.activeStepLine]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderBasicInfo = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>General Details</Text>
      
      <View style={styles.logoUpload}>
        <TouchableOpacity style={styles.logoBtn} onPress={pickImage}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.uploadedLogo} />
          ) : (
            <Upload size={24} color={theme.colors.primary} {...({} as any)} />
          )}
        </TouchableOpacity>
        <View>
          <Text style={styles.uploadTitle}>Institution Logo</Text>
          <Text style={styles.uploadSubtitle}>PNG or JPG, max 5MB</Text>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Institution Name</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Little Flowers Public School"
          value={basicInfo.name}
          onChangeText={(v) => setBasicInfo({...basicInfo, name: v})}
        />
      </View>

      <View style={styles.grid}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>School Code</Text>
          <TextInput 
            style={styles.input} 
            placeholder="LFPS001"
            value={basicInfo.school_code}
            onChangeText={(v) => setBasicInfo({...basicInfo, school_code: v.toUpperCase()})}
            editable={!isEditMode}
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Academic Year</Text>
          <TextInput 
            style={styles.input} 
            placeholder="2025-26"
            value={basicInfo.academic_year}
            onChangeText={(v) => setBasicInfo({...basicInfo, academic_year: v})}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Address</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Full street address"
          value={basicInfo.address}
          onChangeText={(v) => setBasicInfo({...basicInfo, address: v})}
        />
      </View>

      <View style={styles.grid}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>City</Text>
          <TextInput 
            style={styles.input} 
            placeholder="City"
            value={basicInfo.city}
            onChangeText={(v) => setBasicInfo({...basicInfo, city: v})}
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>State</Text>
          <TextInput 
            style={styles.input} 
            placeholder="State"
            value={basicInfo.state}
            onChangeText={(v) => setBasicInfo({...basicInfo, state: v})}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Official Email</Text>
        <TextInput 
          style={styles.input} 
          placeholder="contact@school.com"
          keyboardType="email-address"
          value={basicInfo.email}
          onChangeText={(v) => setBasicInfo({...basicInfo, email: v})}
        />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Emergency Contacts</Text>
      <View style={styles.field}>
        <Text style={styles.label}>School Office Phone</Text>
        <TextInput 
          style={styles.input} 
          placeholder="+91 00000 00000"
          keyboardType="phone-pad"
          value={basicInfo.office_phone}
          onChangeText={(v) => setBasicInfo({...basicInfo, office_phone: v})}
        />
      </View>

      <View style={styles.grid}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Main Guard Deck</Text>
          <TextInput 
            style={styles.input} 
            placeholder="+91 00000 00000"
            keyboardType="phone-pad"
            value={basicInfo.guard_phone}
            onChangeText={(v) => setBasicInfo({...basicInfo, guard_phone: v})}
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Transport Dept</Text>
          <TextInput 
            style={styles.input} 
            placeholder="+91 00000 00000"
            keyboardType="phone-pad"
            value={basicInfo.transport_phone}
            onChangeText={(v) => setBasicInfo({...basicInfo, transport_phone: v})}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Module Permissions</Text>
      <Text style={[styles.helperText, { marginTop: -12, marginBottom: 12 }]}>Select which modules this institution can access. Disabling a module hides it entirely.</Text>
      <View style={{ gap: 12, marginBottom: 24 }}>
        {[
          { id: 'canteen', label: 'Canteen Management' },
          { id: 'finance', label: 'Finance & Accounts' },
          { id: 'transport', label: 'Transport Management' }
        ].map(role => (
          <TouchableOpacity 
            key={role.id}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12 }}
            onPress={() => {
              const current = (basicInfo.allowed_roles || { canteen: true, finance: true, transport: true }) as any;
              const updated = { ...current, [role.id]: current[role.id] === false ? true : false };
              setBasicInfo({...basicInfo, allowed_roles: updated});
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '500', color: theme.colors.text }}>{role.label}</Text>
            <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: (basicInfo.allowed_roles as any)?.[role.id] !== false ? theme.colors.primary : '#E2E8F0', padding: 2, justifyContent: 'center', alignItems: (basicInfo.allowed_roles as any)?.[role.id] !== false ? 'flex-end' : 'flex-start' }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {isEditMode && (
        <TouchableOpacity 
          style={[styles.saveProgressBtn, { marginTop: 24, borderStyle: 'solid' }]} 
          onPress={() => handleSaveStep(1)}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.saveProgressBtnText}>Save Basic Info</Text>}
        </TouchableOpacity>
      )}
    </View>
  );

  const handleVerify = () => {
    if (verification.oldEmail === existingCreds.email && verification.oldPassword === existingCreds.password) {
      setCredentialsVerified(true);
      showAlert('Verified', 'Old credentials verified. You can now update the email and password.', 'success');
    } else {
      showAlert('Error', 'Incorrect old email or password.', 'error');
    }
  };

  const renderAdminAccount = () => {
    const hasChanged = adminInfo.email !== existingCreds.email || adminInfo.password !== '';

    return (
      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Institution Admin Credentials</Text>
        
        {isEditMode ? (
          <>
            <Text style={styles.helperText}>To change the admin email or password, you must first verify the current credentials.</Text>
            
            {!credentialsVerified ? (
              <View style={{ gap: 12, marginBottom: 20 }}>
                <View style={styles.field}>
                  <Text style={styles.label}>Old Admin Email</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Enter current admin email"
                    value={verification.oldEmail}
                    onChangeText={(v) => setVerification({...verification, oldEmail: v})}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Old Admin Password</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Enter current admin password"
                    secureTextEntry
                    value={verification.oldPassword}
                    onChangeText={(v) => setVerification({...verification, oldPassword: v})}
                  />
                </View>
                <TouchableOpacity 
                  style={[styles.outlineBtn, { borderStyle: 'solid', height: 48 }]} 
                  onPress={handleVerify}
                >
                  <Text style={styles.outlineBtnText}>Verify Credentials</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ backgroundColor: '#F0FDF4', padding: 12, borderRadius: 12, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                <Text style={{ color: '#166534', fontSize: 13, fontWeight: '600' }}>Credentials Verified</Text>
              </View>
            )}

            <View style={{ opacity: (!isEditMode || credentialsVerified) ? 1 : 0.5 }}>
              <View style={styles.field}>
                <Text style={styles.label}>New Admin Email</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="admin@school.com"
                  keyboardType="email-address"
                  value={adminInfo.email}
                  onChangeText={(v) => setAdminInfo({...adminInfo, email: v})}
                  editable={!isEditMode || credentialsVerified}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>New Password (Optional if only email changing)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Leave blank to keep current"
                  secureTextEntry
                  value={adminInfo.password}
                  onChangeText={(v) => setAdminInfo({...adminInfo, password: v})}
                  editable={!isEditMode || credentialsVerified}
                />
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.helperText}>This account will be created as the super-admin for this institution.</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Admin Email</Text>
              <TextInput 
                style={styles.input} 
                placeholder="admin@school.com"
                keyboardType="email-address"
                value={adminInfo.email}
                onChangeText={(v: string) => setAdminInfo({...adminInfo, email: v})}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Temp Password</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Secret password"
                secureTextEntry
                value={adminInfo.password}
                onChangeText={(v: string) => setAdminInfo({...adminInfo, password: v})}
              />
            </View>
          </>
        )}
        {isEditMode && (
          <TouchableOpacity 
            style={[styles.saveProgressBtn, { marginTop: 24, borderStyle: 'solid' }]} 
            onPress={() => handleSaveStep(2)}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.saveProgressBtnText}>Save Admin Info</Text>}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const applyDefault = () => {
    setStructure([
      {
        id: 'primary',
        name: 'Primary',
        classes: [
          { id: 'c1', name: '1st', class_order: 1, is_final_class: false, sections: ['A', 'B', 'C', 'D', 'E'] },
          { id: 'c2', name: '2nd', class_order: 2, is_final_class: false, sections: ['A', 'B', 'C', 'D', 'E'] },
          { id: 'c3', name: '3rd', class_order: 3, is_final_class: false, sections: ['A', 'B', 'C', 'D', 'E'] },
          { id: 'c4', name: '4th', class_order: 4, is_final_class: false, sections: ['A', 'B', 'C', 'D', 'E'] },
          { id: 'c5', name: '5th', class_order: 5, is_final_class: false, sections: ['A', 'B', 'C', 'D', 'E'] },
        ]
      },
      {
        id: 'secondary',
        name: 'Secondary',
        classes: [
          { id: 'c6', name: '6th', class_order: 6, is_final_class: false, sections: ['A', 'B', 'C', 'D', 'E'] },
          { id: 'c7', name: '7th', class_order: 7, is_final_class: false, sections: ['A', 'B', 'C', 'D', 'E'] },
          { id: 'c8', name: '8th', class_order: 8, is_final_class: false, sections: ['A', 'B', 'C', 'D', 'E'] },
        ]
      }
    ]);
  };

  const addGroup = () => {
    setStructure([...structure, { id: Date.now().toString(), name: '', classes: [] }]);
  };

  const removeGroup = (groupId: string) => {
    setStructure(structure.filter(g => g.id !== groupId));
  };

  const updateGroup = (groupId: string, name: string) => {
    setStructure(structure.map(g => g.id === groupId ? { ...g, name } : g));
  };

  const addClass = (groupId: string) => {
    const nextOrder = structure.flatMap(g => g.classes).length + 1;
    setStructure(structure.map(g =>
      g.id === groupId
        ? { ...g, classes: [...g.classes, { id: Date.now().toString(), name: '', class_order: nextOrder, is_final_class: false, sections: [] }] }
        : g
    ));
  };

  const removeClass = (groupId: string, classId: string) => {
    setStructure(structure.map(g =>
      g.id === groupId
        ? { ...g, classes: g.classes.filter((c: any) => c.id !== classId) }
        : g
    ));
  };

  const updateClass = (groupId: string, classId: string, name: string) => {
    setStructure(structure.map(g =>
      g.id === groupId
        ? { ...g, classes: g.classes.map((c: any) => c.id === classId ? { ...c, name } : c) }
        : g
    ));
  };

  const addSection = (groupId: string, classId: string, section: string) => {
    setStructure(structure.map(g =>
      g.id === groupId
        ? {
          ...g,
          classes: g.classes.map((c: any) =>
            c.id === classId
              ? { ...c, sections: [...c.sections, section] }
              : c
          )
        }
        : g
    ));
  };

  const updateClassOrder = (groupId: string, classId: string, orderStr: string) => {
    const class_order = parseInt(orderStr) || 0;
    setStructure(structure.map(g =>
      g.id === groupId
        ? { ...g, classes: g.classes.map((c: any) => c.id === classId ? { ...c, class_order } : c) }
        : g
    ));
  };

  const toggleFinalClass = (groupId: string, classId: string) => {
    setStructure(structure.map(g =>
      g.id === groupId
        ? { ...g, classes: g.classes.map((c: any) => c.id === classId ? { ...c, is_final_class: !c.is_final_class } : c) }
        : g
    ));
  };

  const removeSection = (groupId: string, classId: string, section: string) => {
    setStructure(structure.map(g =>
      g.id === groupId
        ? {
          ...g,
          classes: g.classes.map((c: any) =>
            c.id === classId
              ? { ...c, sections: c.sections.filter((s: string) => s !== section) }
              : c
          )
        }
        : g
    ));
  };

  const [extraSectionInput, setExtraSectionInput] = useState<Record<string, string>>({});

  const renderStructure = () => (
    <View style={styles.formContainer}>
      <View style={[styles.flexRow, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }]}>
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Groups & Classes</Text>
        <TouchableOpacity style={{ backgroundColor: '#FDE68A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={addGroup}>
          <Plus size={14} color="#B45309" />
          <Text style={{ color: '#B45309', fontWeight: '600', fontSize: 12 }}>Add Group</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={applyDefault} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontWeight: '600', fontSize: 14 }}>Quick Setup</Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>Apply a standard school template</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 }}>
            <School size={14} color={theme.colors.text} />
            <Text style={{ fontWeight: '500', fontSize: 11 }}>Apply</Text>
          </View>
        </View>
      </TouchableOpacity>

      {structure.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40, borderWidth: 2, borderStyle: 'dashed', borderColor: '#E2E8F0', borderRadius: 12 }}>
          <School size={48} color={'#E2E8F0'} style={{ marginBottom: 16 }} />
          <Text style={{ color: theme.colors.textMuted }}>No structure defined yet.</Text>
        </View>
      ) : (
        <View style={{ gap: 24 }}>
          {structure.map((group) => (
            <View key={group.id} style={{ backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, fontWeight: '600', color: theme.colors.text }}
                  value={group.name}
                  onChangeText={(v: string) => updateGroup(group.id, v)}
                  placeholder="Enter Group Name (e.g. Primary)"
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity style={{ backgroundColor: '#FDE68A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }} onPress={() => addClass(group.id)}>
                  <Plus size={16} color="#B45309" />
                  <Text style={{ color: '#B45309', fontWeight: '600', fontSize: 13 }}>Add Class</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor: '#FEE2E2', padding: 8, borderRadius: 8 }} onPress={() => removeGroup(group.id)}>
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <View style={{ padding: 16, gap: 16 }}>
                {group.classes.map((classItem: any) => (
                  <View key={classItem.id} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      {(!isEditMode || !isValidUUID(classItem.id) || unlockedIds.has(classItem.id)) ? (
                        <>
                          <TextInput
                            style={{ flex: 3, backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, fontWeight: '500', color: theme.colors.text, borderWidth: 1, borderColor: '#E2E8F0' }}
                            value={classItem.name}
                            onChangeText={(v: string) => updateClass(group.id, classItem.id, v)}
                            placeholder="Class Name (e.g. Class 1)"
                            placeholderTextColor="#94A3B8"
                          />
                          <TextInput
                            style={{ flex: 1, backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, textAlign: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}
                            value={classItem.class_order?.toString() || ''}
                            onChangeText={(v: string) => updateClassOrder(group.id, classItem.id, v)}
                            placeholder="Order"
                            keyboardType="numeric"
                            placeholderTextColor="#94A3B8"
                          />
                        </>
                      ) : (
                        <View style={{ flex: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <Text style={{ fontWeight: '600', color: theme.colors.text }}>{classItem.name}</Text>
                          <TouchableOpacity 
                            onPress={() => {
                              const next = new Set(unlockedIds);
                              next.add(classItem.id);
                              setUnlockedIds(next);
                            }}
                          >
                            <Pencil size={16} color={theme.colors.primary} />
                          </TouchableOpacity>
                        </View>
                      )}
                      <TouchableOpacity style={{ padding: 8 }} onPress={() => removeClass(group.id, classItem.id)}>
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <TouchableOpacity 
                        style={{ 
                          backgroundColor: classItem.is_final_class ? '#10B981' : '#E2E8F0', 
                          paddingHorizontal: 12, 
                          paddingVertical: 8, 
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6
                        }}
                        onPress={() => toggleFinalClass(group.id, classItem.id)}
                      >
                        {classItem.is_final_class && <Check size={14} color="white" />}
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: classItem.is_final_class ? 'white' : theme.colors.text }}>
                          {classItem.is_final_class ? 'FINAL CLASS' : 'Mark Final'}
                        </Text>
                      </TouchableOpacity>
                      
                      <Text style={{ fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' }}>SECTIONS:</Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {classItem.sections.map((section: string) => (
                        <View key={section} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                          <Text style={{ color: '#B45309', fontSize: 12, fontWeight: '600' }}>{section}</Text>
                          <TouchableOpacity onPress={() => removeSection(group.id, classItem.id, section)}>
                            <X size={14} color="#B45309" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {['A', 'B', 'C', 'D', 'E'].map((section) => (
                        <TouchableOpacity
                          key={section}
                          style={{ 
                            backgroundColor: classItem.sections.includes(section) ? '#CBD5E1' : 'white', 
                            width: 36, 
                            height: 36, 
                            borderRadius: 8, 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            borderWidth: 1, 
                            borderColor: '#E2E8F0'
                          }}
                          onPress={() => !classItem.sections.includes(section) && addSection(group.id, classItem.id, section)}
                          disabled={classItem.sections.includes(section)}
                        >
                          <Text style={{ fontWeight: '600', color: classItem.sections.includes(section) ? 'white' : theme.colors.text }}>{section}</Text>
                        </TouchableOpacity>
                      ))}
                      <TextInput
                        style={{ backgroundColor: 'white', paddingHorizontal: 12, height: 36, borderRadius: 8, fontSize: 12, flex: 1, minWidth: 100, borderWidth: 1, borderColor: '#E2E8F0' }}
                        placeholder="Add custom..."
                        value={extraSectionInput[classItem.id] || ''}
                        onChangeText={(v: string) => setExtraSectionInput({ ...extraSectionInput, [classItem.id]: v })}
                        onSubmitEditing={(e) => {
                          const val = e.nativeEvent.text.trim();
                          if (val && !classItem.sections.includes(val)) {
                            addSection(group.id, classItem.id, val);
                            setExtraSectionInput({ ...extraSectionInput, [classItem.id]: '' });
                          }
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
      {isEditMode && structure.length > 0 && (
        <TouchableOpacity 
          style={[styles.saveProgressBtn, { marginTop: 24, borderStyle: 'solid' }]} 
          onPress={() => handleSaveStep(3)}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.saveProgressBtnText}>Save Structure</Text>}
        </TouchableOpacity>
      )}
    </View>
  );

  // Helper methods for complex subjects
  const allAvailableClasses = structure.flatMap(g => g.classes.map((c: any) => ({ 
    id: typeof c === 'string' ? c : c.id || c.name || c, 
    name: typeof c === 'string' ? c : c.name || c, 
    groupName: g.name,
    sections: typeof c === 'object' && c.sections ? c.sections : ['A', 'B'] 
  })));

  const addPendingSubject = () => {
    if (!currentSubjectInput.trim()) return;
    if (pendingSubjects.some(s => s.toLowerCase() === currentSubjectInput.trim().toLowerCase())) {
        showAlert('Error', 'Subject already in list', 'warning');
        return;
    }
    setPendingSubjects([...pendingSubjects, currentSubjectInput.trim()]);
    setCurrentSubjectInput('');
  };

  const removePendingSubject = (index: number) => {
    setPendingSubjects(pendingSubjects.filter((_, i) => i !== index));
  };

  const savePendingSubjects = () => {
    if (!selectedClassId) {
        showAlert('Error', 'Please select a class first', 'warning');
        return;
    }

    const selectedClassObj = allAvailableClasses.find(c => c.id === selectedClassId);
    if (!selectedClassObj) {
        showAlert('Error', 'Selected class not found', 'error');
        return;
    }

    let finalGroup = selectedClassObj.groupName;
    const isHigherSecondary = ['11', '12', 'xi', 'xii'].some(s => selectedClassObj.name.toLowerCase().includes(s));

    if (isHigherSecondary) {
        if (!selectedGroup) {
            Alert.alert('Error', 'Please select a Group/Stream (e.g. Science, Bio-Maths)');
            return;
        }
        finalGroup = selectedGroup;
    }

    const addedSubjects: Subject[] = pendingSubjects.map((name, idx) => ({
      id: Date.now().toString() + idx,
      name: name,
      code: '',
      className: selectedClassObj.name,
      group: finalGroup
    }));

    setSubjects([...subjects, ...addedSubjects]);
    setPendingSubjects([]);
    setSelectedClassId('');
    setSelectedSection('');
    setSelectedGroup('');
    setIsAddSubjectOpen(false);
  };

  const removeSubject = (subjectId: string) => {
    setSubjects(subjects.filter(s => s.id !== subjectId));
  };

  const renderSubjects = () => {
    const isHigherSecondary = selectedClassId && ['11', '12', 'xi', 'xii'].some(s => {
      const c = allAvailableClasses.find(cls => cls.id === selectedClassId);
      return c && c.name.toLowerCase().includes(s);
    });

    const subjectsByClass = subjects.reduce((acc: Record<string, Subject[]>, subject) => {
      const key = subject.group && subject.group !== 'Primary' && subject.group !== 'Secondary' && subject.group !== 'Higher Sec'
          ? `${subject.className} (${subject.group})`
          : subject.className;
      if (!acc[key]) acc[key] = [];
      acc[key].push(subject);
      return acc;
    }, {} as Record<string, Subject[]>);

    return (
      <View style={styles.formContainer}>
        {/* Accordion for Add Subjects */}
        <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: isAddSubjectOpen ? '#F8FAFC' : 'white', marginBottom: 24 }}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#F1F5F9' }}
            onPress={() => setIsAddSubjectOpen(!isAddSubjectOpen)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BookOpen size={20} color={theme.colors.primary} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>Add Subjects</Text>
            </View>
            {isAddSubjectOpen ? <ChevronUp size={20} color={theme.colors.textMuted} /> : <ChevronDown size={20} color={theme.colors.textMuted} />}
          </TouchableOpacity>

          {isAddSubjectOpen && (
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Select Class</Text>
                  {/* Simplistic native custom dropdown equivalent */}
                  <View style={[styles.input, { justifyContent: 'center', paddingVertical: 0 }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {allAvailableClasses.map(c => (
                        <TouchableOpacity 
                          key={c.id} 
                          style={{ padding: 8, marginRight: 8, backgroundColor: selectedClassId === c.id ? theme.colors.primary + '20' : 'transparent', borderRadius: 8 }}
                          onPress={() => {
                            setSelectedClassId(c.id);
                            setSelectedSection('');
                            setSelectedGroup('');
                          }}
                        >
                          <Text style={{ color: selectedClassId === c.id ? theme.colors.primary : theme.colors.text }}>{c.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Select Section</Text>
                  <View style={[styles.input, { justifyContent: 'center', paddingVertical: 0 }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedClassId ? allAvailableClasses.find(c => c.id === selectedClassId)?.sections.map((s: string) => (
                        <TouchableOpacity 
                          key={s} 
                          style={{ padding: 8, marginRight: 8, backgroundColor: selectedSection === s ? theme.colors.primary + '20' : 'transparent', borderRadius: 8 }}
                          onPress={() => setSelectedSection(s)}
                        >
                          <Text style={{ color: selectedSection === s ? theme.colors.primary : theme.colors.text }}>{s}</Text>
                        </TouchableOpacity>
                      )) : null}
                    </ScrollView>
                  </View>
                </View>
              </View>

              {isHigherSecondary && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Select Group / Stream *</Text>
                  <View style={[styles.input, { justifyContent: 'center', paddingVertical: 0 }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {['Science (Bio-Maths)', 'Science (Computer)', 'Commerce', 'Arts', 'Vocational'].map(s => (
                        <TouchableOpacity 
                          key={s} 
                          style={{ padding: 8, marginRight: 8, backgroundColor: selectedGroup === s ? theme.colors.primary + '20' : 'transparent', borderRadius: 8 }}
                          onPress={() => setSelectedGroup(s)}
                        >
                          <Text style={{ color: selectedGroup === s ? theme.colors.primary : theme.colors.text }}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}

              {selectedClassId && (selectedSection || (allAvailableClasses.find(c => c.id === selectedClassId)?.sections.length === 0)) && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.label}>Enter Subject Name</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: 'white' }]}
                      placeholder="e.g. Mathematics"
                      value={currentSubjectInput}
                      onChangeText={setCurrentSubjectInput}
                      onSubmitEditing={addPendingSubject}
                    />
                    <TouchableOpacity 
                      style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      onPress={addPendingSubject}
                    >
                      <Plus size={16} color={theme.colors.text} />
                      <Text style={{ fontWeight: '500' }}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  {pendingSubjects.length > 0 && (
                    <View style={{ marginTop: 16, backgroundColor: 'white', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 8, fontWeight: '500' }}>Subjects to be added:</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        {pendingSubjects.map((sub, idx) => (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 }}>
                            <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '500' }}>{sub}</Text>
                            <TouchableOpacity onPress={() => removePendingSubject(idx)}>
                              <X size={14} color={theme.colors.primary} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <TouchableOpacity 
                          style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                          onPress={savePendingSubjects}
                        >
                          <Check size={16} color="white" />
                          <Text style={{ color: 'white', fontWeight: '500' }}>Save & Close</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Existing Saved Subjects List */}
        <Text style={[styles.sectionTitle, { fontSize: 18 }]}>Saved Subjects</Text>
        
        {subjects.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, borderWidth: 2, borderStyle: 'dashed', borderColor: '#E2E8F0', borderRadius: 12, marginTop: 8 }}>
            <BookOpen size={48} color={'#E2E8F0'} style={{ marginBottom: 16 }} />
            <Text style={{ color: theme.colors.textMuted }}>No subjects saved yet.</Text>
          </View>
        ) : (
          <View style={{ gap: 16, marginTop: 8 }}>
            {Object.entries(subjectsByClass).map(([classGroupKey, classSubjects]) => (
              <View key={classGroupKey} style={{ backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <View style={{ backgroundColor: '#F8FAFC', padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '600', fontSize: 16 }}>{classGroupKey}</Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textMuted, backgroundColor: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    {classSubjects.length} Subjects
                  </Text>
                </View>
                <View style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {classSubjects.map(subject => (
                    <View key={subject.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', paddingLeft: 12, paddingRight: 4, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      {(!isEditMode || !isValidUUID(subject.id) || unlockedIds.has(subject.id)) ? (
                        <TextInput
                          style={{ fontWeight: '500', fontSize: 13, minWidth: 60, padding: 0 }}
                          value={subject.name}
                          autoFocus={unlockedIds.has(subject.id)}
                          onChangeText={(v) => {
                            const next = subjects.map(s => s.id === subject.id ? { ...s, name: v } : s);
                            setSubjects(next);
                          }}
                        />
                      ) : (
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                          onPress={() => {
                            const next = new Set(unlockedIds);
                            next.add(subject.id);
                            setUnlockedIds(next);
                          }}
                        >
                          <Text style={{ fontWeight: '500', fontSize: 13 }}>{subject.name}</Text>
                          <Pencil size={12} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        style={{ padding: 6 }}
                        onPress={() => removeSubject(subject.id)}
                      >
                        <Trash2 size={14} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
        {isEditMode && (
          <TouchableOpacity 
            style={[styles.saveProgressBtn, { marginTop: 24, borderStyle: 'solid' }]} 
            onPress={() => handleSaveStep(4)}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.saveProgressBtnText}>Save Subjects</Text>}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderReview = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Summary</Text>
      
      <View style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Institution</Text>
          <Text style={styles.reviewValue}>{basicInfo.name}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Code</Text>
          <Text style={styles.reviewValue}>{basicInfo.school_code}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Admin</Text>
          <Text style={styles.reviewValue}>{adminInfo.email}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Structure</Text>
          <Text style={styles.reviewValue}>{structure.length} Groups</Text>
        </View>
      </View>

      <Text style={styles.warningText}>
        Proceeding will create the institution record and provision the admin account. This action cannot be easily undone.
      </Text>
    </View>
  );

  const handleNext = () => {
    if (!isSecurityMode) {
      if (currentStep === 1) {
        if (!basicInfo.name || !basicInfo.school_code) return showAlert('Missing Info', 'Please fill name and code.', 'warning');
      }
      
      if (currentStep === 2 && !isEditMode) {
        if (!adminInfo.email) return showAlert('Missing Info', 'Please provide an admin email address.', 'warning');
        if (!adminInfo.password || adminInfo.password.length < 6) {
          return showAlert('Weak Password', 'The admin password must be at least 6 characters long.', 'warning');
        }
      }
      
      if (currentStep === 2 && isEditMode) {
        const emailChanged = adminInfo.email !== existingCreds.email;
        const passwordChanged = adminInfo.password !== '';
        
        if ((emailChanged || passwordChanged) && !credentialsVerified) {
          return showAlert('Verification Required', 'Please verify old credentials before changing admin email or password.', 'warning');
        }
      }

      if (currentStep < 5) { // Max steps for non-security
        // Special logic to skip Step 2 if in edit mode (since it's now separated)
        if (isEditMode && currentStep === 1) {
          setCurrentStep(3); // Skip Admin Account
        } else {
          setCurrentStep(currentStep + 1);
        }
      } else {
        handleSubmit();
      }
    } else {
      // In security mode, we only have one step (which is rendered directly)
      // and "Continue" should trigger submit.
      handleSubmit();
    }
  };

  const handleSaveStep = async (stepId: number) => {
    try {
      setSubmitting(true);
      
      if (stepId === 1) {
        // Partial Save: Basic Info
        let finalLogoUrl = (logo && logo.startsWith('http')) ? logo : null;
        if (logo && !logo.startsWith('http')) {
          const fileExt = logo.split('.').pop() || 'jpeg';
          const fileName = `${basicInfo.school_code}-${Math.random()}.${fileExt}`;
          try {
            const { publicUrl } = await uploadToSupabaseStorage({
              bucket: 'logos',
              path: fileName,
              uri: logo,
              mimeType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
              upsert: true,
            });
            if (publicUrl && publicUrl.startsWith('http')) {
              finalLogoUrl = publicUrl;
            }
          } catch (uploadError) {
            console.error('[Onboarding Logo Upload Error]:', uploadError);
          }
        }

        const { error } = await (supabase.from('institutions') as any).upsert({
          institution_id: basicInfo.school_code,
          name: basicInfo.name,
          type: basicInfo.type,
          address: basicInfo.address,
          city: basicInfo.city,
          state: basicInfo.state,
          email: basicInfo.email,
          phone: basicInfo.phone,
          current_academic_year: basicInfo.academic_year,
          logo_url: finalLogoUrl,
          office_phone: basicInfo.office_phone,
          guard_phone: basicInfo.guard_phone,
          transport_phone: basicInfo.transport_phone,
          allowed_roles: basicInfo.allowed_roles,
        }, { onConflict: 'institution_id' });
        if (error) throw error;
        showAlert('Saved', 'Basic information updated successfully.', 'success');
      } 
      
      else if (stepId === 2) {
        // Partial Save: Admin
        if (!credentialsVerified && (adminInfo.email !== existingCreds.email || adminInfo.password !== '')) {
          return showAlert('Verification Required', 'Verify old credentials first.', 'warning');
        }
        
        const updates: any = {};
        if (adminInfo.email !== existingCreds.email) updates.admin_email = adminInfo.email;
        if (adminInfo.password !== '') updates.admin_password = adminInfo.password;

        if (Object.keys(updates).length > 0) {
          const { error } = await (supabase.from('institutions') as any)
            .update(updates)
            .eq('institution_id', basicInfo.school_code);
          if (error) throw error;

          // Also trigger edge function to update auth
          await supabase.functions.invoke('create-user', {
            body: {
              email: adminInfo.email,
              password: adminInfo.password || undefined,
              role: 'institution',
              institution_id: basicInfo.school_code,
              staff_id: `ADM-${basicInfo.school_code}`
            }
          });
          showAlert('Saved', 'Admin credentials updated.', 'success');
        } else {
          showAlert('Info', 'No changes to save.', 'info');
        }
      }

      else if (stepId === 3) {
        // Partial Save: Structure
        if (structure.length === 0) return showAlert('Empty', 'Add some structure first.', 'warning');
        
        for (const group of structure) {
          const { data: gData, error: gError } = await (supabase.from('groups') as any)
            .upsert([{ name: group.name, institution_id: basicInfo.school_code }], { onConflict: 'institution_id,name' })
            .select().single();
          if (gError) throw gError;
          const gId = gData.id;

          const classesToUpsert = group.classes.map((c: any) => {
            const classObj: any = {
              group_id: gId,
              name: c.name,
              sections: c.sections,
              class_order: c.class_order || 0,
              is_final_class: c.is_final_class || false,
              academic_year: basicInfo.academic_year,
              institution_id: basicInfo.school_code
            };
            
            if (c.id && isValidUUID(c.id)) {
              classObj.id = c.id;
            }
            
            return classObj;
          });

          const { error: cError } = await (supabase.from('classes') as any).upsert(classesToUpsert, { 
            onConflict: 'institution_id,group_id,name,academic_year'
          });
          if (cError) throw cError;
        }
        showAlert('Saved', 'Institution structure updated.', 'success');
      }

      else if (stepId === 4) {
        // Partial Save: Subjects
        if (subjects.length === 0) return showAlert('Empty', 'Add some subjects first.', 'warning');
        
        const subjectsToUpsert = subjects.map(sub => {
          const subObj: any = {
            institution_id: basicInfo.school_code,
            name: sub.name,
            code: sub.code || '',
            class_name: sub.className,
            group_name: sub.group || 'Core'
          };
          
          if (sub.id && isValidUUID(String(sub.id))) {
            subObj.id = sub.id;
          }
          
          return subObj;
        });
        
        const { error } = await (supabase.from('subjects') as any).upsert(subjectsToUpsert, {
          onConflict: 'institution_id,name,class_name'
        });
        if (error) throw error;
        showAlert('Saved', 'Subjects updated successfully.', 'success');
      }

    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // 1. Upload Logo if it's a new local URI (Skip in security mode)
      let finalLogoUrl = (logo && logo.startsWith('http')) ? logo : null;
      if (!isSecurityMode && logo && !logo.startsWith('http')) {
        const fileExt = logo.split('.').pop() || 'jpeg';
        const fileName = `${basicInfo.school_code}-${Math.random()}.${fileExt}`;
        try {
          const { publicUrl } = await uploadToSupabaseStorage({
            bucket: 'logos',
            path: fileName,
            uri: logo,
            mimeType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
            upsert: true,
          });
          if (publicUrl && publicUrl.startsWith('http')) {
            finalLogoUrl = publicUrl;
          }
        } catch (uploadError) {
          console.error('[Onboarding Final Logo Upload Error]:', uploadError);
        }
      }

      // 2. Create/Update Institution (Skip in security mode unless it's a new institution)
      if (!isSecurityMode) {
        const instData: any = {
          institution_id: basicInfo.school_code,
          name: basicInfo.name,
          type: basicInfo.type,
          address: basicInfo.address,
          city: basicInfo.city,
          state: basicInfo.state,
          email: basicInfo.email,
          phone: basicInfo.phone,
          current_academic_year: basicInfo.academic_year,
          academic_year: basicInfo.academic_year,
          logo_url: finalLogoUrl,
          office_phone: basicInfo.office_phone,
          guard_phone: basicInfo.guard_phone,
          transport_phone: basicInfo.transport_phone,
          allowed_roles: basicInfo.allowed_roles,
          // Only set status on new creation; omit it entirely on edit to preserve existing value
          ...(isEditMode ? {} : { status: 'active' }),
          // Include admin credentials during new creation
          ...(!isEditMode && adminInfo.email ? { admin_email: adminInfo.email } : {}),
          ...(!isEditMode && adminInfo.password ? { admin_password: adminInfo.password } : {}),
        };

        const { error: instError } = await (supabase
          .from('institutions') as any)
          .upsert([instData], { onConflict: 'institution_id' });

        if (instError) throw instError;
      }

      // 3. Provision or Update Admin
      const emailChanged = adminInfo.email !== existingCreds.email;
      const passwordChanged = adminInfo.password !== '';

      if (!isEditMode && adminInfo.email && adminInfo.password) {
        // New Onboarding Provisioning
        const { error: adminError } = await supabase.functions.invoke('create-user', {
          body: {
            email: adminInfo.email,
            password: adminInfo.password,
            role: 'institution',
            full_name: `${basicInfo.name} Admin`,
            institution_id: basicInfo.school_code,
            staff_id: `ADM-${basicInfo.school_code}`
          }
        });
        if (adminError) {
          console.warn('Admin provisioning failed:', adminError);
          setSubmitting(false);

          // Try to extract detailed error from response body if possible
          let errorMsg = adminError.message || 'Unknown error';
          try {
            // In newer Supabase JS versions, the error context contains response detail
            if ((adminError as any).context && typeof (adminError as any).context.json === 'function') {
               const detail = await (adminError as any).context.json();
               if (detail && detail.error) errorMsg = detail.error;
            }
          } catch (e) {
            console.error('Failed to parse error detail:', e);
          }

          if (errorMsg.toLowerCase().includes('already registered')) {
             return showAlert('Account Exists', 'This admin email is already registered in the system. If you want to link this institution to that account, please ensure the School Code matches.', 'info');
          }
          return showAlert('Provisioning Failed', `Admin account could not be created: ${errorMsg}. Please try a different email or check if it already exists.`, 'error');
        }
      } else if (isEditMode && credentialsVerified && (emailChanged || passwordChanged)) {
        // Update existing Admin
        const { error: adminError } = await supabase.functions.invoke('create-user', {
          body: {
            email: adminInfo.email,
            password: adminInfo.password || undefined, // Only send if changed
            role: 'institution',
            full_name: `${basicInfo.name} Admin`,
            institution_id: basicInfo.school_code,
            staff_id: `ADM-${basicInfo.school_code}`
          }
        });
        if (adminError) {
          console.warn('Admin update failed:', adminError);
          setSubmitting(false);
          return showAlert('Update Failed', `Admin account details could not be updated: ${adminError.message || 'Unknown error'}.`, 'error');
        }

        // Also update the institution record's admin fields specifically
        const updates: any = {};
        if (emailChanged) updates.admin_email = adminInfo.email;
        if (passwordChanged) updates.admin_password = adminInfo.password;

        if (Object.keys(updates).length > 0) {
          await (supabase.from('institutions') as any)
            .update(updates)
            .eq('institution_id', basicInfo.school_code);
        }
      }

      // 4. Setup Structure (Skip in security mode)
      if (!isSecurityMode && structure.length > 0) {
        for (const group of structure) {
          const { data: gData, error: gError } = await (supabase.from('groups') as any)
            .upsert([{ name: group.name, institution_id: basicInfo.school_code }], { onConflict: 'institution_id,name' })
            .select().single();
          
          if (gError) throw gError;
          const gId = gData.id;
            
          if (gId) {
            const classesToUpsert = group.classes.map((c: { id?: string, name: string, sections?: string[], class_order?: number, is_final_class?: boolean }) => {
              const className = typeof c === 'string' ? c : c.name;
              const classObj: any = {
                group_id: gId,
                name: className,
                sections: c.sections || ['A', 'B'],
                class_order: c.class_order || 0,
                is_final_class: c.is_final_class || false,
                academic_year: basicInfo.academic_year,
                institution_id: basicInfo.school_code
              };
              
              if (c.id && isValidUUID(String(c.id))) {
                classObj.id = c.id;
              }
              
              return classObj;
            }).filter((c: { name: string }) => c.name);

            if (classesToUpsert.length > 0) {
              const { error: cError } = await (supabase.from('classes') as any).upsert(classesToUpsert, { 
                onConflict: 'institution_id,group_id,name,academic_year' 
              });
              if (cError) throw cError;
            }
          }
        }
      }
      
      // 5. Setup Subjects (Skip in security mode)
      if (!isSecurityMode && subjects.length > 0) {
        const subjectsToUpsert = subjects.map(sub => {
          const subObj: any = {
            institution_id: basicInfo.school_code,
            name: sub.name,
            code: sub.code || '',
            class_name: sub.className,
            group_name: sub.group || 'Core'
          };
          
          if (sub.id && isValidUUID(String(sub.id))) {
            subObj.id = sub.id;
          }
          
          return subObj;
        });
        
        // Upsert by natural key to prevent duplicates
        await (supabase.from('subjects') as any).upsert(subjectsToUpsert, {
          onConflict: 'institution_id,name,class_name'
        });
      }
      
      showAlert('Success', isSecurityMode ? 'Admin credentials updated!' : 'Institution onboarding completed!', 'success', () => {
        router.replace('/admin/institutions');
      });
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={theme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(100, insets.bottom + 40) }]}>
        <PageHeader 
          title={isEditMode ? "Edit Institution" : "New Onboarding"} 
          subtitle="Follow the steps to setup the network node" 
        />
        
        {renderStepIndicator()}

        {isSecurityMode ? (
          renderAdminAccount()
        ) : (
          <>
            {currentStep === 1 && renderBasicInfo()}
            {currentStep === 2 && renderAdminAccount()}
            {currentStep === 3 && renderStructure()}
            {currentStep === 4 && renderSubjects()}
            {currentStep === 5 && renderReview()}
          </>
        )}

        <View style={styles.navButtons}>
          <View style={{ flex: 1, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {currentStep > 1 && (
                <TouchableOpacity 
                  style={styles.backBtn} 
                  onPress={() => setCurrentStep(currentStep - 1)}
                  disabled={submitting}
                >
                  <ChevronLeft size={20} color={theme.colors.text} {...({} as any)} />
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.nextBtn, (currentStep === 1 || isSecurityMode) && { flex: 1 }]} 
                onPress={handleNext}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.nextBtnText}>
                      {currentStep === steps.length || isSecurityMode ? 'Confirm & Finish' : 'Continue'}
                    </Text>
                    {currentStep < steps.length && !isSecurityMode && <ChevronRight size={20} color="white" {...({} as any)} />}
                  </>
                )}
              </TouchableOpacity>
            </View>

            {isEditMode && currentStep < 5 && (
              <TouchableOpacity 
                style={styles.saveProgressBtn}
                onPress={() => handleSaveStep(currentStep)}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <Text style={styles.saveProgressBtnText}>Save Progress</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Logo Preview Modal */}
      <Modal visible={showLogoPreview} transparent animationType="fade" onRequestClose={cancelLogo}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 24, width: '100%', maxWidth: 360, overflow: 'hidden' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center', paddingTop: 24, paddingBottom: 12 }}>Preview Logo</Text>
            <View style={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 24 }}>
              {pendingLogo && (
                <Image source={{ uri: pendingLogo }} style={{ width: 180, height: 180, borderRadius: 24, borderWidth: 2, borderColor: '#F1F5F9' }} resizeMode="contain" />
              )}
            </View>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 16, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9' }} onPress={cancelLogo}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#EF4444' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 16, alignItems: 'center' }} onPress={confirmLogo}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.primary }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AlertModal 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => {
          setAlert({ ...alert, visible: false });
          if (alert.onClose) alert.onClose();
        }}
        buttons={alert.buttons}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: theme.metrics.normalize(16), paddingBottom: 100 },
  indicatorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 0 },
  stepWrapper: { alignItems: 'center', zIndex: 1, flex: 1, minWidth: 40 },
  stepIcon: { width: theme.metrics.normalize(32), height: theme.metrics.normalize(32), borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  activeStepIcon: { backgroundColor: theme.colors.primary },
  completedStepIcon: { backgroundColor: '#10B981' },
  stepLabel: { fontSize: theme.metrics.normalize(8), fontWeight: 'bold', color: theme.colors.textMuted, marginTop: 4, textAlign: 'center' as const },
  activeStepLabel: { color: theme.colors.primary },
  stepLine: { flex: 1, height: 2, backgroundColor: '#F1F5F9', marginHorizontal: 4, marginTop: -12 },
  activeStepLine: { backgroundColor: '#10B981' },
  formContainer: { backgroundColor: 'white', borderRadius: 20, padding: theme.metrics.normalize(16), borderWidth: 1, borderColor: '#F1F5F9' },
  sectionTitle: { fontSize: theme.metrics.normalize(16), fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: theme.metrics.normalize(12), fontWeight: 'bold', color: theme.colors.text, marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: theme.metrics.normalize(14), fontSize: theme.metrics.normalize(14), borderWidth: 1, borderColor: '#E2E8F0', color: theme.colors.text },
  grid: { flexDirection: 'row', gap: 12 },
  logoUpload: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  logoBtn: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.primary },
  uploadedLogo: { width: '100%', height: '100%', borderRadius: 16 },
  uploadTitle: { fontSize: theme.metrics.normalize(14), fontWeight: 'bold', color: theme.colors.text },
  uploadSubtitle: { fontSize: theme.metrics.normalize(11), color: theme.colors.textMuted, marginTop: 2 },
  navButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  backBtn: { height: 56, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 8 },
  backBtnText: { fontWeight: 'bold', color: theme.colors.text },
  nextBtn: { flex: 2, height: 56, borderRadius: 16, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  saveProgressBtn: { height: 48, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(52, 102, 246, 0.05)' },
  saveProgressBtnText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 },
  helperText: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 20 },
  flexRow: { flexDirection: 'row', alignItems: 'center' },
  emptyStructure: { height: 120, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, marginBottom: 16 },
  emptyText: { fontSize: 12, color: theme.colors.textMuted, marginTop: 8 },
  groupCard: { padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 12 },
  groupName: { flex: 1, fontWeight: 'bold', fontSize: 14 },
  classCount: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
  outlineBtn: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.primary, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  outlineBtnText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 14 },
  reviewCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 16 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  reviewLabel: { fontSize: 12, color: theme.colors.textMuted },
  reviewValue: { fontSize: 12, fontWeight: 'bold', color: theme.colors.text },
  warningText: { fontSize: 11, color: '#F59E0B', textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 10 },
});
