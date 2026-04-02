import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
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
  ArrowRight,
  MapPin,
  Coffee,
  Utensils,
  BookOpen,
  X
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Modal } from 'react-native';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableIndexScreen() {
  const { institutionId } = useAuth();
  const router = useRouter();
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [activeDay, setActiveDay] = useState('Monday');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  
  // Reuse useInstitutionUsers to get faculty list
  const { staff } = useInstitutionUsers(institutionId);
  const faculties = useMemo(() => staff.filter((s: any) => s.role === 'teacher' || s.role === 'faculty'), [staff]);

  const { slots, isLoading } = useInstitutionTimetable(institutionId, selectedFaculty?.id);

  const daySlots = useMemo(() => {
    return slots
      .filter((s: any) => s.day_of_week === activeDay)
      .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
  }, [slots, activeDay]);

  const renderFacultyItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.facultyChip, selectedFaculty?.id === item.id && styles.activeFacultyChip]}
      onPress={() => setSelectedFaculty(item)}
    >
      <Text style={[styles.facultyChipText, selectedFaculty?.id === item.id && styles.activeFacultyChipText]}>
        {item.full_name.split(' ')[0]}
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
          <Calendar size={48} color="#E2E8F0" {...({} as any)} />
          <Text style={styles.emptyText}>Select a faculty to view their schedule</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.slotList} contentContainerStyle={styles.slotListContent}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{activeDay}'s Schedule</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity 
                style={styles.editBtn} 
                onPress={() => router.push({
                  pathname: '/(root)/institution/timetable/edit',
                  params: { facultyId: selectedFaculty.id, day: activeDay }
                })}
              >
                <Plus size={16} color="white" {...({} as any)} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {daySlots.length === 0 ? (
            <View style={styles.noSlots}>
              <Clock size={32} color="#E2E8F0" {...({} as any)} />
              <Text style={styles.noSlotsText}>No classes scheduled for today</Text>
            </View>
          ) : (
            daySlots.map((slot: any, i: number) => (
              <TouchableOpacity 
                key={slot.id} 
                style={[
                  styles.slotCard,
                  (slot.subject_id === 'break' || slot.subject_id === 'lunch') && styles.breakCard
                ]}
                onPress={() => setSelectedSlot(slot)}
              >
                <View style={[
                  styles.periodCircle,
                  (slot.subject_id === 'break' || slot.subject_id === 'lunch') && styles.breakCircle
                ]}>
                  {slot.subject_id === 'break' ? <Coffee size={18} color={theme.colors.primary} /> : 
                   slot.subject_id === 'lunch' ? <Utensils size={18} color={theme.colors.primary} /> :
                   <Text style={styles.periodNumber}>{i + 1}</Text>}
                </View>
                <View style={styles.slotInfo}>
                  <Text style={styles.subjectName}>
                    {slot.subject_id === 'break' ? 'Short Break' : 
                     slot.subject_id === 'lunch' ? 'Lunch Break' : 
                     (slot.subjects?.name || 'Unknown Subject')}
                  </Text>
                  {slot.subjects?.name && (
                    <Text style={styles.className}>{slot.classes?.name || 'N/A'}{slot.section ? ` - Section ${slot.section}` : ''}</Text>
                  )}
                  <View style={styles.timeInfo}>
                    <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.timeText}>{slot.start_time} - {slot.end_time}</Text>
                    {slot.room_number && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 12 }}>
                        <MapPin size={12} color={theme.colors.textMuted} {...({} as any)} />
                        <Text style={styles.timeText}>{slot.room_number}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <ChevronRight size={18} color={theme.colors.textMuted} {...({} as any)} />
              </TouchableOpacity>
            ))
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
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTypeIndicator}>
                {selectedSlot?.subject_id === 'break' ? <Coffee size={18} color={theme.colors.primary} /> : 
                 selectedSlot?.subject_id === 'lunch' ? <Utensils size={18} color={theme.colors.primary} /> :
                 <BookOpen size={18} color={theme.colors.primary} />}
                <Text style={styles.modalTypeText}>
                  {selectedSlot?.subject_id === 'break' ? 'General Break' : 
                   selectedSlot?.subject_id === 'lunch' ? 'Lunch Hour' : 'Academic Class'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSlot(null)}>
                <X size={20} color={theme.colors.textMuted} {...({} as any)} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSubject}>
                {selectedSlot?.subject_id === 'break' ? 'Short Break' : 
                 selectedSlot?.subject_id === 'lunch' ? 'Lunch Break' : 
                 selectedSlot?.subjects?.name}
              </Text>
              
              {selectedSlot?.subjects?.name && (
                <View style={styles.modalClassBox}>
                  <Text style={styles.modalClassName}>
                    Class {selectedSlot?.classes?.name} • Section {selectedSlot?.section}
                  </Text>
                </View>
              )}

              <View style={styles.modalDetailGrid}>
                <View style={styles.modalDetailItem}>
                  <Clock size={16} color={theme.colors.primary} {...({} as any)} />
                  <View>
                    <Text style={styles.modalDetailLabel}>Time Slot</Text>
                    <Text style={styles.modalDetailValue}>{selectedSlot?.start_time} - {selectedSlot?.end_time}</Text>
                  </View>
                </View>

                {selectedSlot?.room_number && (
                  <View style={styles.modalDetailItem}>
                    <MapPin size={16} color={theme.colors.primary} {...({} as any)} />
                    <View>
                      <Text style={styles.modalDetailLabel}>Location</Text>
                      <Text style={styles.modalDetailValue}>Room {selectedSlot?.room_number}</Text>
                    </View>
                  </View>
                )}
                
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
                  const day = selectedSlot.day_of_week;
                  const fId = selectedFaculty.id;
                  setSelectedSlot(null);
                  router.push({
                    pathname: '/(root)/institution/timetable/edit',
                    params: { facultyId: fId, day }
                  });
                }}
              >
                <Plus size={18} color="white" {...({} as any)} />
                <Text style={styles.modalEditBtnText}>Edit Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  slotListContent: { padding: 16 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  editBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  editBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5 },
  emptyText: { marginTop: 12, fontSize: 14, color: theme.colors.textMuted },
  noSlots: { paddingVertical: 40, alignItems: 'center', opacity: 0.5 },
  noSlotsText: { marginTop: 8, fontSize: 14, color: theme.colors.textMuted },
  slotCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  breakCard: { backgroundColor: '#F8FAFC', borderStyle: 'dashed' },
  periodCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  breakCircle: { backgroundColor: '#E2E8F0' },
  periodNumber: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
  slotInfo: { flex: 1 },
  subjectName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  className: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  timeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  timeText: { fontSize: 11, color: theme.colors.textMuted },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 32, width: '100%', maxWidth: 400, padding: 24, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTypeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F9FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  modalTypeText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase' },
  modalBody: { gap: 16 },
  modalSubject: { fontSize: 22, fontWeight: '900', color: theme.colors.text },
  modalClassBox: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, alignSelf: 'flex-start' },
  modalClassName: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  modalDetailGrid: { gap: 16, marginTop: 8 },
  modalDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalDetailLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' },
  modalDetailValue: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  modalFooter: { marginTop: 32 },
  modalEditBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 16 },
  modalEditBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});
