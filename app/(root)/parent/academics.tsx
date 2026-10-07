import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { ChildSwitcher } from '../../../src/components/parent/ChildSwitcher';
import { ReadOnlyBadge } from '../../../src/components/parent/ReadOnlyBadge';
import { LoadingState, EmptyState } from '../../../src/components/common/FeedbackStates';
import { useParentStudents } from '../../../src/hooks/useParentStudents';
import { supabase } from '../../../src/lib/supabase';
import { BookOpen, Calendar, Clock, ArrowLeft } from 'lucide-react-native';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ParentAcademicsScreen() {
  const router = useRouter();
  const { selectedChild, loading: childLoading } = useParentStudents();
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [timetableSlots, setTimetableSlots] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, percentage: 0 });

  useEffect(() => {
    async function loadAcademicData() {
      if (!selectedChild?.student) return;
      const { institution_id, id: studentId } = selectedChild.student;

      try {
        const { data: subData } = await (supabase as any)
          .from('subjects')
          .select('id, name, code, is_elective, periods_per_week')
          .eq('institution_id', institution_id);
        setSubjects(subData || []);

        const { data: slots } = await (supabase as any)
          .from('timetable_slots')
          .select('*')
          .eq('day_of_week', selectedDay)
          .order('period_number', { ascending: true });
        setTimetableSlots(slots || []);

        const { data: attData } = await (supabase as any)
          .from('attendance')
          .select('status')
          .eq('student_id', studentId);

        if (attData && attData.length > 0) {
          const present = attData.filter((a: any) => a.status === 'present').length;
          const total = attData.length;
          setAttendanceStats({
            total,
            present,
            percentage: Math.round((present / total) * 100),
          });
        }
      } catch (err) {
        console.warn('Error loading academic data:', err);
      }
    }

    loadAcademicData();
  }, [selectedChild, selectedDay]);

  if (childLoading) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Academics & Timetable"
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
              <ArrowLeft size={20} color={theme.colors.text} />
            </TouchableOpacity>
          }
        />
        <LoadingState message="Loading student info..." />
      </View>
    );
  }

  if (!selectedChild) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Academics & Timetable"
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
              <ArrowLeft size={20} color={theme.colors.text} />
            </TouchableOpacity>
          }
        />
        <EmptyState
          title="No Child Linked"
          description="No student ward is currently linked to your parent account."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Academics & Schedule"
        subtitle={`Viewing timetable and subjects for ${selectedChild.student.name}`}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
        }
        actions={<ReadOnlyBadge label="Read-Only" />}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <ChildSwitcher />

        {/* Attendance Highlight Card */}
        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{attendanceStats.percentage}%</Text>
            <Text style={styles.statLbl}>Attendance Rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{attendanceStats.present}</Text>
            <Text style={styles.statLbl}>Days Present</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{attendanceStats.total}</Text>
            <Text style={styles.statLbl}>Total Working Days</Text>
          </View>
        </View>

        {/* Timetable Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Calendar size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Daily Class Schedule</Text>
          </View>

          {/* Day Selector Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
            {DAYS.map((day) => {
              const isActive = selectedDay === day;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, isActive && styles.dayChipActive]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {timetableSlots.length === 0 ? (
            <Text style={styles.emptyText}>No scheduled periods for {selectedDay}.</Text>
          ) : (
            <View style={styles.slotList}>
              {timetableSlots.map((slot, index) => (
                <View key={slot.id || index} style={styles.slotRow}>
                  <View style={styles.periodBadge}>
                    <Text style={styles.periodNum}>{slot.period_number || index + 1}</Text>
                    <Text style={styles.periodLabel}>Period</Text>
                  </View>
                  <View style={styles.slotDetails}>
                    <Text style={styles.subjectName}>{slot.subject_name || slot.subject || 'Period'}</Text>
                    <View style={styles.slotMeta}>
                      <Clock size={12} color={theme.colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={styles.slotTime}>
                        {slot.start_time || '09:00'} - {slot.end_time || '09:45'}
                      </Text>
                      {slot.faculty_name && (
                        <Text style={styles.facultyText}>• {slot.faculty_name}</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Enrolled Subjects List */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <BookOpen size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Curriculum Subjects</Text>
          </View>
          {subjects.length === 0 ? (
            <Text style={styles.emptyText}>No subject curriculum registered.</Text>
          ) : (
            <View style={styles.subjectGrid}>
              {subjects.map((sub) => (
                <View key={sub.id} style={styles.subjectCard}>
                  <Text style={styles.subjectCardName}>{sub.name}</Text>
                  {sub.code && <Text style={styles.subjectCardCode}>Code: {sub.code}</Text>}
                  <Text style={styles.subjectCardPeriods}>
                    {sub.periods_per_week || 4} periods/week
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    marginVertical: 14,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  statLbl: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.glassBorder,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  daySelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    marginRight: 8,
  },
  dayChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayChipText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  slotList: {
    gap: 10,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.m,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  periodBadge: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.s,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  periodNum: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  periodLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
  },
  slotDetails: {
    flex: 1,
  },
  subjectName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  slotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  slotTime: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  facultyText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginLeft: 6,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 12,
    textAlign: 'center',
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  subjectCard: {
    width: '48%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.m,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  subjectCardName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  subjectCardCode: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  subjectCardPeriods: {
    color: theme.colors.primary,
    fontSize: 11,
    marginTop: 4,
  },
});
