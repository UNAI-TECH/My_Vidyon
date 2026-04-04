import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useInstitutionTimetable } from '../../../../src/hooks/useInstitutionTimetable';
import { useInstitutionFaculty } from '../../../../src/hooks/useInstitutionFaculty';
import { PickerSheet } from '../../../../src/components/common/PickerSheet';
import { AlertModal } from '../../../../src/components/common/AlertModal';
import { 
  ArrowLeft, 
  Clock, 
  Save, 

  ChevronDown,
  Plus,
  MapPin,
  Coffee,
  Utensils,
  BookOpen
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function InstitutionTimetableEditScreen() {
  const { institutionId } = useAuth();
  const { facultyId, day } = useLocalSearchParams();
  const router = useRouter();
  
  const { slots, saveSlot, isLoading: isTimetableLoading } = useInstitutionTimetable(institutionId, facultyId as string);
  const { subjects, classes, assignments, isLoading: isDataLoading } = useInstitutionFaculty(institutionId);

  const assignedClasses = useMemo(() => {
    if (!facultyId || !classes.length) return [];
    
    // Get unique class-section combinations this faculty is assigned to
    const assignedKeys = new Set(
      (assignments as any[])
        .filter(a => a.faculty_profile_id === facultyId)
        .map(a => `${a.class_id}-${a.section}`)
    );

    return (classes as any[]).filter(c => assignedKeys.has(`${c.id}-${c.section}`));
  }, [classes, assignments, facultyId]);

  const [localSlots, setLocalSlots] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' } | null>(null);
  
  const [picker, setPicker] = useState<{ 
    visible: boolean; 
    title: string; 
    options: { label: string; value: any }[]; 
    selectedValue: any;
    onSelect: (val: any) => void;
  } | null>(null);

  // Initialize local slots from fetched data
  useEffect(() => {
    if (slots.length > 0 && day) {
      const filtered = slots
        .filter((s: any) => s.day_of_week === day)
        .map((s: any) => {
          // Attempt to find the section from assignments if it's missing in the slot
          // (Since the 'timetable' table doesn't store section)
          let resolvedSection = s.section;
          if (!resolvedSection && assignments.length > 0) {
            const match = (assignments as any[]).find(a => 
              a.faculty_profile_id === facultyId && 
              a.class_id === s.class_id && 
              a.subject_id === s.subject_id
            );
            if (match) resolvedSection = match.section;
          }

          return { 
            ...s, 
            section: resolvedSection || 'A',
            type: s.subject_id === 'break' ? 'break' : (s.subject_id === 'lunch' ? 'lunch' : 'period') 
          };
        });
      setLocalSlots(filtered.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time)));
    } else if (slots.length === 0 && !isTimetableLoading) {
      setLocalSlots([]);
    }
  }, [slots, day, assignments, isTimetableLoading]);

  const uniqueSubjects = useMemo(() => {
    const seen = new Set();
    return (subjects as any[]).filter(s => {
      const duplicate = seen.has(s.name);
      seen.add(s.name);
      return !duplicate;
    });
  }, [subjects]);

  const getFilteredOptions = (slot: any) => {
    if (slot.type === 'break' || slot.type === 'lunch') return [];
    
    // Filter assignments for this specific faculty and class/section
    const classAssignedSubjects = (assignments as any[])
      .filter(a => a.class_id === slot.class_id && a.section === slot.section && a.faculty_profile_id === facultyId)
      .map(a => a.subject_id);

    return uniqueSubjects
      .filter(s => classAssignedSubjects.includes(s.id))
      .map(s => ({ label: s.name, value: s.id }));
  };

  const handleTypeChange = (tempId: string, type: 'period' | 'break' | 'lunch') => {
    const slotIndex = localSlots.findIndex(s => s.id === tempId);
    if (slotIndex === -1) return;

    const prevEnd = slotIndex > 0 ? localSlots[slotIndex - 1].end_time : '09:00';
    let duration = 60;
    let label = 'Period';
    let subjectId = '';

    if (type === 'break') {
      duration = 15;
      label = 'Short Break';
      subjectId = 'break';
    } else if (type === 'lunch') {
      duration = 45;
      label = 'Lunch Break';
      subjectId = 'lunch';
    }

    const [h, m] = prevEnd.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m + duration);
    const endStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    setLocalSlots(prev => prev.map(s => s.id === tempId ? { 
      ...s, 
      type, 
      start_time: prevEnd, 
      end_time: endStr,
      subject_id: subjectId,
      room_number: type === 'period' ? s.room_number : ''
    } : s));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      for (const slot of localSlots) {
        if (!slot.subject_id) continue;
        const result = await saveSlot(slot);
        if (!result?.success) {
          throw new Error((result?.error as any)?.message || 'Failed to save a slot. Please check your connection.');
        }
      }
      setAlert({
        visible: true,
        title: "Success",
        message: "Timetable updated successfully",
        type: 'success'
      });
    } catch (err: any) {
      setAlert({
        visible: true,
        title: "Error",
        message: err.message || "Failed to save timetable changes",
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSlot = () => {
    const prevEnd = localSlots.length > 0 
      ? localSlots.sort((a, b) => a.start_time.localeCompare(b.start_time))[localSlots.length - 1].end_time 
      : '09:00';
    
    const [h, m] = prevEnd.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m + 60);
    const endStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    setLocalSlots([...localSlots, {
      id: `new-${Date.now()}`,
      day_of_week: day,
      type: 'period',
      start_time: prevEnd,
      end_time: endStr,
      subject_id: '',
      class_id: '',
      section: '',
      room_number: ''
    }].sort((a, b) => a.start_time.localeCompare(b.start_time)));
  };

  const updateSlot = (tempId: string, field: string, value: any) => {
    setLocalSlots(prev => prev.map(s => s.id === tempId ? { ...s, [field]: value } : s));
  };



  if (isTimetableLoading || isDataLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader 
        title={`Edit ${day}`} 
        subtitle="Institution Timetable Management"
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        }
        actions={
          <TouchableOpacity 
            style={[styles.saveBtn, isSaving && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Save size={20} color="white" {...({} as any)} />
            )}
            <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {localSlots.map((slot) => (
          <View key={slot.id} style={styles.editCard}>
            <View style={styles.cardHeader}>
              <View style={styles.periodBadge}>
                <Text style={styles.periodBadgeText}>Slot {slot.start_time}</Text>
              </View>
            </View>

            <View style={styles.formGrid}>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Slot Type</Text>
                  <TouchableOpacity 
                    style={styles.select} 
                    onPress={() => setPicker({
                      visible: true,
                      title: "Select Type",
                      options: [
                        { label: 'Regular Period', value: 'period' },
                        { label: 'Short Break', value: 'break' },
                        { label: 'Lunch Break', value: 'lunch' }
                      ],
                      selectedValue: slot.type,
                      onSelect: (val) => handleTypeChange(slot.id, val)
                    })}
                  >
                    <View style={styles.typeOption}>
                      {slot.type === 'break' ? <Coffee size={14} color={theme.colors.primary} /> : 
                       slot.type === 'lunch' ? <Utensils size={14} color={theme.colors.primary} /> :
                       <BookOpen size={14} color={theme.colors.primary} />}
                      <Text style={styles.selectText}>
                        {slot.type === 'break' ? 'Short Break' : slot.type === 'lunch' ? 'Lunch Break' : 'Regular Period'}
                      </Text>
                    </View>
                    <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
                  </TouchableOpacity>
                </View>

                {slot.type === 'period' && (
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Room</Text>
                    <View style={styles.inputWithIcon}>
                      <MapPin size={14} color={theme.colors.textMuted} {...({} as any)} />
                      <TextInput 
                        style={styles.flexInput} 
                        value={slot.room_number || ''} 
                        onChangeText={(v) => updateSlot(slot.id, 'room_number', v)}
                        placeholder="Room 101"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>
                )}
              </View>

              {slot.type === 'period' && (
                <>
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1.5 }]}>
                      <Text style={styles.label}>Class</Text>
                      <TouchableOpacity 
                        style={styles.select} 
                        onPress={() => setPicker({
                          visible: true,
                          title: "Select Class",
                          options: assignedClasses.map((c: any) => ({ label: `${c.name} - ${c.section}`, value: c.id })),
                          selectedValue: slot.class_id,
                          onSelect: (val) => {
                            const selectedClass = assignedClasses.find((c: any) => c.id === val);
                            updateSlot(slot.id, 'class_id', val);
                            if (selectedClass) updateSlot(slot.id, 'section', (selectedClass as any).section);
                            updateSlot(slot.id, 'subject_id', ''); 
                          }
                        })}
                      >
                        <Text style={[styles.selectText, !slot.class_id && styles.placeholder]}>
                          {slot.class_id ? `${(classes as any[]).find((c: any) => c.id === slot.class_id)?.name} - ${slot.section}` : 'Select Class'}
                        </Text>
                        <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.inputGroup, { flex: 1.5 }]}>
                      <Text style={styles.label}>Subject</Text>
                      <TouchableOpacity 
                        style={[styles.select, !slot.class_id && styles.disabledSelect]} 
                        disabled={!slot.class_id}
                        onPress={() => setPicker({
                          visible: true,
                          title: "Select Subject",
                          options: getFilteredOptions(slot),
                          selectedValue: slot.subject_id,
                          onSelect: (val) => updateSlot(slot.id, 'subject_id', val)
                        })}
                      >
                        <Text style={[styles.selectText, !slot.subject_id && styles.placeholder]}>
                          {uniqueSubjects.find((s: any) => s.id === slot.subject_id)?.name || 'Select Subject'}
                        </Text>
                        <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Start Time</Text>
                  <TextInput 
                    style={styles.input} 
                    value={slot.start_time} 
                    onChangeText={(v) => updateSlot(slot.id, 'start_time', v)}
                    placeholder="09:00"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>End Time</Text>
                  <TextInput 
                    style={styles.input} 
                    value={slot.end_time} 
                    onChangeText={(v) => updateSlot(slot.id, 'end_time', v)}
                    placeholder="10:00"
                  />
                </View>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addSlotBtn} onPress={handleAddSlot}>
          <Plus size={20} color={theme.colors.primary} {...({} as any)} />
          <Text style={styles.addSlotBtnText}>Add Period</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  saveBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  editCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 3, shadowColor: '#000', shadowOffset: { width:0, height:4 }, shadowOpacity:0.04, shadowRadius:12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  periodBadge: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  periodBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  formGrid: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  disabledSelect: { backgroundColor: '#F1F5F9', opacity: 0.6 },
  typeOption: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectText: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
  placeholder: { color: '#94A3B8' },
  input: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, color: theme.colors.text, fontWeight: '500' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  flexInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: theme.colors.text, fontWeight: '500' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  addSlotBtn: { padding: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,255,255,0.5)' },
  addSlotBtnText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }
});
