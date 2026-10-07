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
  Pencil,
  ArrowLeft,
  ArrowRight,
  Layers,
  Sparkles
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { uploadToSupabaseStorage } from '../../../../src/utils/fileUpload';
import { StakeholderManagementModal } from '../../../../src/components/stakeholder/StakeholderManagementModal';
import { FormField } from '../../../../src/components/common/FormField';
import { Select } from '../../../../src/components/common/Select';
import { Button } from '../../../../src/components/common/Button';
import { LocationMapPreview } from '../../../../src/components/common/LocationMapPreview';

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
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
    map_link: '',
    has_kg: false,
    academic_stages: ['primary', 'middle', 'secondary'] as string[],
    email: '',
    phone: '',
    academic_year: '2025-26',
    school_code: '',
    office_phone: '',
    guard_phone: '',
    transport_phone: '',
    allowed_roles: { canteen: true, finance: true, transport: true },
  });

  const [departments, setDepartments] = useState<{ id?: string; name: string; code?: string; description?: string }[]>([]);
  const [newDeptInput, setNewDeptInput] = useState('');
  const [newDeptCodeInput, setNewDeptCodeInput] = useState('');
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

  const [isStakeholderModalOpen, setIsStakeholderModalOpen] = useState(false);
  const [createdInstData, setCreatedInstData] = useState<{ id: string; name: string } | null>(null);

  const showAlert = (title: string, message: string, type: any = 'info', onClose?: () => void, buttons?: any[]) => {
    setAlert({ visible: true, title, message, type, onClose, buttons });
  };  useFocusEffect(
    useCallback(() => {
      if ((isEditMode || isSecurityMode) && id) {
        fetchInstitutionData();
      } else if (!isEditMode && !isSecurityMode) {
        // Reset all form state for fresh "New Onboarding"
        setBasicInfo({
          name: '',
          type: 'school',
          address: '',
          address_line_1: '',
          address_line_2: '',
          city: '',
          state: '',
          pincode: '',
          latitude: '',
          longitude: '',
          map_link: '',
          has_kg: false,
          academic_stages: ['primary', 'middle', 'secondary'],
          email: '',
          phone: '',
          academic_year: '2025-26',
          school_code: '',
          office_phone: '',
          guard_phone: '',
          transport_phone: '',
          allowed_roles: { canteen: true, finance: true, transport: true },
        });
        setDepartments([]);
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
      const [instResult, groupsResult, subjectsResult, deptsResult] = await Promise.all([
        (supabase.from('institutions') as any).select('*').or(`institution_id.eq.${id},id.eq.${id}`).maybeSingle(),
        supabase.from('groups').select('id, name, classes(*)').or(`institution_id.eq.${id},institution_id.eq.${id}`),
        supabase.from('subjects').select('*').or(`institution_id.eq.${id},institution_id.eq.${id}`),
        (supabase.from('departments') as any).select('*').or(`institution_id.eq.${id},institution_id.eq.${id}`)
      ]);

      if (instResult.error) throw instResult.error;
      const data = instResult.data;

      if (data) {
        setBasicInfo({
          name: data.name,
          type: data.type,
          address: data.address || '',
          address_line_1: data.address_line_1 || data.address || '',
          address_line_2: data.address_line_2 || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
          latitude: data.latitude != null ? String(data.latitude) : '',
          longitude: data.longitude != null ? String(data.longitude) : '',
          map_link: data.map_link || '',
          has_kg: data.has_kg || false,
          academic_stages: data.academic_stages || ['primary', 'middle', 'secondary'],
          email: data.email || '',
          phone: data.phone || '',
          academic_year: data.current_academic_year || '2025-26',
          school_code: data.institution_id,
          office_phone: data.office_phone || '',
          guard_phone: data.guard_phone || '',
          transport_phone: data.transport_phone || '',
          allowed_roles: data.allowed_roles || { canteen: true, finance: true, transport: true },
        });

        // Load departments
        if (deptsResult?.data && deptsResult.data.length > 0) {
          setDepartments(deptsResult.data);
        } else {
          // Fallback to profiles table
          const { data: profs } = await (supabase.from('profiles') as any).select('department').eq('institution_id', id).not('department', 'is', null);
          const uniq = Array.from(new Set((profs as any[])?.map((p: any) => p.department).filter(Boolean)));
          if (uniq.length > 0) {
            setDepartments(uniq.map(d => ({ name: d as string })));
          }
        }

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

      <FormField
        label="Institution Name"
        required
        placeholder="e.g. Little Flowers Public School"
        value={basicInfo.name}
        onChangeText={(v) => setBasicInfo({...basicInfo, name: v})}
      />

      <View style={styles.grid}>
        <View style={{ flex: 1 }}>
          <FormField
            label="School Code"
            required
            placeholder="LFPS001"
            value={basicInfo.school_code}
            onChangeText={(v) => setBasicInfo({...basicInfo, school_code: v.toUpperCase()})}
            readOnly={isEditMode}
            disabledReason={isEditMode ? "Immutable after creation" : undefined}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Select
            label="Academic Year"
            required
            value={basicInfo.academic_year}
            options={[
              { label: '2024-25', value: '2024-25' },
              { label: '2025-26', value: '2025-26' },
              { label: '2026-27', value: '2026-27' },
              { label: '2027-28', value: '2027-28' },
            ]}
            onSelect={(v) => setBasicInfo({...basicInfo, academic_year: v})}
            placeholder="Select Year"
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Structured Campus Address</Text>
      <FormField
        label="Address Line 1"
        placeholder="Street address, building number"
        value={basicInfo.address_line_1}
        onChangeText={(v) => setBasicInfo({...basicInfo, address_line_1: v})}
      />

      <FormField
        label="Address Line 2"
        placeholder="Area, landmark, locality"
        value={basicInfo.address_line_2}
        onChangeText={(v) => setBasicInfo({...basicInfo, address_line_2: v})}
      />

      <View style={styles.grid}>
        <View style={{ flex: 1 }}>
          <FormField
            label="City"
            placeholder="City"
            value={basicInfo.city}
            onChangeText={(v) => setBasicInfo({...basicInfo, city: v})}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FormField
            label="State"
            placeholder="State"
            value={basicInfo.state}
            onChangeText={(v) => setBasicInfo({...basicInfo, state: v})}
          />
        </View>
      </View>

      <FormField
        label="Pincode / Postal Code"
        placeholder="e.g. 560001"
        keyboardType="numeric"
        value={basicInfo.pincode}
        onChangeText={(v) => setBasicInfo({...basicInfo, pincode: v})}
      />

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Geographic Location & Map</Text>
      <View style={styles.grid}>
        <View style={{ flex: 1 }}>
          <FormField
            label="Latitude"
            placeholder="e.g. 12.9716"
            keyboardType="numeric"
            value={basicInfo.latitude}
            onChangeText={(v) => setBasicInfo({...basicInfo, latitude: v})}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FormField
            label="Longitude"
            placeholder="e.g. 77.5946"
            keyboardType="numeric"
            value={basicInfo.longitude}
            onChangeText={(v) => setBasicInfo({...basicInfo, longitude: v})}
          />
        </View>
      </View>

      <FormField
        label="Map URL / Link (Optional)"
        placeholder="https://maps.google.com/..."
        value={basicInfo.map_link}
        onChangeText={(v) => setBasicInfo({...basicInfo, map_link: v})}
      />

      <LocationMapPreview
        addressLine1={basicInfo.address_line_1}
        addressLine2={basicInfo.address_line_2}
        city={basicInfo.city}
        state={basicInfo.state}
        pincode={basicInfo.pincode}
        latitude={basicInfo.latitude}
        longitude={basicInfo.longitude}
        mapLink={basicInfo.map_link}
        institutionName={basicInfo.name || 'Campus Location'}
      />

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Academic Stages & Kindergarten (KG)</Text>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: basicInfo.has_kg ? '#FEF3C7' : '#F8FAFC',
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: basicInfo.has_kg ? '#FDE68A' : '#E2E8F0',
          marginBottom: 12
        }}
        onPress={() => {
          const nextVal = !basicInfo.has_kg;
          const stages = new Set(basicInfo.academic_stages || []);
          if (nextVal) stages.add('pre_primary');
          else stages.delete('pre_primary');
          setBasicInfo({
            ...basicInfo,
            has_kg: nextVal,
            academic_stages: Array.from(stages)
          });
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: basicInfo.has_kg ? '#92400E' : theme.colors.text }}>
            Offers Kindergarten (Pre-KG, LKG, UKG)
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>
            Enable Kindergarten standards in admissions and academic structure
          </Text>
        </View>
        <View style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          backgroundColor: basicInfo.has_kg ? theme.colors.primary : '#CBD5E1',
          padding: 2,
          justifyContent: 'center',
          alignItems: basicInfo.has_kg ? 'flex-end' : 'flex-start'
        }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'white' }} />
        </View>
      </TouchableOpacity>

      <Text style={[styles.helperText, { marginBottom: 8 }]}>Configured Stages for this Institution:</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'pre_primary', label: 'Pre-Primary (KG)' },
          { id: 'primary', label: 'Primary (1st-5th)' },
          { id: 'middle', label: 'Middle (6th-8th)' },
          { id: 'secondary', label: 'High School (9th-10th)' },
          { id: 'higher_secondary', label: 'Higher Secondary (11th-12th)' },
        ].map(stage => {
          const isSelected = basicInfo.academic_stages?.includes(stage.id);
          return (
            <TouchableOpacity
              key={stage.id}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: isSelected ? theme.colors.primary : '#F1F5F9',
                borderWidth: 1,
                borderColor: isSelected ? theme.colors.primary : '#E2E8F0'
              }}
              onPress={() => {
                const current = new Set(basicInfo.academic_stages || []);
                if (current.has(stage.id)) {
                  current.delete(stage.id);
                } else {
                  current.add(stage.id);
                }
                const arr = Array.from(current);
                setBasicInfo({
                  ...basicInfo,
                  academic_stages: arr,
                  has_kg: arr.includes('pre_primary')
                });
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? 'white' : theme.colors.text }}>
                {stage.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FormField
        label="Official Email"
        placeholder="contact@school.com"
        keyboardType="email-address"
        value={basicInfo.email}
        onChangeText={(v) => setBasicInfo({...basicInfo, email: v})}
      />

      <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Emergency Contacts</Text>
      <FormField
        label="School Office Phone"
        placeholder="+91 00000 00000"
        keyboardType="phone-pad"
        value={basicInfo.office_phone}
        onChangeText={(v) => setBasicInfo({...basicInfo, office_phone: v})}
      />

      <View style={styles.grid}>
        <View style={{ flex: 1 }}>
          <FormField
            label="Main Guard Deck"
            placeholder="+91 00000 00000"
            keyboardType="phone-pad"
            value={basicInfo.guard_phone}
            onChangeText={(v) => setBasicInfo({...basicInfo, guard_phone: v})}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FormField
            label="Transport Dept"
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
        <Button
          title="Save Basic Info"
          onPress={() => handleSaveStep(1)}
          loading={submitting}
          variant="primary"
          style={{ marginTop: 24 }}
        />
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

  // Template 1: Full K-10 School Structure (KG + 1st to 10th)
  const applyK10Template = () => {
    const groups: any[] = [];
    let orderCounter = 1;

    // Pre-Primary (KG)
    if (basicInfo.has_kg || basicInfo.academic_stages?.includes('pre_primary')) {
      groups.push({
        id: 'stage_pre_primary',
        name: 'Pre-Primary (Kindergarten)',
        stage: 'pre_primary',
        classes: [
          { id: 'c_pkg', name: 'Pre-KG', stage: 'pre_primary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B'] },
          { id: 'c_lkg', name: 'LKG', stage: 'pre_primary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B'] },
          { id: 'c_ukg', name: 'UKG', stage: 'pre_primary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B'] },
        ]
      });
    }

    // Primary (1st to 5th)
    groups.push({
      id: 'stage_primary',
      name: 'Primary School (1st - 5th)',
      stage: 'primary',
      classes: [
        { id: 'c1', name: '1st Standard', stage: 'primary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B', 'C'] },
        { id: 'c2', name: '2nd Standard', stage: 'primary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B', 'C'] },
        { id: 'c3', name: '3rd Standard', stage: 'primary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B', 'C'] },
        { id: 'c4', name: '4th Standard', stage: 'primary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B', 'C'] },
        { id: 'c5', name: '5th Standard', stage: 'primary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B', 'C'] },
      ]
    });

    // Middle School (6th to 8th)
    groups.push({
      id: 'stage_middle',
      name: 'Middle School (6th - 8th)',
      stage: 'middle',
      classes: [
        { id: 'c6', name: '6th Standard', stage: 'middle', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B', 'C'] },
        { id: 'c7', name: '7th Standard', stage: 'middle', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B', 'C'] },
        { id: 'c8', name: '8th Standard', stage: 'middle', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B', 'C'] },
      ]
    });

    // High School / Secondary (9th to 10th)
    groups.push({
      id: 'stage_secondary',
      name: 'Secondary / High School (9th - 10th)',
      stage: 'secondary',
      classes: [
        { id: 'c9', name: '9th Standard', stage: 'secondary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B'] },
        { id: 'c10', name: '10th Standard', stage: 'secondary', class_order: orderCounter++, is_final_class: true, sections: ['A', 'B'] },
      ]
    });

    setStructure(groups);
  };

  const applyDefault = applyK10Template;

  const applyStandards1To10Template = () => {
    let orderCounter = 1;
    setStructure([
      {
        id: 'stage_primary',
        name: 'Primary School (1st - 5th)',
        stage: 'primary',
        classes: [
          { id: 'c1', name: '1st Standard', stage: 'primary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B'] },
          { id: 'c2', name: '2nd Standard', stage: 'primary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B'] },
          { id: 'c3', name: '3rd Standard', stage: 'primary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B'] },
          { id: 'c4', name: '4th Standard', stage: 'primary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B'] },
          { id: 'c5', name: '5th Standard', stage: 'primary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B'] },
        ]
      },
      {
        id: 'stage_middle',
        name: 'Middle School (6th - 8th)',
        stage: 'middle',
        classes: [
          { id: 'c6', name: '6th Standard', stage: 'middle', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B'] },
          { id: 'c7', name: '7th Standard', stage: 'middle', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B'] },
          { id: 'c8', name: '8th Standard', stage: 'middle', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B'] },
        ]
      },
      {
        id: 'stage_secondary',
        name: 'High School (9th - 10th)',
        stage: 'secondary',
        classes: [
          { id: 'c9', name: '9th Standard', stage: 'secondary', class_order: orderCounter++, is_final_class: false, sections: ['A', 'B'] },
          { id: 'c10', name: '10th Standard', stage: 'secondary', class_order: orderCounter++, is_final_class: true, sections: ['A', 'B'] },
        ]
      }
    ]);
  };

  const applyKGOnlyTemplate = () => {
    setStructure([
      {
        id: 'stage_pre_primary',
        name: 'Kindergarten (KG)',
        stage: 'pre_primary',
        classes: [
          { id: 'c_pkg', name: 'Pre-KG', stage: 'pre_primary', class_order: 1, is_final_class: false, sections: ['A', 'B'] },
          { id: 'c_lkg', name: 'LKG', stage: 'pre_primary', class_order: 2, is_final_class: false, sections: ['A', 'B'] },
          { id: 'c_ukg', name: 'UKG', stage: 'pre_primary', class_order: 3, is_final_class: true, sections: ['A', 'B'] },
        ]
      }
    ]);
  };

  const addGroup = () => {
    setStructure([...structure, { id: Date.now().toString(), name: '', stage: 'primary', classes: [] }]);
  };

  const removeGroup = (groupId: string) => {
    setStructure(structure.filter(g => g.id !== groupId));
  };

  const updateGroup = (groupId: string, name: string) => {
    setStructure(structure.map(g => g.id === groupId ? { ...g, name } : g));
  };

  const addClass = (groupId: string) => {
    const nextOrder = structure.flatMap(g => g.classes).length + 1;
    const targetGroup = structure.find(g => g.id === groupId);
    setStructure(structure.map(g =>
      g.id === groupId
        ? { ...g, classes: [...g.classes, { id: Date.now().toString(), name: '', stage: targetGroup?.stage || 'primary', class_order: nextOrder, is_final_class: false, sections: ['A'] }] }
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

  const removeClassWithGuard = async (groupId: string, classId: string, className: string) => {
    if (isEditMode && isValidUUID(classId)) {
      try {
        const { error } = await supabase.from('classes').delete().eq('id', classId);
        if (error) {
          showAlert('Deletion Prevented', error.message || 'Cannot delete class with active students, faculty, or timetable.', 'error');
          return;
        }
      } catch (err: any) {
        showAlert('Deletion Prevented', err.message, 'error');
        return;
      }
    }
    removeClass(groupId, classId);
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

  const moveSection = (groupId: string, classId: string, sectionIndex: number, direction: 'left' | 'right') => {
    setStructure(structure.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        classes: g.classes.map((c: any) => {
          if (c.id !== classId) return c;
          const newSections = [...c.sections];
          const targetIndex = direction === 'left' ? sectionIndex - 1 : sectionIndex + 1;
          if (targetIndex < 0 || targetIndex >= newSections.length) return c;
          const temp = newSections[sectionIndex];
          newSections[sectionIndex] = newSections[targetIndex];
          newSections[targetIndex] = temp;
          return { ...c, sections: newSections };
        })
      };
    }));
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

  const removeSectionWithGuard = async (groupId: string, classId: string, className: string, section: string) => {
    if (isEditMode && basicInfo.school_code) {
      try {
        const { count } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', basicInfo.school_code)
          .eq('class_name', className)
          .eq('section', section);

        if (count && count > 0) {
          showAlert('Deletion Prevented', `Cannot delete section "${section}" of standard "${className}": ${count} student(s) currently enrolled.`, 'error');
          return;
        }
      } catch (e: any) {
        console.warn('Section guard check:', e);
      }
    }
    removeSection(groupId, classId, section);
  };

  // Department Handlers
  const addDepartment = (name: string, code?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (departments.some(d => d.name.toLowerCase() === trimmed.toLowerCase())) {
      showAlert('Duplicate Department', `Department "${trimmed}" already exists.`, 'warning');
      return;
    }
    setDepartments([...departments, { name: trimmed, code: code || trimmed.slice(0, 4).toUpperCase() }]);
  };

  const removeDepartmentWithGuard = async (deptName: string, deptId?: string) => {
    if (isEditMode && basicInfo.school_code) {
      try {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('institution_id', basicInfo.school_code)
          .eq('department', deptName);

        if (count && count > 0) {
          showAlert('Deletion Prevented', `Cannot delete department "${deptName}": ${count} staff/faculty member(s) assigned.`, 'error');
          return;
        }

        if (deptId && isValidUUID(deptId)) {
          await (supabase.from('departments') as any).delete().eq('id', deptId);
        }
      } catch (err: any) {
        console.warn('Dept guard check:', err);
      }
    }
    setDepartments(departments.filter(d => d.name !== deptName));
  };

  const applyCommonDepartments = () => {
    const defaults = [
      { name: 'Mathematics', code: 'MATH' },
      { name: 'Science', code: 'SCI' },
      { name: 'English & Literature', code: 'ENG' },
      { name: 'Regional Languages', code: 'LANG' },
      { name: 'Social Studies & History', code: 'SOC' },
      { name: 'Computer Science & IT', code: 'CS' },
      { name: 'Physical Education & Sports', code: 'PET' },
      { name: 'School Administration', code: 'ADMIN' },
    ];
    const existingNames = new Set(departments.map(d => d.name.toLowerCase()));
    const toAdd = defaults.filter(d => !existingNames.has(d.name.toLowerCase()));
    setDepartments([...departments, ...toAdd]);
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

      {/* Quick Setup Templates */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>
          Standard Academic Templates:
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <TouchableOpacity 
            onPress={applyK10Template} 
            style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <School size={14} color="#B45309" />
            <Text style={{ color: '#B45309', fontWeight: '700', fontSize: 12 }}>Full K-10 (KG to 10th)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={applyStandards1To10Template} 
            style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <School size={14} color={theme.colors.text} />
            <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 12 }}>1st to 10th Standard</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={applyKGOnlyTemplate} 
            style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <School size={14} color={theme.colors.text} />
            <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 12 }}>Kindergarten (KG Only)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {structure.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40, borderWidth: 2, borderStyle: 'dashed', borderColor: '#E2E8F0', borderRadius: 12 }}>
          <School size={48} color={'#E2E8F0'} style={{ marginBottom: 16 }} />
          <Text style={{ color: theme.colors.textMuted }}>No structure defined yet. Apply a template above or add custom groups.</Text>
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
                            placeholder="Class Name (e.g. 1st Standard)"
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
                      <TouchableOpacity style={{ padding: 8 }} onPress={() => removeClassWithGuard(group.id, classItem.id, classItem.name)}>
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
                      
                      <Text style={{ fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' }}>SECTIONS (REORDERABLE):</Text>
                    </View>

                    {/* Section Badges with Reorder Controls */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {classItem.sections.map((section: string, sIdx: number) => (
                        <View key={section} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }}>
                          {sIdx > 0 && (
                            <TouchableOpacity onPress={() => moveSection(group.id, classItem.id, sIdx, 'left')}>
                              <ArrowLeft size={12} color="#B45309" />
                            </TouchableOpacity>
                          )}
                          <Text style={{ color: '#B45309', fontSize: 12, fontWeight: '700' }}>{section}</Text>
                          {sIdx < classItem.sections.length - 1 && (
                            <TouchableOpacity onPress={() => moveSection(group.id, classItem.id, sIdx, 'right')}>
                              <ArrowRight size={12} color="#B45309" />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => removeSectionWithGuard(group.id, classItem.id, classItem.name, section)}>
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

      {/* Academic Departments Configuration Panel */}
      <View style={{ marginTop: 28, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Layers size={20} color={theme.colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>Academic Departments</Text>
          </View>
          <TouchableOpacity 
            style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
            onPress={applyCommonDepartments}
          >
            <Sparkles size={14} color="#B45309" />
            <Text style={{ color: '#B45309', fontWeight: '600', fontSize: 11 }}>Add Defaults</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 12 }}>
          Configure academic departments for faculty assignments and school operations.
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <TextInput
            style={{ flex: 2, backgroundColor: '#F8FAFC', paddingHorizontal: 12, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 13 }}
            placeholder="Department Name (e.g. Science)"
            value={newDeptInput}
            onChangeText={setNewDeptInput}
          />
          <TextInput
            style={{ flex: 1, backgroundColor: '#F8FAFC', paddingHorizontal: 10, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 13 }}
            placeholder="Code (e.g. SCI)"
            value={newDeptCodeInput}
            onChangeText={setNewDeptCodeInput}
          />
          <TouchableOpacity
            style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 14, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => {
              if (newDeptInput.trim()) {
                addDepartment(newDeptInput.trim(), newDeptCodeInput.trim());
                setNewDeptInput('');
                setNewDeptCodeInput('');
              }
            }}
          >
            <Plus size={16} color="white" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {departments.length === 0 ? (
            <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic' }}>
              No departments configured yet. Click "Add Defaults" to populate common departments.
            </Text>
          ) : (
            departments.map((dept, dIdx) => (
              <View key={dIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#DBEAFE' }}>
                <Text style={{ color: '#1D4ED8', fontSize: 12, fontWeight: '600' }}>
                  {dept.name} {dept.code ? `[${dept.code}]` : ''}
                </Text>
                <TouchableOpacity onPress={() => removeDepartmentWithGuard(dept.name, dept.id)}>
                  <X size={14} color="#1D4ED8" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>

      {isEditMode && structure.length > 0 && (
        <TouchableOpacity 
          style={[styles.saveProgressBtn, { marginTop: 24, borderStyle: 'solid' }]} 
          onPress={() => handleSaveStep(3)}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.saveProgressBtnText}>Save Structure & Departments</Text>}
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
        let finalLogoUrl = (logo && logo.startsWith('http') && !logo.includes('127.0.0.1') && !logo.includes('localhost') && !logo.startsWith('blob:')) ? logo : null;
        if (logo && (!logo.startsWith('http') || logo.includes('127.0.0.1') || logo.includes('localhost') || logo.startsWith('blob:'))) {
          const rawExt = logo.split('?')[0].split('.').pop()?.toLowerCase() || 'png';
          const fileExt = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(rawExt) ? (rawExt === 'jpg' ? 'jpeg' : rawExt) : 'png';
          const fileName = `${basicInfo.school_code || 'inst'}-${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
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

        const fullAddr = [basicInfo.address_line_1, basicInfo.address_line_2, basicInfo.city, basicInfo.state, basicInfo.pincode].filter(Boolean).join(', ');

        const { error } = await (supabase.from('institutions') as any).upsert({
          institution_id: basicInfo.school_code,
          name: basicInfo.name,
          type: basicInfo.type,
          address: fullAddr || basicInfo.address,
          address_line_1: basicInfo.address_line_1,
          address_line_2: basicInfo.address_line_2,
          city: basicInfo.city,
          state: basicInfo.state,
          pincode: basicInfo.pincode,
          latitude: basicInfo.latitude ? parseFloat(basicInfo.latitude) : null,
          longitude: basicInfo.longitude ? parseFloat(basicInfo.longitude) : null,
          map_link: basicInfo.map_link,
          has_kg: basicInfo.has_kg,
          academic_stages: basicInfo.academic_stages,
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

        try {
          await (supabase as any).rpc('log_audit', {
            p_action: 'UPDATE',
            p_entity_type: 'institution',
            p_entity_id: basicInfo.school_code,
            p_institution_id: basicInfo.school_code,
            p_new_data: { name: basicInfo.name, address: fullAddr, stages: basicInfo.academic_stages }
          });
        } catch (e) {
          console.warn('[Audit Log]:', e);
        }

        showAlert('Saved', 'Basic information and campus location updated.', 'success');
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
        // Partial Save: Structure & Departments
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
              class_name: c.name,
              stage: c.stage || group.stage || 'primary',
              standard: c.name,
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

          // Upsert sections table
          for (const c of group.classes) {
            if (Array.isArray(c.sections) && c.sections.length > 0) {
              const secPayload = c.sections.map((secName: string, idx: number) => ({
                institution_id: basicInfo.school_code,
                class_id: c.id && isValidUUID(c.id) ? c.id : undefined,
                standard: c.name,
                name: secName,
                order_index: idx + 1
              }));
              await (supabase.from('sections') as any).upsert(secPayload, { onConflict: 'institution_id,standard,name' });
            }
          }
        }

        // Save Departments
        if (departments.length > 0) {
          const deptPayload = departments.map(d => ({
            institution_id: basicInfo.school_code,
            name: d.name,
            code: d.code || '',
            description: d.description || ''
          }));
          await (supabase.from('departments') as any).upsert(deptPayload, { onConflict: 'institution_id,name' });
        }

        try {
          await (supabase as any).rpc('log_audit', {
            p_action: 'UPDATE',
            p_entity_type: 'structure',
            p_entity_id: basicInfo.school_code,
            p_institution_id: basicInfo.school_code,
            p_new_data: { structureCount: structure.length, deptCount: departments.length }
          });
        } catch (e) {
          console.warn('[Audit error]:', e);
        }

        showAlert('Saved', 'Institution structure & departments updated.', 'success');
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
      let finalLogoUrl = (logo && logo.startsWith('http') && !logo.includes('127.0.0.1') && !logo.includes('localhost') && !logo.startsWith('blob:')) ? logo : null;
      if (!isSecurityMode && logo && (!logo.startsWith('http') || logo.includes('127.0.0.1') || logo.includes('localhost') || logo.startsWith('blob:'))) {
        const rawExt = logo.split('?')[0].split('.').pop()?.toLowerCase() || 'png';
        const fileExt = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(rawExt) ? (rawExt === 'jpg' ? 'jpeg' : rawExt) : 'png';
        const fileName = `${basicInfo.school_code || 'inst'}-${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
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
        const fullAddr = [basicInfo.address_line_1, basicInfo.address_line_2, basicInfo.city, basicInfo.state, basicInfo.pincode].filter(Boolean).join(', ');
        const instData: any = {
          institution_id: basicInfo.school_code,
          name: basicInfo.name,
          type: basicInfo.type,
          address: fullAddr || basicInfo.address,
          address_line_1: basicInfo.address_line_1,
          address_line_2: basicInfo.address_line_2,
          city: basicInfo.city,
          state: basicInfo.state,
          pincode: basicInfo.pincode,
          latitude: basicInfo.latitude ? parseFloat(basicInfo.latitude) : null,
          longitude: basicInfo.longitude ? parseFloat(basicInfo.longitude) : null,
          map_link: basicInfo.map_link,
          has_kg: basicInfo.has_kg,
          academic_stages: basicInfo.academic_stages,
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

        try {
          await (supabase as any).rpc('log_audit', {
            p_action: isEditMode ? 'UPDATE' : 'CREATE',
            p_entity_type: 'institution',
            p_entity_id: basicInfo.school_code,
            p_institution_id: basicInfo.school_code,
            p_new_data: { name: basicInfo.name, address: fullAddr, stages: basicInfo.academic_stages }
          });
        } catch (e) {
          console.warn('[Audit Log]:', e);
        }
      }

      // 3. Provision or Update Admin
      const targetInstId = basicInfo.school_code || (id as string) || 'global';
      const emailChanged = adminInfo.email !== existingCreds.email;
      const passwordChanged = adminInfo.password !== '';

      if (isSecurityMode) {
        // Direct security reset from SuperAdmin for Institution Admin credentials
        const { error: adminError } = await supabase.functions.invoke('create-user', {
          body: {
            email: adminInfo.email,
            password: adminInfo.password || `VidyonSetup_${targetInstId}`,
            reset_password: true,
            role: 'institution',
            full_name: `${basicInfo.name || 'Institution'} Admin`,
            institution_id: targetInstId,
            staff_id: `ADM-${targetInstId}`
          }
        });

        if (adminError) {
          console.warn('Security credentials update failed:', adminError);
          setSubmitting(false);
          let errorMsg = adminError.message || 'Unknown error';
          return showAlert('Update Failed', `Could not update credentials: ${errorMsg}.`, 'error');
        }

        // Also update institutions table admin_email and admin_password
        const updates: any = {};
        if (adminInfo.email) updates.admin_email = adminInfo.email;
        if (adminInfo.password) updates.admin_password = adminInfo.password;
        if (Object.keys(updates).length > 0) {
          await (supabase.from('institutions') as any)
            .update(updates)
            .or(`institution_id.eq.${targetInstId},id.eq.${targetInstId}`);
        }

        setSubmitting(false);
        showAlert(
          'Credentials Updated',
          'Institution Admin credentials have been reset successfully. On next login, the admin can set their password.',
          'success',
          () => router.replace('/admin/institutions')
        );
        return;
      } else if (!isEditMode && adminInfo.email && adminInfo.password) {
        // New Onboarding Provisioning
        const { error: adminError } = await supabase.functions.invoke('create-user', {
          body: {
            email: adminInfo.email,
            password: adminInfo.password,
            role: 'institution',
            full_name: `${basicInfo.name} Admin`,
            institution_id: targetInstId,
            staff_id: `ADM-${targetInstId}`
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
            institution_id: targetInstId,
            staff_id: `ADM-${targetInstId}`
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

      // 4. Setup Structure & Departments (Skip in security mode)
      if (!isSecurityMode && structure.length > 0) {
        for (const group of structure) {
          const { data: gData, error: gError } = await (supabase.from('groups') as any)
            .upsert([{ name: group.name, institution_id: basicInfo.school_code }], { onConflict: 'institution_id,name' })
            .select().single();
          
          if (gError) throw gError;
          const gId = gData.id;
            
          if (gId) {
            const classesToUpsert = group.classes.map((c: { id?: string, name: string, stage?: string, sections?: string[], class_order?: number, is_final_class?: boolean }) => {
              const className = typeof c === 'string' ? c : c.name;
              const classObj: any = {
                group_id: gId,
                name: className,
                class_name: className,
                stage: c.stage || group.stage || 'primary',
                standard: className,
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

              // Upsert sections table
              for (const c of group.classes) {
                if (Array.isArray(c.sections) && c.sections.length > 0) {
                  const secPayload = c.sections.map((secName: string, idx: number) => ({
                    institution_id: basicInfo.school_code,
                    class_id: c.id && isValidUUID(c.id) ? c.id : undefined,
                    standard: c.name,
                    name: secName,
                    order_index: idx + 1
                  }));
                  await (supabase.from('sections') as any).upsert(secPayload, { onConflict: 'institution_id,standard,name' });
                }
              }
            }
          }
        }

        // Save Departments
        if (departments.length > 0) {
          const deptPayload = departments.map(d => ({
            institution_id: basicInfo.school_code,
            name: d.name,
            code: d.code || '',
            description: d.description || ''
          }));
          await (supabase.from('departments') as any).upsert(deptPayload, { onConflict: 'institution_id,name' });
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
      
      if (!isSecurityMode && !isEditMode) {
        setCreatedInstData({ id: basicInfo.school_code, name: basicInfo.name });
        showAlert(
          'Institution Onboarding Complete!',
          `Institution "${basicInfo.name}" has been successfully created. Would you like to add Stakeholders (view-only board members/trustees) now?`,
          'success',
          undefined,
          [
            {
              text: 'Add Stakeholders',
              style: 'primary',
              onPress: () => {
                setAlert(prev => ({ ...prev, visible: false }));
                setIsStakeholderModalOpen(true);
              }
            },
            {
              text: 'Go to Institutions',
              style: 'secondary',
              onPress: () => {
                setAlert(prev => ({ ...prev, visible: false }));
                router.replace('/admin/institutions');
              }
            }
          ]
        );
      } else {
        showAlert('Success', isSecurityMode ? 'Admin credentials updated!' : 'Institution onboarding completed!', 'success', () => {
          router.replace('/admin/institutions');
        });
      }
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

      {createdInstData && (
        <StakeholderManagementModal
          visible={isStakeholderModalOpen}
          onClose={() => {
            setIsStakeholderModalOpen(false);
            router.replace('/admin/institutions');
          }}
          institutionId={createdInstData.id}
          institutionName={createdInstData.name}
        />
      )}
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
