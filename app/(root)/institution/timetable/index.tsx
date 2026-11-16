import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Modal } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useInstitutionTimetable } from '../../../../src/hooks/useInstitutionTimetable';
import { useInstitutionUsers } from '../../../../src/hooks/useInstitutionUsers';
import { 
  Calendar, 
  Clock, 
  User, 
  ChevronRight, 
  Plus, 
  MapPin, 
  Coffee, 
  Utensils, 
  BookOpen, 
  X,
  Sparkles
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { 
  generateTemplateDailyGrid, 
  mergeSlotsWithTemplate, 
  formatTimeHHMM 
} from '../../../../src/utils/timetableUtils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableIndexScreen() {
  const { institutionId } = useAuth();
  const router = useRouter();
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [activeDay, setActiveDay] = useState('Monday');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  
  // Get faculty list
  const { staff } = useInstitutionUsers(institutionId);
  const faculties = useMemo(() => staff.filter((s: any) => s.role === 'teacher' || s.role === 'faculty'), [staff]);

  const { slots, timetableConfig, isLoading } = useInstitutionTimetable(institutionId, selectedFaculty?.id);

  // Merge daily timetable with the institution template grid
  const daySlots = useMemo(() => {
    if (!selectedFaculty) return [];
    const templateGrid = generateTemplateDailyGrid(timetableConfig, activeDay);
    const merged = mergeSlotsWithTemplate(templateGrid, slots, activeDay);

    return merged.map(s => {
      // Find matching raw slot for relations (subjects, classes)
      const matched = (slots as any[]).find((raw: any) => 
        raw.day_of_week === activeDay && 
        formatTimeHHMM(raw.start_time) === s.start_time
      );

      return {
        ...s,
        subjects: (matched as any)?.subjects || (s.subject_id && s.subject_id !== 'break' && s.subject_id !== 'lunch' ? { name: s.subject_id } : null),
        classes: (matched as any)?.classes || (s.class_id ? { name: s.class_id } : null),
      };
    });
  }, [slots, timetableConfig, activeDay, selectedFaculty]);

  const renderFacultyItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.facultyChip, selectedFaculty?.id === item.id && styles.activeFacultyChip]}
      onPress={() => setSelectedFaculty(item)}
    >
      <Text style={[styles.facultyChipText, selectedFaculty?.id === item.id && styles.activeFacultyChipText]}>
        {item.full_name?.split(' ')[0] || item.full_name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Timetable" 
        subtitle="Schedule faculty classes"
      />

      <View style={styles.facultySelector}>
        <View style={styles.selectorHeader}>
          <User size={16} color={theme.colors.textMuted} {...({} as any)} />
          <Text style={styles.selectorLabel}>Select Faculty</Text>
        </View>
        <FlatList 
          horizontal
          showsHorizontalScrollIndicator={false}
          data={faculties}
          keyExtractor={(item) => item.id}
          renderItem={renderFacultyItem}
          contentContainerStyle={styles.facultyList}
        />
      </View>

      <View style={styles.dayTabs}>
        {DAYS.map(day => (
          <TouchableOpacity 
            key={day} 
            style={[styles.dayTab, activeDay === day && styles.activeDayTab]}
            onPress={() => setActiveDay(day)}
          >
            <Text style={[styles.dayTabText, activeDay === day && styles.activeDayTabText]}>
              {day.substring(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!selectedFaculty ? (
        <View style={styles.emptyState}>
          <Calendar size={48} color="#CBD5E1" {...({} as any)} />
          <Text style={styles.emptyText}>Select a faculty member above to view their schedule</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.slotList} contentContainerStyle={styles.slotListContent}>
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listTitle}>{activeDay}'s Schedule</Text>
              <Text style={styles.listSubtitle}>
                {selectedFaculty.full_name} • Bell Schedule Template
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => router.push({
                pathname: '/(root)/institution/timetable/edit',
                params: { facultyId: selectedFaculty.id, day: activeDay }
              })}
            >
              <Plus size={16} color="white" {...({} as any)} />
              <Text style={styles.editBtnText}>Edit Schedule</Text>
            </TouchableOpacity>
          </View>

          {daySlots.length === 0 ? (
            <View style={styles.noSlots}>
              <Clock size={32} color="#E2E8F0" {...({} as any)} />
              <Text style={styles.noSlotsText}>No template or periods found</Text>
            </View>
          ) : (
            daySlots.map((slot: any, i: number) => {
              const isBreak = slot.is_break || slot.type === 'break' || slot.type === 'lunch';
              const isLunch = slot.type === 'lunch';
              const hasClassAssigned = !isBreak && (slot.subject_id || slot.subjects?.name);

              if (isBreak) {
                return (
                  <View 
                    key={slot.id || `break-${i}`} 
                    style={[styles.slotCard, isLunch ? styles.lunchCard : styles.shortBreakCard]}
                  >
                    <View style={[styles.periodCircle, isLunch ? styles.lunchCircle : styles.breakCircle]}>
                      {isLunch ? <Utensils size={18} color="#059669" {...({} as any)} /> : <Coffee size={18} color="#D97706" {...({} as any)} />}
                    </View>
                    <View style={styles.slotInfo}>
                      <Text style={[styles.subjectName, isLunch ? { color: '#065F46' } : { color: '#92400E' }]}>
                        {slot.label || (isLunch ? 'Lunch Break' : 'Short Break')}
                      </Text>
                      <View style={styles.timeInfo}>
                        <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                        <Text style={styles.timeText}>{slot.start_time} - {slot.end_time} ({slot.duration}m)</Text>
                      </View>
                    </View>
                  </View>
                );
              }

              if (!hasClassAssigned) {
                return (
                  <TouchableOpacity 
                    key={slot.id || `free-${i}`} 
                    style={[styles.slotCard, styles.freeSlotCard]}
                    onPress={() => router.push({
                      pathname: '/(root)/institution/timetable/edit',
                      params: { facultyId: selectedFaculty.id, day: activeDay }
                    })}
                  >
                    <View style={[styles.periodCircle, styles.freePeriodCircle]}>
                      <Text style={styles.freePeriodNumber}>{slot.period_index || i + 1}</Text>
                    </View>
                    <View style={styles.slotInfo}>
                      <Text style={styles.freePeriodText}>Free Period / Unassigned</Text>
                      <View style={styles.timeInfo}>
                        <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                        <Text style={styles.timeText}>{slot.start_time} - {slot.end_time}</Text>
                      </View>
                    </View>
                    <View style={styles.assignChip}>
                      <Text style={styles.assignChipText}>+ Assign</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity 
                  key={slot.id || `period-${i}`} 
                  style={styles.slotCard}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <View style={styles.periodCircle}>
                    <Text style={styles.periodNumber}>{slot.period_index || i + 1}</Text>
                  </View>
                  <View style={styles.slotInfo}>
                    <Text style={styles.subjectName}>
                      {slot.subjects?.name || slot.subject_id || 'Assigned Subject'}
                    </Text>
                    <Text style={styles.className}>
                      Class {slot.classes?.name || 'Class'}{slot.section ? ` • Section ${slot.section}` : ''}
                    </Text>
                    <View style={styles.timeInfo}>
                      <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                      <Text style={styles.timeText}>{slot.start_time} - {slot.end_time}</Text>
                      {slot.room_number ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 10 }}>
                          <MapPin size={12} color={theme.colors.textMuted} {...({} as any)} />
                          <Text style={styles.timeText}>Room {slot.room_number}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textMuted} {...({} as any)} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* View Details Modal */}
      <Modal
        visible={!!selectedSlot}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSlot(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setSelectedSlot(null)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.modalContent} 
            onPress={(e) => {
              // Stop propagation so clicking inside the modal does not close it
              if (e && e.stopPropagation) e.stopPropagation();
            }}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTypeIndicator}>
                <BookOpen size={16} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.modalTypeText}>Academic Class</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSlot(null)}>
                <X size={20} color={theme.colors.textMuted} {...({} as any)} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSubject}>
                {selectedSlot?.subjects?.name || selectedSlot?.subject_id}
              </Text>
              
              <View style={styles.modalClassBox}>
                <Text style={styles.modalClassName}>
                  Class {selectedSlot?.classes?.name || 'N/A'} • Section {selectedSlot?.section || 'A'}
                </Text>
              </View>

              <View style={styles.modalDetailGrid}>
                <View style={styles.modalDetailItem}>
                  <Clock size={16} color={theme.colors.primary} {...({} as any)} />
                  <View>
                    <Text style={styles.modalDetailLabel}>Time Slot</Text>
                    <Text style={styles.modalDetailValue}>{selectedSlot?.start_time} - {selectedSlot?.end_time}</Text>
                  </View>
                </View>

                {selectedSlot?.room_number ? (
                  <View style={styles.modalDetailItem}>
                    <MapPin size={16} color={theme.colors.primary} {...({} as any)} />
                    <View>
                      <Text style={styles.modalDetailLabel}>Location</Text>
                      <Text style={styles.modalDetailValue}>Room {selectedSlot?.room_number}</Text>
                    </View>
                  </View>
                ) : null}
                
                <View style={styles.modalDetailItem}>
                  <User size={16} color={theme.colors.primary} {...({} as any)} />
                  <View>
                    <Text style={styles.modalDetailLabel}>Faculty</Text>
                    <Text style={styles.modalDetailValue}>{selectedFaculty?.full_name}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalEditBtn}
                onPress={() => {
                  const day = activeDay;
                  const fId = selectedFaculty.id;
                  setSelectedSlot(null);
                  router.push({
                    pathname: '/(root)/institution/timetable/edit',
                    params: { facultyId: fId, day }
                  });
                }}
              >
                <Plus size={18} color="white" {...({} as any)} />
                <Text style={styles.modalEditBtnText}>Edit Schedule</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  facultySelector: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  selectorHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8, gap: 6 },
  selectorLabel: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase' },
  facultyList: { paddingHorizontal: 12 },
  facultyChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', marginHorizontal: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  activeFacultyChip: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  facultyChipText: { fontSize: 13, color: theme.colors.text, fontWeight: '600' },
  activeFacultyChipText: { color: 'white' },
  dayTabs: { flexDirection: 'row', padding: 12, justifyContent: 'space-between', backgroundColor: 'white' },
  dayTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeDayTab: { borderBottomColor: theme.colors.primary },
  dayTabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  activeDayTabText: { color: theme.colors.primary, fontWeight: 'bold' },
  slotList: { flex: 1 },
  slotListContent: { padding: 16, paddingBottom: 32 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  listSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  editBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  editBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 14, color: theme.colors.textMuted, textAlign: 'center' },
  noSlots: { paddingVertical: 40, alignItems: 'center', opacity: 0.5 },
  noSlotsText: { marginTop: 8, fontSize: 14, color: theme.colors.textMuted },
  
  slotCard: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16, 
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4
  },
  shortBreakCard: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  lunchCard: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  freeSlotCard: { backgroundColor: '#F8FAFC', borderStyle: 'dashed', borderColor: '#CBD5E1' },
  
  periodCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  breakCircle: { backgroundColor: '#FDE68A' },
  lunchCircle: { backgroundColor: '#D1FAE5' },
  freePeriodCircle: { backgroundColor: '#E2E8F0' },
  periodNumber: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
  freePeriodNumber: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  
  slotInfo: { flex: 1 },
  subjectName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  freePeriodText: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  className: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2, fontWeight: '500' },
  timeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  timeText: { fontSize: 12, color: theme.colors.textMuted },
  
  assignChip: { backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' },
  assignChipText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 24, width: '100%', maxWidth: 400, padding: 24, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTypeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  modalTypeText: { fontSize: 11, fontWeight: '700', color: '#B45309', textTransform: 'uppercase' },
  modalBody: { gap: 14 },
  modalSubject: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  modalClassBox: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, alignSelf: 'flex-start' },
  modalClassName: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  modalDetailGrid: { gap: 12, marginTop: 6 },
  modalDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalDetailLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' },
  modalDetailValue: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  modalFooter: { marginTop: 24 },
  modalEditBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 16 },
  modalEditBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
