import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin,
  Star
} from 'lucide-react-native';

export default function StudentCalendar() {
  const events = [
    { id: '1', title: 'Unit Test - Mathematics', time: '09:00 AM', room: 'Hall A', type: 'exam' },
    { id: '2', title: 'Annual Sports Meet', time: 'Feb 15 - 17', room: 'Grounds', type: 'event' },
    { id: '3', title: 'Holiday - Holi', time: 'Mar 14', room: 'N/A', type: 'holiday' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Unified Calendar" subtitle="Classes, Exams, and School Events" />

      <View style={styles.calendarStrip}>
         { [ 'Mon', 'Tue', 'Wed', 'Thu', 'Fri' ].map((day, i) => (
           <View key={i} style={[styles.dayCard, day === 'Mon' && styles.activeDay]}>
             <Text style={[styles.dayName, day === 'Mon' && styles.activeDayText]}>{day}</Text>
             <Text style={[styles.dayNum, day === 'Mon' && styles.activeDayText]}>{10 + i}</Text>
           </View>
         ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Agenda for Today</Text>
        {events.map((event, i) => (
          <View key={i} style={styles.eventCard}>
            <View style={[styles.indicator, { backgroundColor: event.type === 'exam' ? '#EF4444' : event.type === 'event' ? '#A855F7' : '#F59E0B' }]} />
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.metaText}>{event.time}</Text>
                </View>
                <View style={styles.metaItem}>
                  <MapPin size={12} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.metaText}>{event.room}</Text>
                </View>
              </View>
            </View>
            {event.type === 'exam' && <Star size={16} color="#FAB75A" fill="#FAB75A" {...({} as any)} />}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  calendarStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  dayCard: { backgroundColor: 'white', borderRadius: 16, padding: 12, alignItems: 'center', width: '18%', borderWidth: 1, borderColor: '#F1F5F9' },
  activeDay: { backgroundColor: theme.colors.primary },
  dayName: { fontSize: 10, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase' },
  dayNum: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginTop: 4 },
  activeDayText: { color: 'white' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  eventCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  indicator: { width: 4, height: 40, borderRadius: 2, marginRight: 16 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: theme.colors.textMuted },
});
