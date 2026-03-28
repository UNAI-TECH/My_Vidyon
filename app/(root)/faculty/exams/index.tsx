import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useFacultyExams } from '../../../../src/hooks/useFacultyExams';
import { 
  FileUp, 
  ClipboardList, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  BookOpen,
  ChevronRight
} from 'lucide-react-native';

import { useRouter } from 'expo-router';
import { useInstitutionFaculty } from '../../../../src/hooks/useInstitutionFaculty';

export default function FacultyExams() {
  const { user, institutionId } = useAuth();
  const router = useRouter();
  const { exams, scheduleEntries, pendingMarks, isLoading } = useFacultyExams(user?.id);
  const { classes: classList } = useInstitutionFaculty(institutionId || null);

  const classNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    classList.forEach((c: any) => { map[c.id] = c.name; });
    return map;
  }, [classList]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader 
        title="Exams & Marks" 
        subtitle="View your exam schedule and manage student grades" 
      />

      <View style={styles.statsRow}>
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>UPCOMING EXAMS</Text>
          <Text style={styles.statsValue}>{exams.length}</Text>
        </View>
        <View style={[styles.statsCard, { borderColor: '#FAB75A' }]}>
          <Text style={styles.statsLabel}>PENDING MARKS</Text>
          <Text style={[styles.statsValue, { color: '#FAB75A' }]}>{pendingMarks}</Text>
        </View>
      </View>

      {/* NEW: Dedicated Personal Schedule Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Exam Schedule</Text>
        {scheduleEntries.length > 0 ? (
          scheduleEntries.map((entry, idx) => (
            <TouchableOpacity 
              key={entry.info || idx} 
              style={styles.scheduleRow}
              onPress={() => router.push(`/(root)/faculty/exams/${entry.exam_schedule_id}/schedule`)}
            >
              <View style={styles.timeBox}>
                <Clock size={14} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.timeText}>{entry.start_time}</Text>
              </View>
              <View style={styles.entryInfo}>
                <Text style={styles.entrySubject}>{entry.subject}</Text>
                <Text style={styles.entryMeta}>
                  {entry.exam_date} • {classNameMap[entry.exam_schedules?.class_id] || entry.exam_schedules?.class_id} {entry.exam_schedules?.section}
                </Text>
                <Text style={styles.entryGroup}>{entry.exam_schedules?.exam_display_name}</Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textMuted} {...({} as any)} />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptySmall}>
            <Calendar size={20} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.emptySmallText}>No upcoming subjects found in your classes.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exam Management (Grading)</Text>
        {exams.length > 0 ? (
          exams.map((exam, i) => (
            <View key={exam.id || i} style={styles.examCard}>
              <View style={styles.examInfo}>
                <Text style={styles.examName}>{exam.exam_display_name || exam.exam_type}</Text>
                <View style={styles.examMeta}>
                  <Calendar size={12} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.metaText}>{exam.academic_year} • Class {classNameMap[exam.class_id] || exam.class_id} {exam.section}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => router.push(`/(root)/faculty/exams/${exam.id}`)}
                >
                  <ClipboardList size={16} color="white" {...({} as any)} />
                  <Text style={styles.actionText}>Enter Marks</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[styles.actionBtn, styles.secondaryBtn]}
                   onPress={() => router.push(`/(root)/faculty/exams/${exam.id}/schedule`)}
                >
                  <Calendar size={16} color={theme.colors.primary} {...({} as any)} />
                  <Text style={[styles.actionText, styles.secondaryText]}>View Timetable</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <AlertCircle size={32} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.emptyText}>No active exams found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statsCard: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  statsLabel: { fontSize: 8, fontWeight: 'bold', color: theme.colors.textMuted, letterSpacing: 1 },
  statsValue: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  examCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  examInfo: { marginBottom: 16 },
  examName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  examMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontSize: 12, color: theme.colors.textMuted },
  actions: { borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 16, flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  secondaryBtn: { backgroundColor: 'white', borderWidth: 1, borderColor: theme.colors.primary },
  actionText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  secondaryText: { color: theme.colors.primary },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '500' },
  
  scheduleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  timeBox: { alignItems: 'center', marginRight: 16, paddingRight: 16, borderRightWidth: 1, borderRightColor: '#F1F5F9', minWidth: 60 },
  timeText: { fontSize: 12, fontWeight: '800', color: theme.colors.text, marginTop: 4 },
  entryInfo: { flex: 1 },
  entrySubject: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  entryMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  entryGroup: { fontSize: 10, color: theme.colors.primary, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4 },
  emptySmall: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#E2E8F0' },
  emptySmallText: { fontSize: 12, color: theme.colors.textMuted }
});
