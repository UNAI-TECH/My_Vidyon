import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useStudentTimetable } from '../../../../src/hooks/useStudentTimetable';
import { 
  Clock, 
  User, 
  Calendar as CalendarIcon,
  ChevronRight,
  BookOpen
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetable() {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = React.useState(DAYS[new Date().getDay() - 1] || 'Monday');

  const { student, slots, specialSlots, isLoading } = useStudentTimetable(user?.id);

  // Filter and merge
  const dailySchedule = React.useMemo(() => {
    const regular = slots.filter((s: any) => s.day_of_week === selectedDay);
    const specials = specialSlots.filter((s: any) => {
      try {
        const date = parseISO(s.event_date);
        return format(date, 'EEEE') === selectedDay;
      } catch (e) {
        return false;
      }
    });

    // Merge and sort by time
    return [...regular, ...specials.map(s => ({ ...(s as any), isSpecial: true }))]
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [slots, specialSlots, selectedDay]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>Student profile not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader 
          title="My Timetable" 
          subtitle={`${student.class_name || 'Class'} - Section ${student.section || 'A'}`} 
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
          {dailySchedule.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarIcon size={48} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.emptyText}>No classes scheduled for {selectedDay}</Text>
            </View>
          ) : (
            dailySchedule.map((slot: any, idx) => (
              <View key={slot.id || idx} style={[styles.slotCard, slot.isSpecial && styles.specialSlotCard]}>
                <View style={[styles.timeContainer, { borderLeftColor: slot.isSpecial ? theme.colors.secondary : (idx % 2 === 0 ? theme.colors.primary : '#FAB75A') }]}>
                  <Text style={styles.startTime}>{slot.start_time.substring(0, 5)}</Text>
                  <Text style={styles.endTime}>{slot.end_time.substring(0, 5)}</Text>
                </View>

                <View style={styles.slotInfo}>
                  <View style={styles.subjectRow}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.subjectName}>{slot.subjects?.name || slot.title || 'Subject'}</Text>
                      {slot.isSpecial && (
                        <View style={styles.specialBadge}>
                          <Text style={styles.specialBadgeText}>Special</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <User size={12} color={theme.colors.textMuted} {...({} as any)} />
                      <Text style={styles.metaText}>{slot.profiles?.full_name || 'TBD'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                      <Text style={styles.metaText}>{slot.isSpecial ? 'Extra' : `Period ${idx + 1}`}</Text>
                    </View>
                  </View>
                </View>
                
                <ChevronRight size={18} color={theme.colors.textMuted} {...({} as any)} />
              </View>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.infoCard}>
            <BookOpen size={20} color={theme.colors.primary} {...({} as any)} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>About Special Classes</Text>
              <Text style={styles.infoDesc}>Special classes are temporary overrides for holidays, substitutions, or extra sessions.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  content: { padding: 24 },
  daySelector: { marginBottom: 24, maxHeight: 50 },
  daySelectorContent: { gap: 12 },
  dayTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F5F9' },
  activeDayTab: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dayTabText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textMuted },
  activeDayTabText: { color: 'white' },
  scheduleList: { gap: 16 },
  emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' },
  slotCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', gap: 16 },
  specialSlotCard: { backgroundColor: '#F8FAFF', borderColor: theme.colors.secondary + '20' },
  timeContainer: { borderLeftWidth: 4, paddingLeft: 12, width: 70 },
  startTime: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  endTime: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  slotInfo: { flex: 1, gap: 8 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subjectName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  specialBadge: { backgroundColor: theme.colors.secondary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  specialBadgeText: { fontSize: 9, fontWeight: 'bold', color: theme.colors.secondary },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: theme.colors.textMuted },
  footer: { marginTop: 40, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 24 },
  infoCard: { flexDirection: 'row', gap: 16, backgroundColor: '#F0F9FF', padding: 20, borderRadius: 24, alignItems: 'center' },
  infoTitle: { fontWeight: 'bold', color: theme.colors.text, fontSize: 14 },
  infoDesc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, lineHeight: 18 }
});
