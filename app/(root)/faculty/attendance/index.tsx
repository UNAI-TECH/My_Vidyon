import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Camera, 
  UserCheck, 
  Search,
  CheckCircle,
  XCircle,
  ChevronDown
} from 'lucide-react-native';
import { useFacultyDashboard } from '../../../../src/hooks/useFacultyDashboard';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ActivityIndicator } from 'react-native';

import { useRouter } from 'expo-router';
import { Modal } from 'react-native';

export default function FacultyAttendance() {
  const { user, institutionId } = useAuth();
  const router = useRouter();
  const { assignedSubjects, isLoading: loadingAssignments } = useFacultyDashboard(user?.id, institutionId || undefined);
  const [method, setMethod] = React.useState<'scan' | 'manual'>('manual');
  const [selectedAssignment, setSelectedAssignment] = React.useState<any>(null);
  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: { text: string; style?: 'cancel' | 'destructive'; onPress: () => void }[];
  } | null>(null);

  // Show all assignments (Class Teacher and Subject Teacher)
  const allAssignments = React.useMemo(() => {
    return assignedSubjects;
  }, [assignedSubjects]);

  // Handle no assignments case
  React.useEffect(() => {
    if (!loadingAssignments && allAssignments.length === 0) {
      setAlertConfig({
        visible: true,
        title: "No Assigned Classes",
        message: "You are not assigned to any class or subject. Please contact the administrator.",
        buttons: [
          { 
            text: "Back to Dashboard", 
            onPress: () => router.push('/faculty')
          }
        ]
      });
    }
  }, [loadingAssignments, allAssignments, router]);

  // Set default selection
  React.useEffect(() => {
    if (allAssignments.length > 0 && !selectedAssignment) {
      setSelectedAssignment(allAssignments[0]);
    }
  }, [allAssignments]);

  // Fetch students for the selected class/section
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['attendance-students', selectedAssignment?.class_id, selectedAssignment?.section],
    queryFn: async () => {
      if (!selectedAssignment) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, name, register_number')
        .eq('institution_id', selectedAssignment.institution_id)
        .eq('class_name', selectedAssignment.classes?.name)
        .eq('section', selectedAssignment.section)
        .order('name');
      
      if (error) {
        console.error('Error fetching students:', error);
        return [];
      }

      // Map to consistent property names for UI
      return (data || []).map((s: any) => ({
        id: s.id,
        full_name: s.name,
        roll_number: s.register_number
      }));
    },
    enabled: !!selectedAssignment,
  });

  const [attendanceRecords, setAttendanceRecords] = React.useState<Record<string, 'present' | 'absent'>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const toggleAttendance = (studentId: string, status: 'present' | 'absent') => {
    setAttendanceRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || Object.keys(attendanceRecords).length === 0) {
      Alert.alert('Error', 'Please mark attendance for at least one student');
      return;
    }

    setIsSubmitting(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const records = Object.entries(attendanceRecords).map(([studentId, status]) => ({
        student_id: studentId,
        institution_id: selectedAssignment.institution_id,
        attendance_date: today,
        status: status,
        academic_year: '2023-24', // Should dynamic if possible, but hardcoded based on current state
      }));

      const { error } = await supabase
        .from('student_attendance')
        .upsert(records as any, { onConflict: 'student_id,attendance_date' });

      if (error) throw error;

      Alert.alert('Success', 'Attendance records submitted successfully');
    } catch (error: any) {
      console.error('Error submitting attendance:', error);
      Alert.alert('Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCleanClassName = (name: any) => {
    if (typeof name === 'string' && name.startsWith('{')) {
      try {
        const parsed = JSON.parse(name);
        return parsed.name || 'Class';
      } catch (e) {
        return name;
      }
    }
    return typeof name === 'string' ? name : 'Class';
  };

  const currentClassLabel = selectedAssignment 
    ? `${getCleanClassName(selectedAssignment.classes?.name)} - ${selectedAssignment.section}`
    : 'Select Class';

  if (loadingAssignments) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader 
          title="Mark Attendance" 
          subtitle={`${currentClassLabel} • ${format(new Date(), 'EEEE, MMM d')}`} 
        />

        {/* Class Selector */}
        {allAssignments.length > 0 && (
          <View style={styles.selectorContainer}>
            <Text style={styles.label}>Select Class / Subject:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {allAssignments.map((as: any, idx: number) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[
                    styles.classChip, 
                    selectedAssignment?.id === as.id && styles.activeClassChip
                  ]}
                  onPress={() => setSelectedAssignment(as)}
                >
                  <Text style={[
                    styles.classChipText,
                    selectedAssignment?.id === as.id && styles.activeClassChipText
                  ]}>
                    {getCleanClassName(as.classes?.name)} ({as.section}) {as.subjects?.name ? `- ${as.subjects.name}` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, styles.activeTab]} 
          >
            <UserCheck size={18} color="white" {...({} as any)} />
            <Text style={[styles.tabText, styles.activeTabText]}>Manual Marking</Text>
          </TouchableOpacity>
        </View>

        {loadingStudents ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : (
          <View style={styles.list}>
            {students.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No students found in this class.</Text>
              </View>
            ) : (
              students.map((student: any) => (
                <View key={student.id} style={styles.row}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.rollNo}>#{student.roll_number || '?'}</Text>
                    <Text style={styles.name}>{student.full_name}</Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, attendanceRecords[student.id] === 'present' && styles.activePresent]}
                      onPress={() => toggleAttendance(student.id, 'present')}
                    >
                      <CheckCircle size={24} color={attendanceRecords[student.id] === 'present' ? '#10B981' : '#E2E8F0'} {...({} as any)} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, attendanceRecords[student.id] === 'absent' && styles.activeAbsent]}
                      onPress={() => toggleAttendance(student.id, 'absent')}
                    >
                      <XCircle size={24} color={attendanceRecords[student.id] === 'absent' ? '#EF4444' : '#E2E8F0'} {...({} as any)} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            {students.length > 0 && (
              <TouchableOpacity 
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitText}>Submit Records</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Unified Alert Modal */}
      <Modal
        visible={!!alertConfig?.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertConfig(null)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>{alertConfig?.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig?.message}</Text>
            
            <View style={styles.alertActions}>
              {alertConfig?.buttons.map((btn, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[
                    styles.alertBtn, 
                    btn.style === 'cancel' ? styles.alertCancelBtn : styles.alertPrimaryBtn,
                    alertConfig.buttons.length > 1 && { flex: 1 }
                  ]}
                  onPress={() => {
                    btn.onPress();
                    setAlertConfig(null);
                  }}
                >
                  <Text style={[
                    styles.alertBtnText,
                    btn.style === 'cancel' ? styles.alertCancelBtnText : { color: 'white' }
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  list: { backgroundColor: 'white', borderRadius: 24, padding: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  name: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 4 },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, marginTop: 16, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cameraPlaceholder: { height: 300, backgroundColor: '#F8FAFC', borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1' },
  placeholderText: { color: theme.colors.textMuted, marginTop: 16, fontSize: 14 },
  selectorContainer: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text, marginBottom: 10 },
  chipScroll: { flexDirection: 'row' },
  classChip: { backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  activeClassChip: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  classChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
  activeClassChipText: { color: 'white' },
  studentInfo: { flex: 1 },
  rollNo: { fontSize: 10, fontWeight: 'bold', color: theme.colors.primary, textTransform: 'uppercase' },
  activePresent: { transform: [{ scale: 1.1 }] },
  activeAbsent: { transform: [{ scale: 1.1 }] },
  emptyCard: { padding: 32, alignItems: 'center' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
  center: { justifyContent: 'center', alignItems: 'center' },

  // Alert Modal Styles
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  alertTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12, textAlign: 'center' },
  alertMessage: { fontSize: 15, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  alertActions: { width: '100%', gap: 10, flexDirection: 'row', justifyContent: 'center' },
  alertBtn: { height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', minWidth: 100 },
  alertPrimaryBtn: { backgroundColor: theme.colors.primary },
  alertCancelBtn: { backgroundColor: '#F1F5F9' },
  alertBtnText: { fontSize: 15, fontWeight: '700' },
  alertCancelBtnText: { color: theme.colors.textMuted },
});
