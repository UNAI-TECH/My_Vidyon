import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { useAuth } from '../../../src/hooks/useAuth';
import { useInstitutionTimetable } from '../../../src/hooks/useInstitutionTimetable';
import { 
  Calendar, 
  Clock, 
  ChevronRight, 
  Plus,
  ArrowLeft,
  MapPin,
  Coffee,
  Utensils,
  BookOpen,
  X
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Modal } from 'react-native';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function FacultyScheduleScreen() {
  const { user, institutionId } = useAuth();
  const router = useRouter();
  const [activeDay, setActiveDay] = useState('Monday');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  
  const { slots, isLoading } = useInstitutionTimetable(institutionId, user?.id);

  const daySlots = useMemo(() => {
    return slots
      .filter((s: any) => s.day_of_week === activeDay)
      .sort((a: any, b: any) => a.period_index - b.period_index);
  }, [slots, activeDay]);

  return (
    <View style={styles.container}>
      <PageHeader 
        title="My Schedule" 
        subtitle="Weekly Teaching Timetable"
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        }
      />

      <View style={styles.dayTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.slotList} contentContainerStyle={styles.slotListContent}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{activeDay}'s Classes</Text>
            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => router.push({
                pathname: '/(root)/faculty/timetable/edit',
                params: { day: activeDay }
              })}
            >
              <Plus size={16} color="white" {...({} as any)} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {daySlots.length === 0 ? (
            <View style={styles.noSlots}>
              <Clock size={48} color="#E2E8F0" {...({} as any)} />
              <Text style={styles.noSlotsText}>No classes scheduled for {activeDay}</Text>
              <TouchableOpacity 
                style={styles.addFirstBtn}
                onPress={() => router.push({
                  pathname: '/(root)/faculty/timetable/edit',
                  params: { day: activeDay }
                })}
              >
                <Text style={styles.addFirstBtnText}>Add Periodic Slot</Text>
              </TouchableOpacity>
            </View>
          ) : (
            daySlots.map((slot: any) => (
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
                  {slot.subject_id === 'break' ? <Coffee size={20} color={theme.colors.primary} /> : 
                   slot.subject_id === 'lunch' ? <Utensils size={20} color={theme.colors.primary} /> :
                   <Text style={styles.periodNumber}>{slot.period_index}</Text>}
                </View>
                <View style={styles.slotInfo}>
                  <Text style={styles.subjectName}>
                    {slot.subject_id === 'break' ? 'Short Break' : 
                     slot.subject_id === 'lunch' ? 'Lunch Break' : 
                     (slot.subjects?.name || 'Unknown Subject')}
                  </Text>
                  {slot.subjects?.name && (
                    <Text style={styles.className}>{slot.classes?.name || 'N/A'} - Section {slot.section}</Text>
                  )}
                  <View style={styles.metaRow}>
                    <View style={styles.timeInfo}>
                      <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                      <Text style={styles.timeText}>{slot.start_time} - {slot.end_time}</Text>
                    </View>
                    {slot.room_number && (
                      <View style={styles.roomInfo}>
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
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalEditBtn}
                onPress={() => {
                  const day = selectedSlot.day_of_week;
                  setSelectedSlot(null);
                  router.push({
                    pathname: '/(root)/faculty/timetable/edit',
                    params: { day }
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
  dayTabs: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dayTab: { paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeDayTab: { borderBottomColor: theme.colors.primary },
  dayTabText: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  activeDayTabText: { color: theme.colors.primary, fontWeight: 'bold' },
  slotList: { flex: 1 },
  slotListContent: { padding: 20 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  listTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  editBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  editBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noSlots: { paddingVertical: 60, alignItems: 'center' },
  noSlotsText: { marginTop: 12, fontSize: 16, color: theme.colors.textMuted, textAlign: 'center' },
  addFirstBtn: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary },
  addFirstBtnText: { color: theme.colors.primary, fontWeight: 'bold' },
  slotCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity:0.05, shadowRadius:8 },
  breakCard: { backgroundColor: '#F8FAFC', borderStyle: 'dashed' },
  periodCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  breakCircle: { backgroundColor: '#E2E8F0' },
  periodNumber: { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary },
  slotInfo: { flex: 1 },
  subjectName: { fontSize: 17, fontWeight: 'bold', color: theme.colors.text },
  className: { fontSize: 14, color: theme.colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  timeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roomInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12, color: theme.colors.textMuted },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 32, width: '100%', maxWidth: 400, padding: 24, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTypeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F9FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  modalTypeText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase' },
  modalBody: { gap: 16 },
  modalSubject: { fontSize: 24, fontWeight: '900', color: theme.colors.text },
  modalClassBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, alignSelf: 'flex-start' },
  modalClassName: { fontSize: 16, fontWeight: '600', color: theme.colors.textMuted },
  modalDetailGrid: { gap: 16, marginTop: 8 },
  modalDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalDetailLabel: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  modalDetailValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  modalFooter: { marginTop: 32 },
  modalEditBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 18 },
  modalEditBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
