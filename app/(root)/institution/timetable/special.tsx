import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useInstitutionTimetable } from '../../../../src/hooks/useInstitutionTimetable';
import { useInstitutionFaculty } from '../../../../src/hooks/useInstitutionFaculty';
import { useInstitutionUsers } from '../../../../src/hooks/useInstitutionUsers';
import { PickerSheet } from '../../../../src/components/common/PickerSheet';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { CalendarModal } from '../../../../src/components/common/CalendarPicker';
import { 
  ArrowLeft, 
  Clock, 
  Save, 
  Calendar,
  ChevronDown,
  MapPin,
  BookOpen,
  User,
  Info
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';

export default function SpecialTimetableScreen() {
  const { institutionId } = useAuth();
  const router = useRouter();
  
  const { saveSpecialSlot } = useInstitutionTimetable(institutionId);
  const { subjects, classes, isLoading: isDataLoading } = useInstitutionFaculty(institutionId);
  const { staff } = useInstitutionUsers(institutionId);
  const faculties = useMemo(() => staff.filter((s: any) => s.role === 'teacher' || s.role === 'faculty'), [staff]);

  const [formData, setFormData] = useState({
    event_date: format(new Date(), 'yyyy-MM-dd'),
    class_id: '',
    section: 'A',
    subject_id: '',
    faculty_id: '',
    start_time: '09:00',
    end_time: '10:00',
    room_number: '',
    title: '',
    notes: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' } | null>(null);
  const [picker, setPicker] = useState<{ 
    visible: boolean; 
    title: string; 
    options: { label: string; value: any }[]; 
    selectedValue: any;
    onSelect: (val: any) => void;
  } | null>(null);

  const handleSave = async () => {
    if (!formData.class_id || !formData.faculty_id || !formData.subject_id) {
       setAlert({ visible: true, title: "Missing Info", message: "Please select Class, Faculty and Subject", type: 'error' });
       return;
    }

    try {
      setIsSaving(true);
      await saveSpecialSlot(formData);
      setAlert({
        visible: true,
        title: "Success",
        message: "Special class scheduled successfully",
        type: 'success'
      });
    } catch (err) {
      setAlert({
        visible: true,
        title: "Error",
        message: "Failed to save special class",
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isDataLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Special Class" 
        subtitle="Schedule one-off sessions"
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBox}>
          <Info size={18} color={theme.colors.primary} {...({} as any)} />
          <Text style={styles.infoText}>Special classes override or supplement the regular weekly schedule for a specific date.</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TouchableOpacity 
              style={styles.inputWithIcon} 
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={18} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={[styles.flexInput, !formData.event_date && styles.placeholder]}>
                {formData.event_date || 'Select Date'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Class</Text>
              <TouchableOpacity 
                style={styles.select} 
                onPress={() => setPicker({
                  visible: true,
                  title: "Select Class",
                  options: classes.map((c: any) => ({ label: c.name, value: c.id })),
                  selectedValue: formData.class_id,
                  onSelect: (val) => setFormData(f => ({ ...f, class_id: val }))
                })}
              >
                <Text style={[styles.selectText, !formData.class_id && styles.placeholder]}>
                  {formData.class_id ? (classes as any[]).find(c => c.id === formData.class_id)?.name : 'Select'}
                </Text>
                <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Section</Text>
              <TouchableOpacity 
                style={styles.select} 
                onPress={() => setPicker({
                  visible: true,
                  title: "Select Section",
                  options: ['A', 'B', 'C', 'D'].map(s => ({ label: s, value: s })),
                  selectedValue: formData.section,
                  onSelect: (val) => setFormData(f => ({ ...f, section: val }))
                })}
              >
                <Text style={styles.selectText}>{formData.section}</Text>
                <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Faculty</Text>
            <TouchableOpacity 
              style={styles.select} 
              onPress={() => setPicker({
                visible: true,
                title: "Select Faculty",
                options: faculties.map((f: any) => ({ label: f.full_name, value: f.id })),
                selectedValue: formData.faculty_id,
                onSelect: (val) => setFormData(f => ({ ...f, faculty_id: val }))
              })}
            >
              <View style={styles.selectorRow}>
                <User size={16} color={theme.colors.primary} {...({} as any)} />
                <Text style={[styles.selectText, !formData.faculty_id && styles.placeholder]}>
                  {formData.faculty_id ? (faculties as any[]).find(f => f.id === formData.faculty_id)?.full_name : 'Select Faculty'}
                </Text>
              </View>
              <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject</Text>
            <TouchableOpacity 
              style={styles.select} 
              onPress={() => setPicker({
                visible: true,
                title: "Select Subject",
                options: subjects.map((s: any) => ({ label: s.name, value: s.id })),
                selectedValue: formData.subject_id,
                onSelect: (val) => {
                  const sub = (subjects as any[]).find(s => s.id === val);
                  setFormData(f => ({ ...f, subject_id: val, title: sub?.name || '' }))
                }
              })}
            >
              <View style={styles.selectorRow}>
                <BookOpen size={16} color={theme.colors.primary} {...({} as any)} />
                <Text style={[styles.selectText, !formData.subject_id && styles.placeholder]}>
                  {formData.subject_id ? (subjects as any[]).find(s => s.id === formData.subject_id)?.name : 'Select Subject'}
                </Text>
              </View>
              <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Start Time</Text>
              <View style={styles.inputWithIcon}>
                <Clock size={16} color={theme.colors.textMuted} {...({} as any)} />
                <TextInput 
                  style={styles.flexInput} 
                  value={formData.start_time} 
                  onChangeText={(v) => setFormData(f => ({ ...f, start_time: v }))}
                  placeholder="09:00"
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>End Time</Text>
              <View style={styles.inputWithIcon}>
                <Clock size={16} color={theme.colors.textMuted} {...({} as any)} />
                <TextInput 
                  style={styles.flexInput} 
                  value={formData.end_time} 
                  onChangeText={(v) => setFormData(f => ({ ...f, end_time: v }))}
                  placeholder="10:00"
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Room Number</Text>
            <View style={styles.inputWithIcon}>
              <MapPin size={18} color={theme.colors.textMuted} {...({} as any)} />
              <TextInput 
                style={styles.flexInput} 
                value={formData.room_number} 
                onChangeText={(v) => setFormData(f => ({ ...f, room_number: v }))}
                placeholder="204"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, isSaving && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Save size={20} color="white" {...({} as any)} />
              <Text style={styles.saveBtnText}>Save Special Class</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {picker && (
        <PickerSheet
          visible={picker.visible}
          title={picker.title}
          options={picker.options}
          selectedValue={picker.selectedValue}
          onSelect={picker.onSelect}
          onClose={() => setPicker(null)}
        />
      )}

      {alert && (
        <AlertModal
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          type={alert.type}
          onClose={() => {
            setAlert(null);
            if (alert.type === 'success') router.back();
          }}
        />
      )}

      <CalendarModal
        visible={showDatePicker}
        title="Select Event Date"
        initialDate={formData.event_date}
        onSelect={(date) => setFormData(f => ({ ...f, event_date: date }))}
        onClose={() => setShowDatePicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  infoBox: { flexDirection: 'row', gap: 12, backgroundColor: '#F0F9FF', padding: 16, borderRadius: 16, marginBottom: 24, alignItems: 'center' },
  infoText: { flex: 1, fontSize: 13, color: '#0369A1', lineHeight: 18 },
  formCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, gap: 20, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 24 },
  inputGroup: { gap: 8 },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
  flexInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: theme.colors.text, fontWeight: '500' },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  selectorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectText: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
  placeholder: { color: '#94A3B8' },
  row: { flexDirection: 'row', gap: 16 },
  saveBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, borderRadius: 20 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }
});
