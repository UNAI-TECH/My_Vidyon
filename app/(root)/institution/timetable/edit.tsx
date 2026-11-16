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
  BookOpen,
  RotateCcw,
  Trash2,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  generateTemplateDailyGrid, 
  mergeSlotsWithTemplate, 
  formatTimeHHMM, 
  GeneratedTemplateSlot 
} from '../../../../src/utils/timetableUtils';
import { sortClasses } from '../../../../src/utils/classUtils';

export default function InstitutionTimetableEditScreen() {
  const { institutionId } = useAuth();
  const { facultyId, day } = useLocalSearchParams();
  const router = useRouter();
  
  const { 
    slots, 
    timetableConfig, 
    isConfigLoading, 
    saveDaySchedule, 
    isLoading: isTimetableLoading 
  } = useInstitutionTimetable(institutionId, facultyId as string);

  const { subjects, classes, assignments, isLoading: isDataLoading } = useInstitutionFaculty(institutionId);

  // Strictly filter classes to only those where this faculty has active subject assignments
  const assignedClasses = useMemo(() => {
    if (!classes || classes.length === 0 || !assignments || !facultyId) return [];
    
    // Find all assignment rows where this faculty is assigned as subject teacher
    const facultyAssignments = (assignments as any[]).filter(
      (a: any) => a.faculty_profile_id === facultyId && (a.assignment_type === 'subject_staff' || !a.assignment_type)
    );

    // Build set of assigned classId:::section (normalized uppercase)
    const assignedKeys = new Set(
      facultyAssignments.map((a: any) => `${a.class_id}:::${String(a.section || '').trim().toUpperCase()}`)
    );

    if (assignedKeys.size === 0) return [];

    // STRICT: Only return classes that this faculty is assigned to
    const filtered = (classes as any[]).filter((c: any) => 
      assignedKeys.has(`${c.id}:::${String(c.section || '').trim().toUpperCase()}`)
    );

    return sortClasses(filtered);
  }, [classes, assignments, facultyId]);

  const [localSlots, setLocalSlots] = useState<GeneratedTemplateSlot[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' } | null>(null);
  
  const [picker, setPicker] = useState<{ 
    visible: boolean; 
    title: string; 
    options: { label: string; value: any }[]; 
    selectedValue: any;
    onSelect: (val: any) => void;
  } | null>(null);

  // Initialize local slots from the institution bell schedule template + existing saved slots
  useEffect(() => {
    if (isTimetableLoading || isConfigLoading || !day) return;

    // 1. Generate full template grid (e.g. 8 periods + short breaks + lunch)
    const templateGrid = generateTemplateDailyGrid(timetableConfig, day as string);

    // 2. Merge existing saved slots for this day into the template grid
    const merged = mergeSlotsWithTemplate(templateGrid, slots, day as string, assignments, facultyId as string);

    setLocalSlots(merged);
  }, [slots, timetableConfig, day, assignments, facultyId, isTimetableLoading, isConfigLoading]);

  const uniqueSubjects = useMemo(() => {
    const seen = new Set();
    return (subjects as any[]).filter(s => {
      const duplicate = seen.has(s.name);
      seen.add(s.name);
      return !duplicate;
    });
  }, [subjects]);

  const getFilteredOptions = (slot: GeneratedTemplateSlot) => {
    if (slot.is_break || !slot.class_id || !facultyId) return [];
    
    // STRICT: Only subjects assigned to this faculty for this specific class and section
    const assignedSubjects = (assignments as any[])
      .filter(a => 
        a.faculty_profile_id === facultyId &&
        a.class_id === slot.class_id && 
        String(a.section || '').trim().toUpperCase() === String(slot.section || '').trim().toUpperCase() &&
        (a.assignment_type === 'subject_staff' || !a.assignment_type)
      )
      .map(a => a.subject_id);

    if (assignedSubjects.length === 0) return [];

    const assignedSubjectIds = new Set(assignedSubjects);
    const assignedSubjectNames = new Set(
      (subjects as any[])
        .filter((s: any) => assignedSubjectIds.has(s.id))
        .map((s: any) => s.name?.toLowerCase().trim())
    );

    // STRICT: Only return subjects assigned to this faculty for this class & section (NO unassigned fallback)
    return uniqueSubjects
      .filter(s => assignedSubjectIds.has(s.id) || assignedSubjectNames.has(s.name?.toLowerCase().trim()))
      .map(s => ({ label: s.name, value: s.id }));
  };

  const handleResetToTemplate = () => {
    const templateGrid = generateTemplateDailyGrid(timetableConfig, day as string);
    // Preserve class and subject assignments if already set, but reset timings
    const reset = templateGrid.map(tpl => {
      const existing = localSlots.find(s => s.period_index === tpl.period_index && !s.is_break);
      if (existing) {
        return {
          ...tpl,
          class_id: existing.class_id,
          section: existing.section,
          subject_id: existing.subject_id,
          room_number: existing.room_number,
        };
      }
      return tpl;
    });
    setLocalSlots(reset);
  };

  const handleClearPeriod = (slotId: string) => {
    setLocalSlots(prev => prev.map(s => s.id === slotId ? {
      ...s,
      class_id: '',
      section: '',
      subject_id: '',
      room_number: ''
    } : s));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const result = await saveDaySchedule(day as string, localSlots);
      if (!result?.success) {
        throw new Error((result?.error as any)?.message || 'Failed to save timetable changes.');
      }
      setAlert({
        visible: true,
        title: "Success",
        message: `${day}'s timetable saved according to template`,
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

  const handleAddExtraSlot = () => {
    const prevEnd = localSlots.length > 0 
      ? localSlots[localSlots.length - 1].end_time 
      : '09:00';
    
    const [h, m] = prevEnd.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m + 45);
    const endStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    const newSlot: GeneratedTemplateSlot = {
      id: `extra-${Date.now()}`,
      period_index: localSlots.length + 1,
      label: `Extra Period ${localSlots.length + 1}`,
      type: 'period',
      start_time: prevEnd,
      end_time: endStr,
      duration: 45,
      is_break: false,
      subject_id: '',
      class_id: '',
      section: 'A',
      room_number: ''
    };

    setLocalSlots([...localSlots, newSlot]);
  };

  const updateSlot = (tempId: string, field: string, value: any) => {
    setLocalSlots(prev => prev.map(s => s.id === tempId ? { ...s, [field]: value } : s));
  };

  if (isTimetableLoading || isDataLoading || isConfigLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const periodsCount = timetableConfig?.periods_per_day || 8;
  const durationMin = timetableConfig?.period_duration_minutes || 45;
  const startTime = formatTimeHHMM(timetableConfig?.start_time || '08:30:00');

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
        {/* Template Information Banner */}
        <View style={styles.templateBanner}>
          <View style={styles.templateBannerHeader}>
            <View style={styles.templateIconBox}>
              <Calendar size={18} color="#D97706" {...({} as any)} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.templateTitle}>Institution Bell Schedule Template</Text>
                <Sparkles size={14} color="#D97706" {...({} as any)} />
              </View>
              <Text style={styles.templateSubtitle}>
                {periodsCount} Periods • {durationMin} mins each • Starts {startTime}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.resetBtn}
              onPress={handleResetToTemplate}
            >
              <RotateCcw size={13} color="#D97706" {...({} as any)} />
              <Text style={styles.resetBtnText}>Reset Timings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Warning banner if faculty has 0 assigned classes */}
        {assignedClasses.length === 0 && (
          <View style={styles.noAssignmentAlert}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={18} color="#D97706" {...({} as any)} />
              <Text style={styles.noAssignmentAlertTitle}>No Classes Assigned to Faculty</Text>
            </View>
            <Text style={styles.noAssignmentAlertDesc}>
              This faculty is not assigned as a subject teacher to any classes yet. Assign subjects to this faculty in Staff Assigning to populate classes and subjects for timetable scheduling.
            </Text>
            <TouchableOpacity 
              style={styles.assignNavBtn}
              onPress={() => router.push('/(root)/institution/faculty/assign')}
            >
              <Text style={styles.assignNavBtnText}>Go to Staff Assigning →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Schedule Grid */}
        {localSlots.map((slot, index) => {
          // Render Break / Lunch Banner
          if (slot.is_break) {
            const isLunch = slot.type === 'lunch';
            return (
              <View 
                key={slot.id || `break-${index}`} 
                style={[styles.breakCard, isLunch ? styles.lunchCard : styles.shortBreakCard]}
              >
                <View style={styles.breakIconWrap}>
                  {isLunch ? (
                    <Utensils size={18} color="#059669" {...({} as any)} />
                  ) : (
                    <Coffee size={18} color="#D97706" {...({} as any)} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.breakTitle, isLunch ? styles.lunchTitle : styles.shortBreakTitle]}>
                    {slot.label || (isLunch ? 'Lunch Break' : 'Short Break')}
                  </Text>
                  <Text style={styles.breakSubtitle}>
                    {slot.start_time} - {slot.end_time} ({slot.duration} mins)
                  </Text>
                </View>
                <View style={styles.breakBadge}>
                  <Text style={styles.breakBadgeText}>{isLunch ? 'RECESS' : 'INTERVAL'}</Text>
                </View>
              </View>
            );
          }

          // Render Regular Period Card
          const currentClassObj = assignedClasses.find((c: any) => 
            c.id === slot.class_id && 
            String(c.section || '').trim().toUpperCase() === String(slot.section || '').trim().toUpperCase()
          );
          const subjectOptions = getFilteredOptions(slot);
          const isAssigned = !!(slot.class_id && slot.subject_id && currentClassObj && subjectOptions.some(o => o.value === slot.subject_id));
          const currentSubjectObj = uniqueSubjects.find((s: any) => s.id === slot.subject_id);

          return (
            <View key={slot.id || `period-${index}`} style={styles.editCard}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <View style={[styles.periodBadge, isAssigned ? styles.periodBadgeActive : styles.periodBadgeMuted]}>
                    <Text style={styles.periodBadgeText}>
                      {slot.label || `Period ${slot.period_index || index + 1}`}
                    </Text>
                  </View>
                  <View style={styles.timeTag}>
                    <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.timeTagText}>{slot.start_time} - {slot.end_time}</Text>
                  </View>
                </View>

                <View style={styles.headerRight}>
                  {isAssigned ? (
                    <View style={styles.assignedBadge}>
                      <Text style={styles.assignedBadgeText}>Assigned</Text>
                    </View>
                  ) : (
                    <View style={styles.unassignedBadge}>
                      <Text style={styles.unassignedBadgeText}>Free Period</Text>
                    </View>
                  )}
                  {isAssigned && (
                    <TouchableOpacity 
                      onPress={() => handleClearPeriod(slot.id)}
                      style={styles.clearBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={15} color="#EF4444" {...({} as any)} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.formGrid}>
                {/* Class & Subject Pickers */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Class & Section</Text>
                    <TouchableOpacity 
                      style={[styles.select, assignedClasses.length === 0 && styles.disabledSelect]} 
                      disabled={assignedClasses.length === 0}
                      onPress={() => setPicker({
                        visible: true,
                        title: "Select Assigned Class",
                        options: assignedClasses.map((c: any) => ({ 
                          label: `${c.name} - Section ${c.section}`, 
                          value: `${c.id}:::${c.section}` 
                        })),
                        selectedValue: slot.class_id ? `${slot.class_id}:::${slot.section}` : null,
                        onSelect: (val) => {
                          const [cId, sec] = String(val).split(':::');
                          setLocalSlots(prev => prev.map(s => s.id === slot.id ? {
                            ...s,
                            class_id: cId,
                            section: sec || 'A',
                            subject_id: '' // reset subject when class changes
                          } : s));
                        }
                      })}
                    >
                      <Text 
                        style={[styles.selectText, (!slot.class_id || !currentClassObj) && styles.placeholder]}
                        numberOfLines={1}
                      >
                        {assignedClasses.length === 0
                          ? 'No Classes Assigned'
                          : currentClassObj 
                            ? `${currentClassObj.name} - Section ${currentClassObj.section}` 
                            : 'Select Class'}
                      </Text>
                      <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Subject</Text>
                    <TouchableOpacity 
                      style={[styles.select, (!slot.class_id || subjectOptions.length === 0) && styles.disabledSelect]} 
                      disabled={!slot.class_id || subjectOptions.length === 0}
                      onPress={() => setPicker({
                        visible: true,
                        title: "Select Assigned Subject",
                        options: subjectOptions,
                        selectedValue: slot.subject_id,
                        onSelect: (val) => updateSlot(slot.id, 'subject_id', val)
                      })}
                    >
                      <Text 
                        style={[styles.selectText, (!slot.subject_id || subjectOptions.length === 0) && styles.placeholder]}
                        numberOfLines={1}
                      >
                        {!slot.class_id 
                          ? 'Choose Class First' 
                          : subjectOptions.length === 0 
                            ? 'No Subjects Assigned' 
                            : currentSubjectObj?.name || 'Select Subject'}
                      </Text>
                      <ChevronDown size={14} color={theme.colors.textMuted} {...({} as any)} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Room & Timings */}
                <View style={styles.row}>
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
                      placeholder="09:45"
                    />
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {/* Add Extra Period Button */}
        <TouchableOpacity style={styles.addSlotBtn} onPress={handleAddExtraSlot}>
          <Plus size={18} color={theme.colors.primary} {...({} as any)} />
          <Text style={styles.addSlotBtnText}>Add Extra Period</Text>
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
  saveBtn: { 
    backgroundColor: theme.colors.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 25 
  },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  // Template Banner
  templateBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  templateBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  templateIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  templateSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    fontWeight: '500',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },

  // Break Cards
  breakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
  },
  shortBreakCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  lunchCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  breakIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  shortBreakTitle: {
    color: '#92400E',
  },
  lunchTitle: {
    color: '#065F46',
  },
  breakSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  breakBadge: {
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  breakBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },

  // Period Cards
  editCard: { 
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#F1F5F9', 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 8 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 5, 
    borderRadius: 10 
  },
  periodBadgeActive: {
    backgroundColor: theme.colors.primary,
  },
  periodBadgeMuted: {
    backgroundColor: '#E2E8F0',
  },
  periodBadgeText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 13 
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  assignedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  assignedBadgeText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
  },
  unassignedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  unassignedBadgeText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  clearBtn: {
    padding: 4,
  },

  formGrid: { gap: 14 },
  inputGroup: { gap: 6 },
  label: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: theme.colors.textMuted, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  select: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#F8FAFC', 
    paddingHorizontal: 12,
    paddingVertical: 12, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: '#E2E8F0' 
  },
  disabledSelect: { backgroundColor: '#F1F5F9', opacity: 0.6 },
  selectText: { fontSize: 13, color: theme.colors.text, fontWeight: '500', flex: 1, marginRight: 4 },
  placeholder: { color: '#94A3B8' },
  input: { 
    backgroundColor: '#F8FAFC', 
    paddingHorizontal: 12,
    paddingVertical: 10, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    fontSize: 13, 
    color: theme.colors.text, 
    fontWeight: '500' 
  },
  inputWithIcon: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    paddingHorizontal: 12, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    gap: 8 
  },
  flexInput: { 
    flex: 1, 
    paddingVertical: 10, 
    fontSize: 13, 
    color: theme.colors.text, 
    fontWeight: '500' 
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addSlotBtn: { 
    padding: 18, 
    borderStyle: 'dashed', 
    borderWidth: 1.5, 
    borderColor: '#CBD5E1', 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    flexDirection: 'row', 
    gap: 8, 
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  addSlotBtnText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  noAssignmentAlert: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 8,
  },
  noAssignmentAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  noAssignmentAlertDesc: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 18,
  },
  assignNavBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 4,
  },
  assignNavBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
});
