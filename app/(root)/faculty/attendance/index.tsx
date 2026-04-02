import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Camera, 
  UserCheck, 
  Search,
  CheckCircle,
  XCircle,
  ChevronDown,
  Lock,
  ShieldAlert
} from 'lucide-react-native';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ActivityIndicator } from 'react-native';

import { useRouter } from 'expo-router';
import { Modal } from 'react-native';
import { AdBanner } from '../../../../src/components/common/Ads/AdBanner';
import { useThemedAlert } from '../../../../src/components/common/ThemedAlert';

export default function FacultyAttendance() {
  const { user, institutionId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [attendanceRecords, setAttendanceRecords] = React.useState<Record<string, 'present' | 'absent'>>({});
  const { showAlert } = useThemedAlert();

  // 1. Check if this faculty is a class teacher of any class
  const { data: classTeacherData, isLoading: loadingClassTeacher } = useQuery({
    queryKey: ['faculty-class-teacher', user?.id, institutionId],
    queryFn: async () => {
      if (!user?.id || !institutionId) return null;
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, sections')
        .eq('institution_id', institutionId)
        .eq('class_teacher_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking class teacher:', error);
        return null;
      }
      return data as any;
    },
    enabled: !!user?.id && !!institutionId,
  });

  // 2. Fetch students for the class teacher's class
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['attendance-students', classTeacherData?.name, institutionId],
    queryFn: async () => {
      if (!classTeacherData?.name || !institutionId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, name, register_number, section')
        .eq('institution_id', institutionId)
        .eq('class_name', classTeacherData.name)
        .order('name');
      
      if (error) {
        console.error('Error fetching students:', error);
        return [];
      }
      return (data || []) as any[];
    },
    enabled: !!classTeacherData?.name && !!institutionId,
  });

  // 3. Fetch existing attendance for today (to lock already-submitted records)
  const { data: existingAttendance = {}, isLoading: loadingExisting } = useQuery({
    queryKey: ['existing-attendance', classTeacherData?.name, today],
    queryFn: async () => {
      if (!students.length || !institutionId) return {};
      const studentIds = students.map((s: any) => s.id);
      
      const { data, error } = await supabase
        .from('student_attendance')
        .select('student_id, status')
        .eq('attendance_date', today)
        .eq('institution_id', institutionId)
        .in('student_id', studentIds);
      
      if (error) {
        console.error('Error fetching existing attendance:', error);
        return {};
      }
      
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.student_id] = r.status; });
      return map;
    },
    enabled: students.length > 0 && !!institutionId,
  });

  // Pre-fill attendance records from existing data
  React.useEffect(() => {
    if (Object.keys(existingAttendance).length > 0) {
      setAttendanceRecords(prev => {
        const merged = { ...prev };
        Object.entries(existingAttendance).forEach(([id, status]) => {
          // Only set if not already locally set (existing DB records take priority on load)
          if (!merged[id]) {
            merged[id] = status as 'present' | 'absent';
          }
        });
        return merged;
      });
    }
  }, [existingAttendance]);

  const isStudentLocked = (studentId: string) => {
    return !!existingAttendance[studentId];
  };

  const toggleAttendance = (studentId: string, status: 'present' | 'absent') => {
    // Block if already submitted today
    if (isStudentLocked(studentId)) return;
    setAttendanceRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    if (!classTeacherData || Object.keys(attendanceRecords).length === 0) {
      showAlert({ title: 'Missing Data', message: 'Please mark attendance for at least one student', type: 'warning' });
      return;
    }

    // Only submit NEW records (not already in DB)
    const newRecords = Object.entries(attendanceRecords)
      .filter(([studentId]) => !isStudentLocked(studentId))
      .map(([studentId, status]) => ({
        student_id: studentId,
        institution_id: institutionId,
        attendance_date: today,
        status: status,
        academic_year: '2024-25',
      }));

    if (newRecords.length === 0) {
      showAlert({ title: 'Already Done', message: 'All students already have attendance recorded for today.', type: 'info' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('student_attendance')
        .upsert(newRecords as any, { onConflict: 'student_id,attendance_date' });

      if (error) throw error;

      // Refresh existing attendance to lock the newly submitted records
      queryClient.invalidateQueries({ queryKey: ['existing-attendance'] });
      showAlert({ title: 'Success', message: `Attendance submitted for ${newRecords.length} student(s). Records are now locked.`, type: 'success' });
    } catch (error: any) {
      console.error('Error submitting attendance:', error);
      showAlert({ title: 'Error', message: error.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Count stats
  const totalStudents = students.length;
  const alreadySubmitted = Object.keys(existingAttendance).length;
  const newlyMarked = Object.keys(attendanceRecords).filter(id => !isStudentLocked(id)).length;

  if (loadingClassTeacher) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Not a class teacher — show access denied
  if (!classTeacherData) {
    return (
      <View style={[styles.container, styles.center]}>
        <View style={styles.accessDeniedCard}>
          <View style={styles.adIcon}>
            <ShieldAlert size={40} color="#EF4444" {...({} as any)} />
          </View>
          <Text style={styles.adTitle}>Access Restricted</Text>
          <Text style={styles.adMessage}>
            You are not assigned as a class teacher for any class. Only class teachers can mark student attendance.
          </Text>
          <TouchableOpacity 
            style={styles.adButton}
            onPress={() => router.push('/faculty')}
          >
            <Text style={styles.adButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader 
          title="Mark Attendance" 
          subtitle={`${classTeacherData.name} • ${format(new Date(), 'EEEE, MMM d')}`} 
        />

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalStudents}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{alreadySubmitted}</Text>
            <Text style={styles.statLabel}>Submitted</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{totalStudents - alreadySubmitted}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <View style={[styles.tab, styles.activeTab]}>
            <UserCheck size={18} color="white" {...({} as any)} />
            <Text style={[styles.tabText, styles.activeTabText]}>Manual Marking</Text>
          </View>
        </View>

        {loadingStudents || loadingExisting ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : (
          <View style={styles.list}>
            {students.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No students found in this class.</Text>
              </View>
            ) : (
              students.map((student: any) => {
                const locked = isStudentLocked(student.id);
                const currentStatus = attendanceRecords[student.id] || existingAttendance[student.id];
                const initials = (student.name || '?').charAt(0).toUpperCase();
                
                return (
                <View key={student.id} style={[styles.row, locked && styles.lockedRow]}>
                  <View style={[styles.avatar, locked && { backgroundColor: currentStatus === 'present' ? '#ECFDF5' : '#FEF2F2' }]}>
                    <Text style={[styles.avatarText, locked && { color: currentStatus === 'present' ? '#10B981' : '#EF4444' }]}>{initials}</Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.name}>{student.name}</Text>
                    <Text style={styles.rollNo}>#{student.register_number || '?'} {student.section ? `• Sec ${student.section}` : ''}</Text>
                  </View>
                  
                  {locked ? (
                    <View style={[styles.lockedBadge, { 
                      backgroundColor: currentStatus === 'present' ? '#ECFDF5' : '#FEF2F2',
                      borderColor: currentStatus === 'present' ? '#A7F3D0' : '#FECACA' 
                    }]}>
                      <Lock size={10} color={currentStatus === 'present' ? '#10B981' : '#EF4444'} {...({} as any)} />
                      <Text style={[styles.lockedText, { 
                        color: currentStatus === 'present' ? '#059669' : '#DC2626' 
                      }]}>
                        {currentStatus === 'present' ? 'Present' : 'Absent'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.actions}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, attendanceRecords[student.id] === 'present' && styles.activePresentBtn]}
                        onPress={() => toggleAttendance(student.id, 'present')}
                      >
                        <CheckCircle size={26} color={attendanceRecords[student.id] === 'present' ? '#10B981' : '#CBD5E1'} {...({} as any)} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, attendanceRecords[student.id] === 'absent' && styles.activeAbsentBtn]}
                        onPress={() => toggleAttendance(student.id, 'absent')}
                      >
                        <XCircle size={26} color={attendanceRecords[student.id] === 'absent' ? '#EF4444' : '#CBD5E1'} {...({} as any)} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )})
            )}
            {students.length > 0 && newlyMarked > 0 && (
              <TouchableOpacity 
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitText}>Submit {newlyMarked} Record{newlyMarked !== 1 ? 's' : ''}</Text>
                )}
              </TouchableOpacity>
            )}
            {students.length > 0 && newlyMarked === 0 && alreadySubmitted > 0 && (
              <View style={styles.allDoneCard}>
                <CheckCircle size={20} color="#10B981" {...({} as any)} />
                <Text style={styles.allDoneText}>All attendance submitted for today</Text>
              </View>
            )}
          </View>
        )}
        <AdBanner type="FACULTY" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 4, marginBottom: 24 },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  activeTab: { backgroundColor: theme.colors.primary },
  tabText: { fontWeight: 'bold', color: theme.colors.textMuted, fontSize: 13 },
  activeTabText: { color: 'white' },
  list: { backgroundColor: 'white', borderRadius: 24, padding: 12, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 6, backgroundColor: '#FAFBFC' },
  lockedRow: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  
  // Avatar
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.colors.primary + '12', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 17, fontWeight: '800', color: theme.colors.primary },

  name: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  rollNo: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  sectionLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 6, borderRadius: 12 },
  activePresentBtn: { backgroundColor: '#ECFDF5', borderRadius: 12 },
  activeAbsentBtn: { backgroundColor: '#FEF2F2', borderRadius: 12 },
  activePresent: { transform: [{ scale: 1.1 }] },
  activeAbsent: { transform: [{ scale: 1.1 }] },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, marginTop: 16, alignItems: 'center', elevation: 3, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  studentInfo: { flex: 1 },
  emptyCard: { padding: 32, alignItems: 'center' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
  center: { justifyContent: 'center', alignItems: 'center' },

  // Locked badge (already submitted)
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  lockedText: { fontSize: 12, fontWeight: '700' },

  // Stats bar
  statsBar: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statItem: { flex: 1, backgroundColor: 'white', borderRadius: 18, padding: 14, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, borderWidth: 1, borderColor: '#F1F5F9' },
  statValue: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  statLabel: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  // All done card
  allDoneCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, marginTop: 12, backgroundColor: '#ECFDF5', borderRadius: 14 },
  allDoneText: { fontSize: 15, fontWeight: '700', color: '#059669' },

  // Access denied
  accessDeniedCard: { backgroundColor: 'white', borderRadius: 28, padding: 40, alignItems: 'center', marginHorizontal: 24, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 15, borderWidth: 1, borderColor: '#FEE2E2' },
  adIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  adTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text, marginBottom: 10 },
  adMessage: { fontSize: 15, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  adButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  adButtonText: { color: 'white', fontWeight: '700', fontSize: 15 },
});

