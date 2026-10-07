import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { FormField } from '../../../../src/components/common/FormField';
import { Select } from '../../../../src/components/common/Select';
import { Button } from '../../../../src/components/common/Button';
import { useAdmissions, AdmissionRecord } from '../../../../src/hooks/useAdmissions';
import { useAuth } from '../../../../src/hooks/useAuth';
import { supabase } from '../../../../src/lib/supabase';
import {
  User,
  Phone,
  GraduationCap,
  Users,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Save,
} from 'lucide-react-native';

const STEPS = [
  { id: 1, title: 'Student', icon: User },
  { id: 2, title: 'Contact', icon: Phone },
  { id: 3, title: 'Academic', icon: GraduationCap },
  { id: 4, title: 'Guardian', icon: Users },
  { id: 5, title: 'Review', icon: CheckCircle },
];

const GENDER_OPTIONS = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
];

const BLOOD_GROUP_OPTIONS = [
  { label: 'A+', value: 'A+' },
  { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' },
  { label: 'B-', value: 'B-' },
  { label: 'O+', value: 'O+' },
  { label: 'O-', value: 'O-' },
  { label: 'AB+', value: 'AB+' },
  { label: 'AB-', value: 'AB-' },
];

const GUARDIAN_RELATION_OPTIONS = [
  { label: 'Father', value: 'Father' },
  { label: 'Mother', value: 'Mother' },
  { label: 'Guardian', value: 'Guardian' },
  { label: 'Grandparent', value: 'Grandparent' },
  { label: 'Other', value: 'Other' },
];

export default function AddAdmissionScreen() {
  const router = useRouter();
  const { institutionId } = useAuth();
  const { createAdmission, checkDuplicates } = useAdmissions();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [classesList, setClassesList] = useState<{ label: string; value: string }[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState<Partial<AdmissionRecord>>({
    student_name: '',
    date_of_birth: '',
    gender: 'Male',
    blood_group: '',
    nationality: 'Indian',
    aadhar_number: '',
    religion: '',
    mother_tongue: '',
    email: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    pincode: '',
    applying_for_class: '',
    applying_for_section: '',
    previous_school_name: '',
    previous_school_board: '',
    previous_class: '',
    previous_percentage: undefined,
    guardian_name: '',
    guardian_relation: 'Father',
    guardian_phone: '',
    guardian_email: '',
    guardian_occupation: '',
    guardian_address: '',
    guardian2_name: '',
    guardian2_phone: '',
    guardian2_relation: 'Mother',
  });

  // Fetch classes for dropdown
  useEffect(() => {
    async function loadClasses() {
      if (!institutionId) return;
      try {
        const { data, error } = await (supabase as any)
          .from('classes')
          .select('id, class_name, name')
          .eq('institution_id', institutionId);

        if (data && !error) {
          const uniqueClasses = Array.from(
            new Set(data.map((c: any) => c.class_name || c.name).filter(Boolean))
          );
          setClassesList(uniqueClasses.map((c) => ({ label: c as string, value: c as string })));
        }
      } catch (e) {
        console.warn('Failed to load classes for dropdown', e);
      }
    }
    loadClasses();
  }, [institutionId]);

  const updateField = (key: keyof AdmissionRecord, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Duplicate check trigger
  const runDuplicateCheck = async () => {
    if (form.student_name && (form.date_of_birth || form.guardian_phone)) {
      const duplicates = await checkDuplicates(
        form.student_name,
        form.date_of_birth || '',
        form.guardian_phone || form.phone || ''
      );
      if (duplicates && duplicates.length > 0) {
        const match = duplicates[0];
        setDuplicateWarning(
          `Potential duplicate record detected: "${match.student_name || match.name}" (${match.class_name || match.applying_for_class || 'Class N/A'}). Please verify before proceeding.`
        );
      } else {
        setDuplicateWarning(null);
      }
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!form.student_name?.trim()) {
        Alert.alert('Required Field', 'Please enter student full name');
        return;
      }
      runDuplicateCheck();
    } else if (currentStep === 3) {
      if (!form.applying_for_class) {
        Alert.alert('Required Field', 'Please select class applying for');
        return;
      }
    } else if (currentStep === 4) {
      if (!form.guardian_name?.trim() || !form.guardian_phone?.trim()) {
        Alert.alert('Required Field', 'Please provide primary guardian name and phone number');
        return;
      }
      runDuplicateCheck();
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const res = await createAdmission({
        ...form,
        status: 'submitted',
      });
      Alert.alert(
        'Admission Created',
        `Admission application ${res.admission_number || ''} submitted successfully!`,
        [
          {
            text: 'View Details',
            onPress: () => router.replace(`/(root)/institution/admissions/${res.id}` as any),
          },
          {
            text: 'Go to List',
            onPress: () => router.replace('/(root)/institution/admissions' as any),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit admission application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="New Admission Application"
        subtitle={`Step ${currentStep} of 5 — ${STEPS[currentStep - 1].title} Details`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
      />

      {/* Steps Indicator */}
      <View style={styles.stepsBar}>
        {STEPS.map((s, idx) => {
          const isDone = currentStep > s.id;
          const isCurrent = currentStep === s.id;
          const IconComponent = s.icon;
          return (
            <React.Fragment key={s.id}>
              <TouchableOpacity
                style={[
                  styles.stepBubble,
                  isCurrent && styles.stepBubbleCurrent,
                  isDone && styles.stepBubbleDone,
                ]}
                onPress={() => s.id < currentStep && setCurrentStep(s.id)}
                disabled={s.id > currentStep}
              >
                <IconComponent
                  size={16}
                  color={isCurrent || isDone ? '#FFFFFF' : theme.colors.textMuted}
                />
              </TouchableOpacity>
              {idx < STEPS.length - 1 && (
                <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Duplicate Warning Banner */}
        {duplicateWarning && (
          <View style={styles.warningBanner}>
            <AlertTriangle size={20} color="#F59E0B" style={{ marginRight: 10 }} />
            <Text style={styles.warningText}>{duplicateWarning}</Text>
          </View>
        )}

        {/* STEP 1: Student Personal Details */}
        {currentStep === 1 && (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Student Details</Text>
            <FormField
              label="Student Full Name"
              required
              value={form.student_name}
              onChangeText={(v) => updateField('student_name', v)}
              onBlur={runDuplicateCheck}
              placeholder="e.g. Rahul Sharma"
            />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Date of Birth"
                  value={form.date_of_birth || ''}
                  onChangeText={(v) => updateField('date_of_birth', v)}
                  onBlur={runDuplicateCheck}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.flex1}>
                <Select
                  label="Gender"
                  options={GENDER_OPTIONS}
                  value={form.gender || 'Male'}
                  onSelect={(v) => updateField('gender', v)}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Select
                  label="Blood Group"
                  options={BLOOD_GROUP_OPTIONS}
                  value={form.blood_group || ''}
                  onSelect={(v) => updateField('blood_group', v)}
                />
              </View>
              <View style={styles.flex1}>
                <FormField
                  label="Nationality"
                  value={form.nationality || 'Indian'}
                  onChangeText={(v) => updateField('nationality', v)}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Aadhar Number"
                  value={form.aadhar_number || ''}
                  onChangeText={(v) => updateField('aadhar_number', v)}
                  placeholder="12 digit UID"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.flex1}>
                <FormField
                  label="Mother Tongue"
                  value={form.mother_tongue || ''}
                  onChangeText={(v) => updateField('mother_tongue', v)}
                  placeholder="e.g. Hindi, Tamil"
                />
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: Contact Information */}
        {currentStep === 2 && (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Contact & Address</Text>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Student Email (Optional)"
                  value={form.email || ''}
                  onChangeText={(v) => updateField('email', v)}
                  placeholder="student@example.com"
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.flex1}>
                <FormField
                  label="Contact Phone"
                  value={form.phone || ''}
                  onChangeText={(v) => updateField('phone', v)}
                  placeholder="10 digit phone number"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <FormField
              label="Address Line 1"
              value={form.address_line_1 || ''}
              onChangeText={(v) => updateField('address_line_1', v)}
              placeholder="Door / Flat No, Building, Street"
            />
            <FormField
              label="Address Line 2 (Optional)"
              value={form.address_line_2 || ''}
              onChangeText={(v) => updateField('address_line_2', v)}
              placeholder="Area / Locality / Landmark"
            />

            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="City"
                  value={form.city || ''}
                  onChangeText={(v) => updateField('city', v)}
                  placeholder="City"
                />
              </View>
              <View style={styles.flex1}>
                <FormField
                  label="State"
                  value={form.state || ''}
                  onChangeText={(v) => updateField('state', v)}
                  placeholder="State"
                />
              </View>
              <View style={styles.flex1}>
                <FormField
                  label="Pincode"
                  value={form.pincode || ''}
                  onChangeText={(v) => updateField('pincode', v)}
                  placeholder="6 digit PIN"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        )}

        {/* STEP 3: Academic Details */}
        {currentStep === 3 && (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Academic Application</Text>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Select
                  label="Applying For Class"
                  required
                  options={classesList}
                  value={form.applying_for_class || ''}
                  onSelect={(v) => updateField('applying_for_class', v)}
                  placeholder="Select standard"
                />
              </View>
              <View style={styles.flex1}>
                <FormField
                  label="Preferred Section (Optional)"
                  value={form.applying_for_section || ''}
                  onChangeText={(v) => updateField('applying_for_section', v)}
                  placeholder="e.g. A, B"
                />
              </View>
            </View>

            <FormField
              label="Previous School Name (If Any)"
              value={form.previous_school_name || ''}
              onChangeText={(v) => updateField('previous_school_name', v)}
              placeholder="School name"
            />

            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Previous Board"
                  value={form.previous_school_board || ''}
                  onChangeText={(v) => updateField('previous_school_board', v)}
                  placeholder="CBSE, ICSE, State"
                />
              </View>
              <View style={styles.flex1}>
                <FormField
                  label="Previous Percentage (%)"
                  value={form.previous_percentage ? String(form.previous_percentage) : ''}
                  onChangeText={(v) => updateField('previous_percentage', v ? parseFloat(v) : null)}
                  placeholder="e.g. 88.5"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        )}

        {/* STEP 4: Guardian Details */}
        {currentStep === 4 && (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Primary Guardian</Text>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Guardian Full Name"
                  required
                  value={form.guardian_name || ''}
                  onChangeText={(v) => updateField('guardian_name', v)}
                  placeholder="Parent / Guardian Name"
                />
              </View>
              <View style={styles.flex1}>
                <Select
                  label="Relationship"
                  options={GUARDIAN_RELATION_OPTIONS}
                  value={form.guardian_relation || 'Father'}
                  onSelect={(v) => updateField('guardian_relation', v)}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Guardian Phone"
                  required
                  value={form.guardian_phone || ''}
                  onChangeText={(v) => updateField('guardian_phone', v)}
                  onBlur={runDuplicateCheck}
                  placeholder="10 digit mobile"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.flex1}>
                <FormField
                  label="Guardian Email"
                  value={form.guardian_email || ''}
                  onChangeText={(v) => updateField('guardian_email', v)}
                  placeholder="guardian@example.com"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <FormField
              label="Occupation"
              value={form.guardian_occupation || ''}
              onChangeText={(v) => updateField('guardian_occupation', v)}
              placeholder="e.g. Engineer, Business, Teacher"
            />

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Secondary Guardian (Optional)</Text>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <FormField
                  label="Second Guardian Name"
                  value={form.guardian2_name || ''}
                  onChangeText={(v) => updateField('guardian2_name', v)}
                  placeholder="Mother / Other Guardian"
                />
              </View>
              <View style={styles.flex1}>
                <FormField
                  label="Second Guardian Phone"
                  value={form.guardian2_phone || ''}
                  onChangeText={(v) => updateField('guardian2_phone', v)}
                  placeholder="Mobile"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        )}

        {/* STEP 5: Review & Submit */}
        {currentStep === 5 && (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Application Summary</Text>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Student Name:</Text>
              <Text style={styles.summaryValue}>{form.student_name}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Applying For Class:</Text>
              <Text style={styles.summaryValue}>
                {form.applying_for_class} {form.applying_for_section ? `(${form.applying_for_section})` : ''}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Gender / DOB:</Text>
              <Text style={styles.summaryValue}>
                {form.gender} {form.date_of_birth ? `• ${form.date_of_birth}` : ''}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Primary Guardian:</Text>
              <Text style={styles.summaryValue}>
                {form.guardian_name} ({form.guardian_relation}) • {form.guardian_phone}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Contact Address:</Text>
              <Text style={styles.summaryValue}>
                {[form.address_line_1, form.city, form.state, form.pincode].filter(Boolean).join(', ')}
              </Text>
            </View>
            {form.previous_school_name ? (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Previous School:</Text>
                <Text style={styles.summaryValue}>{form.previous_school_name}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.footerRow}>
          <Button
            title={currentStep === 1 ? 'Cancel' : 'Back'}
            variant="outline"
            icon={<ArrowLeft size={16} color={theme.colors.text} />}
            onPress={handleBack}
          />
          {currentStep < 5 ? (
            <Button
              title="Next Step"
              icon={<ArrowRight size={16} color="#FFFFFF" />}
              onPress={handleNext}
            />
          ) : (
            <Button
              title="Submit Application"
              icon={<Save size={16} color="#FFFFFF" />}
              loading={submitting}
              onPress={handleSubmit}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stepsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
  },
  stepBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubbleCurrent: {
    backgroundColor: theme.colors.primary,
  },
  stepBubbleDone: {
    backgroundColor: '#10B981',
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: theme.colors.glassBorder,
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: '#10B981',
  },
  scrollContent: {
    padding: 16,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: theme.borderRadius.m,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    color: '#D97706',
    fontSize: 13,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  summaryItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 40,
  },
});
