import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { 
  Clock, 
  MapPin, 
  Calendar as CalendarIcon,
  BookOpen
} from 'lucide-react-native';

import { useInstitutionTimetable } from '../../../../src/hooks/useInstitutionTimetable';
import { format, parseISO } from 'date-fns';
import { AdBanner } from '../../../../src/components/common/Ads/AdBanner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function FacultyTimetable() {
  const { user, institutionId } = useAuth();
  const [selectedDay, setSelectedDay] = React.useState(DAYS[new Date().getDay() - 1] || 'Monday');

  const { slots, specialSlots, isLoading } = useInstitutionTimetable(institutionId || null, user?.id);

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="Weekly Timetable" subtitle="View your class schedule" />

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
                    <View style={styles.classBadge}>
                      <Text style={styles.classText}>Class {slot.classes?.name} {slot.section}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MapPin size={12} color={theme.colors.textMuted} {...({} as any)} />
                      <Text style={styles.metaText}>{slot.room_number || 'Room TBD'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                      <Text style={styles.metaText}>{slot.isSpecial ? 'Override' : `Period ${idx + 1}`}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.infoCard}>
            <BookOpen size={20} color={theme.colors.primary} {...({} as any)} />
            <View>
              <Text style={styles.infoTitle}>Special Classes</Text>
              <Text style={styles.infoDesc}>View substitute and extra classes in the Special Schedule section.</Text>
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
  daySelector: { marginBottom: 24, maxHeight: 50 },
  daySelectorContent: { gap: 12 },
  dayTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F5F9' },
  activeDayTab: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dayTabText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textMuted },
  activeDayTabText: { color: 'white' },
  scheduleList: { gap: 16 },
  loader: { marginTop: 40 },
  emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' },
  slotCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', gap: 16 },
  timeContainer: { borderLeftWidth: 4, paddingLeft: 12, width: 70 },
  startTime: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  endTime: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  slotInfo: { flex: 1, gap: 8 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subjectName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  classBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  classText: { fontSize: 10, fontWeight: 'bold', color: theme.colors.textMuted },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: theme.colors.textMuted },
  specialSlotCard: { backgroundColor: '#F8FAFF', borderColor: theme.colors.secondary + '20' },
  specialBadge: { backgroundColor: theme.colors.secondary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  specialBadgeText: { fontSize: 9, fontWeight: 'bold', color: theme.colors.secondary },
  footer: { marginTop: 40, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 24 },
  infoCard: { flexDirection: 'row', gap: 16, backgroundColor: '#F0F9FF', padding: 20, borderRadius: 24, alignItems: 'center' },
  infoTitle: { fontWeight: 'bold', color: theme.colors.text, fontSize: 14 },
  infoDesc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, lineHeight: 18 }
});
