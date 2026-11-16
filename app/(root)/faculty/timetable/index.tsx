import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Clock, 
  MapPin, 
  Calendar as CalendarIcon,
  BookOpen,
  Coffee,
  Utensils,
  Plus
} from 'lucide-react-native';
import { useInstitutionTimetable } from '../../../../src/hooks/useInstitutionTimetable';
import { format, parseISO } from 'date-fns';
import { AdBanner } from '../../../../src/components/common/Ads/AdBanner';
import { useRouter } from 'expo-router';
import { 
  generateTemplateDailyGrid, 
  mergeSlotsWithTemplate, 
  formatTimeHHMM 
} from '../../../../src/utils/timetableUtils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function FacultyTimetable() {
  const { user, institutionId } = useAuth();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = React.useState(DAYS[new Date().getDay() - 1] || 'Monday');

  const { slots, specialSlots, timetableConfig, isLoading } = useInstitutionTimetable(institutionId || null, user?.id);

  // Filter and merge daily schedule with template grid
  const dailySchedule = React.useMemo(() => {
    const templateGrid = generateTemplateDailyGrid(timetableConfig, selectedDay);
    const regular = slots.filter((s: any) => s.day_of_week === selectedDay);
    const specials = specialSlots.filter((s: any) => {
      try {
        const date = parseISO(s.event_date);
        return format(date, 'EEEE') === selectedDay;
      } catch (e) {
        return false;
      }
    });

    const merged = mergeSlotsWithTemplate(templateGrid, regular, selectedDay);

    return merged.map(tpl => {
      if (tpl.is_break) return tpl;

      const specialMatch = (specials as any[]).find((sp: any) => 
        formatTimeHHMM(sp.start_time) === tpl.start_time
      );
      if (specialMatch) {
        return {
          ...tpl,
          isSpecial: true,
          subject_name: (specialMatch as any).subjects?.name || (specialMatch as any).title || 'Special Session',
          class_name: (specialMatch as any).classes?.name || 'Class',
          section: (specialMatch as any).section || 'A',
          room_number: (specialMatch as any).room_number || tpl.room_number,
        };
      }

      const rawSlot = (regular as any[]).find((r: any) => 
        formatTimeHHMM(r.start_time) === tpl.start_time
      );

      return {
        ...tpl,
        subject_name: (rawSlot as any)?.subjects?.name || tpl.subject_id || '',
        class_name: (rawSlot as any)?.classes?.name || '',
        section: (rawSlot as any)?.section || tpl.section || '',
        room_number: (rawSlot as any)?.room_number || tpl.room_number,
      };
    });
  }, [slots, specialSlots, timetableConfig, selectedDay]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader 
          title="Weekly Timetable" 
          subtitle="View your class schedule"
          actions={
            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => router.push({
                pathname: '/(root)/faculty/timetable/edit',
                params: { day: selectedDay }
              })}
            >
              <Plus size={16} color="white" {...({} as any)} />
              <Text style={styles.editBtnText}>Edit Schedule</Text>
            </TouchableOpacity>
          }
        />

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.daySelector}
          contentContainerStyle={styles.daySelectorContent}
        >
          {DAYS.map((day) => (
            <TouchableOpacity 
              key={day} 
              style={[styles.dayTab, selectedDay === day && styles.activeDayTab]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.dayTabText, selectedDay === day && styles.activeDayTabText]}>
                {day.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.scheduleList}>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
          ) : dailySchedule.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarIcon size={48} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.emptyText}>No classes scheduled for {selectedDay}</Text>
            </View>
          ) : (
            dailySchedule.map((slot: any, idx) => {
              if (slot.is_break) {
                const isLunch = slot.type === 'lunch';
                return (
                  <View 
                    key={slot.id || `break-${idx}`} 
                    style={[styles.slotCard, isLunch ? styles.lunchCard : styles.shortBreakCard]}
                  >
                    <View style={[styles.timeContainer, { borderLeftColor: isLunch ? '#10B981' : '#F59E0B' }]}>
                      <Text style={styles.startTime}>{slot.start_time}</Text>
                      <Text style={styles.endTime}>{slot.end_time}</Text>
                    </View>
                    <View style={styles.slotInfo}>
                      <View style={styles.subjectRow}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {isLunch ? <Utensils size={16} color="#059669" {...({} as any)} /> : <Coffee size={16} color="#D97706" {...({} as any)} />}
                          <Text style={[styles.subjectName, isLunch ? { color: '#065F46' } : { color: '#92400E' }]}>
                            {slot.label || (isLunch ? 'Lunch Break' : 'Short Break')}
                          </Text>
                        </View>
                        <View style={[styles.breakBadge, isLunch ? styles.lunchBadge : styles.shortBreakBadge]}>
                          <Text style={[styles.breakBadgeText, isLunch ? { color: '#059669' } : { color: '#D97706' }]}>
                            {isLunch ? 'RECESS' : 'INTERVAL'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.breakDurationText}>{slot.duration} minutes</Text>
                      </View>
                    </View>
                  </View>
                );
              }

              const hasSubject = !!slot.subject_name;
              if (!hasSubject && !slot.isSpecial) {
                return (
                  <TouchableOpacity 
                    key={slot.id || `free-${idx}`} 
                    style={[styles.slotCard, styles.freeSlotCard]}
                    onPress={() => router.push({
                      pathname: '/(root)/faculty/timetable/edit',
                      params: { day: selectedDay }
                    })}
                  >
                    <View style={[styles.timeContainer, { borderLeftColor: '#CBD5E1' }]}>
                      <Text style={styles.startTime}>{slot.start_time}</Text>
                      <Text style={styles.endTime}>{slot.end_time}</Text>
                    </View>
                    <View style={styles.slotInfo}>
                      <View style={styles.subjectRow}>
                        <Text style={styles.freePeriodTitle}>Period {slot.period_index || idx + 1}: Free Period</Text>
                        <View style={styles.assignChip}>
                          <Text style={styles.assignChipText}>+ Schedule</Text>
                        </View>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>No class assigned</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <View key={slot.id || idx} style={[styles.slotCard, slot.isSpecial && styles.specialSlotCard]}>
                  <View style={[styles.timeContainer, { borderLeftColor: slot.isSpecial ? theme.colors.secondary : (idx % 2 === 0 ? theme.colors.primary : '#FAB75A') }]}>
                    <Text style={styles.startTime}>{slot.start_time}</Text>
                    <Text style={styles.endTime}>{slot.end_time}</Text>
                  </View>

                  <View style={styles.slotInfo}>
                    <View style={styles.subjectRow}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.subjectName}>{slot.subject_name || slot.title || 'Subject'}</Text>
                        {slot.isSpecial && (
                          <View style={styles.specialBadge}>
                            <Text style={styles.specialBadgeText}>Special</Text>
                          </View>
                        )}
                      </View>
                      {slot.class_name ? (
                        <View style={styles.classBadge}>
                          <Text style={styles.classText}>Class {slot.class_name} {slot.section}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <MapPin size={12} color={theme.colors.textMuted} {...({} as any)} />
                        <Text style={styles.metaText}>{slot.room_number ? `Room ${slot.room_number}` : 'Room TBD'}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                        <Text style={styles.metaText}>{slot.isSpecial ? 'Override' : `Period ${slot.period_index || idx + 1}`}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.infoCard}>
            <BookOpen size={20} color={theme.colors.primary} {...({} as any)} />
            <View>
              <Text style={styles.infoTitle}>Institution Bell Schedule</Text>
              <Text style={styles.infoDesc}>This view follows the institution template schedule including breaks.</Text>
            </View>
          </View>
        </View>

        <AdBanner type="FACULTY" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  editBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  editBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  daySelector: { marginBottom: 24, maxHeight: 50 },
  daySelectorContent: { gap: 12 },
  dayTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F5F9' },
  activeDayTab: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dayTabText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textMuted },
  activeDayTabText: { color: 'white' },
  scheduleList: { gap: 14 },
  loader: { marginTop: 40 },
  emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' },
  
  slotCard: { 
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#F1F5F9', 
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4
  },
  specialSlotCard: { borderColor: theme.colors.secondary, backgroundColor: '#FFFDF0' },
  shortBreakCard: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  lunchCard: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  freeSlotCard: { backgroundColor: '#F8FAFC', borderStyle: 'dashed', borderColor: '#CBD5E1' },

  timeContainer: { borderLeftWidth: 4, paddingLeft: 12, width: 70 },
  startTime: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  endTime: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  slotInfo: { flex: 1, gap: 6 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subjectName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  freePeriodTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: theme.colors.textMuted },
  breakDurationText: { fontSize: 11, color: theme.colors.textMuted },

  classBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  classText: { fontSize: 11, fontWeight: '700', color: '#92400E' },

  breakBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  shortBreakBadge: { backgroundColor: '#FEF3C7' },
  lunchBadge: { backgroundColor: '#D1FAE5' },
  breakBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  specialBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  specialBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#D97706' },

  assignChip: { backgroundColor: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  assignChipText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },

  footer: { marginTop: 24, marginBottom: 20 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'white', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  infoDesc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, lineHeight: 16 },
});
