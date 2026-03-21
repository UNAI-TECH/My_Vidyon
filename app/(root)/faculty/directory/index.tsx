import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Linking, Alert, Modal, Image } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { 
  Search, 
  Phone, 
  MessageCircle, 
  User,
  ChevronRight,
  Filter,
  X,
  Calendar,
  Award,
  LogOut,
  FileText
} from 'lucide-react-native';
import { format } from 'date-fns';

export default function StudentDirectory() {
  const { user, institutionId } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = React.useState<any | null>(null);
  const [showModal, setShowModal] = React.useState(false);

  // 1. Fetch faculty assignments to get list of classes
  const { data: assignments = [] } = useQuery<any[]>({
    queryKey: ['faculty-assignments-dir', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('faculty_subjects')
        .select('*, classes:class_id(*)')
        .eq('faculty_profile_id', user.id);
      if (error) return [];
      return data || [];
    },
    enabled: !!user?.id,
  });

  const classes = React.useMemo(() => {
    const unique = new Set();
    return assignments.map(a => ({
      id: a.class_id,
      name: a.classes?.name,
      section: a.section
    })).filter(c => {
      const key = `${c.name}-${c.section}`;
      if (unique.has(key)) return false;
      unique.add(key);
      return true;
    });
  }, [assignments]);

  // 1.1 Check if faculty is a class teacher for any class
  const classTeacherOf = React.useMemo(() => {
    return assignments
      .filter(a => a.classes?.class_teacher_id === user?.id)
      .map(a => `${a.classes?.name}-${a.section}`);
  }, [assignments, user?.id]);

  // 2. Fetch students
  const { data: students = [], isLoading } = useQuery<any[]>({
    queryKey: ['directory-students', user?.id, selectedClass],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('students')
        .select('*, image_url, parent_phone, parent_name')
        .eq('institution_id', institutionId as string);

      if (selectedClass) {
        const [className, section] = selectedClass.split('-');
        query = query.eq('class_name', className).eq('section', section);
      } else {
        const classFilters = classes.map(c => 
          `and(class_name.eq."${c.name}",section.eq."${c.section}")`
        ).join(',');
        
        if (classFilters) {
          query = query.or(classFilters);
        } else {
          return [];
        }
      }

      const { data, error } = await query.order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && (classes.length > 0 || !!selectedClass),
  });

  // 3. Fetch detailed data for modal
  const { data: studentDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['student-details', selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent?.id) return null;

      const isClassTeacher = classTeacherOf.includes(`${selectedStudent.class_name}-${selectedStudent.section}`);

      const { data: attendance } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .order('attendance_date', { ascending: false });

      let resultsQuery = supabase
        .from('exam_results')
        .select('*, subjects:subject_id(name)')
        .eq('student_id', selectedStudent.id);

      if (!isClassTeacher) {
        const facultySubjectIds = assignments
          .filter(a => a.class_id === selectedStudent.class_id || (a.classes?.name === selectedStudent.class_name && a.section === selectedStudent.section))
          .map(a => a.subject_id);
        resultsQuery = resultsQuery.in('subject_id', facultySubjectIds);
      }
      const { data: results } = await resultsQuery;

      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .order('from_date', { ascending: false });

      return {
        attendance: attendance || [],
        results: results || [],
        leaves: leaves || [],
        isClassTeacher
      };
    },
    enabled: !!selectedStudent?.id && showModal,
  });

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.register_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCall = (phone: string | null) => {
    if (!phone) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone: string | null) => {
    if (!phone) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="Student Directory" subtitle="Quick contact and student info" />

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={20} color={theme.colors.textMuted} {...({} as any)} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search by name or reg number..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity 
              style={[styles.filterChip, !selectedClass && styles.activeFilterChip]}
              onPress={() => setSelectedClass(null)}
            >
              <Text style={[styles.filterText, !selectedClass && styles.activeFilterText]}>All Classes</Text>
            </TouchableOpacity>
            {classes.map((c, i) => (
              <TouchableOpacity 
                key={i} 
                style={[styles.filterChip, selectedClass === `${c.name}-${c.section}` && styles.activeFilterChip]}
                onPress={() => setSelectedClass(`${c.name}-${c.section}`)}
              >
                <Text style={[styles.filterText, selectedClass === `${c.name}-${c.section}` && styles.activeFilterText]}>
                  {c.name} {c.section}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.studentList}>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : filteredStudents.length === 0 ? (
            <View style={styles.emptyState}>
              <User size={48} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.emptyText}>No students found</Text>
            </View>
          ) : (
            filteredStudents.map((student) => (
              <TouchableOpacity 
                key={student.id} 
                style={styles.studentCard}
                onPress={() => {
                  setSelectedStudent(student);
                  setShowModal(true);
                }}
              >
                <View style={styles.studentMain}>
                  <View style={styles.avatar}>
                    {student.image_url ? (
                      <Image source={{ uri: student.image_url }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
                    )}
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{student.name}</Text>
                    <Text style={styles.meta}>{student.class_name} {student.section} • #{student.register_number}</Text>
                    <Text style={styles.parentMeta}>{student.parent_name}: {student.parent_phone}</Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => handleCall(student.phone || student.parent_phone)}
                  >
                    <Phone size={18} color={theme.colors.primary} {...({} as any)} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#F0FDF4' }]}
                    onPress={() => handleWhatsApp(student.phone || student.parent_phone)}
                  >
                    <MessageCircle size={18} color="#166534" {...({} as any)} />
                  </TouchableOpacity>
                  <ChevronRight size={18} color={theme.colors.textMuted} {...({} as any)} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Student Detail Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Award size={22} color={theme.colors.primary} style={{ marginRight: 10 }} {...({} as any)} />
                <Text style={styles.modalTitle}>Student Profile</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={theme.colors.textMuted} {...({} as any)} />
              </TouchableOpacity>
            </View>

            {selectedStudent && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.profileHero}>
                  <View style={styles.heroAvatar}>
                    {selectedStudent.image_url ? (
                      <Image source={{ uri: selectedStudent.image_url }} style={styles.heroAvatarImg} />
                    ) : (
                      <Text style={styles.heroAvatarText}>{selectedStudent.name.charAt(0)}</Text>
                    )}
                  </View>
                  <Text style={styles.heroName}>{selectedStudent.name}</Text>
                  <Text style={styles.heroMeta}>{selectedStudent.class_name} {selectedStudent.section} • #{selectedStudent.register_number}</Text>
                </View>

                {isLoadingDetails ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
                ) : (
                  <View style={styles.detailsGrid}>
                    {/* Attendance Logs (Only for Class Teacher) */}
                    {studentDetails?.isClassTeacher && (
                      <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                          <Calendar size={18} color={theme.colors.primary} {...({} as any)} />
                          <Text style={styles.sectionTitle}>Attendance Logs</Text>
                        </View>
                        {studentDetails?.attendance.length === 0 ? (
                          <Text style={styles.emptyDetail}>No records found</Text>
                        ) : (
                          studentDetails?.attendance.slice(0, 5).map((log: any) => (
                            <View key={log.id} style={styles.logRow}>
                              <Text style={styles.logDate}>{format(new Date(log.attendance_date), 'MMM d, yyyy')}</Text>
                              <Text style={[styles.logStatus, { color: log.status === 'present' ? '#16a34a' : '#dc2626' }]}>
                                {log.status.toUpperCase()}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}

                    {/* Subject Grades & Remarks */}
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Award size={18} color={theme.colors.primary} {...({} as any)} />
                        <Text style={styles.sectionTitle}>Performance & Remarks</Text>
                      </View>
                      {studentDetails?.results.length === 0 ? (
                        <Text style={styles.emptyDetail}>No results found</Text>
                      ) : (
                        studentDetails?.results.map((res: any) => (
                          <View key={res.id} style={styles.gradeCard}>
                            <View style={styles.gradeHeader}>
                              <Text style={styles.gradeSubject}>{res.subjects?.name || 'Subject'}</Text>
                              <View style={styles.gradeBadge}>
                                <Text style={styles.gradeText}>{res.marks_obtained}/{res.total_marks}</Text>
                              </View>
                            </View>
                            {res.remarks && <Text style={styles.gradeRemarks}>"{res.remarks}"</Text>}
                          </View>
                        ))
                      )}
                    </View>

                    {/* Leave Requests (Only for Class Teacher) */}
                    {studentDetails?.isClassTeacher && (
                      <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                          <LogOut size={18} color={theme.colors.primary} {...({} as any)} />
                          <Text style={styles.sectionTitle}>Leave History</Text>
                        </View>
                        {studentDetails?.leaves.length === 0 ? (
                          <Text style={styles.emptyDetail}>No leaves requested</Text>
                        ) : (
                          studentDetails?.leaves.map((leave: any) => (
                            <View key={leave.id} style={styles.leaveCard}>
                              <Text style={styles.leaveDate}>{format(new Date(leave.from_date), 'MMM d')} - {format(new Date(leave.to_date), 'MMM d, yyyy')}</Text>
                              <Text style={styles.leaveReason}>{leave.reason}</Text>
                              <View style={[styles.statusBadge, { backgroundColor: leave.status === 'approved' ? '#f0fdf4' : '#fef2f2' }]}>
                                <Text style={[styles.statusText, { color: leave.status === 'approved' ? '#166534' : '#991b1b' }]}>
                                  {leave.status.toUpperCase()}
                                </Text>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  searchSection: { marginBottom: 24, gap: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, height: 56, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', gap: 12 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
  filterScroll: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'white', marginRight: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  activeFilterChip: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
  activeFilterText: { color: 'white' },
  studentList: { gap: 12 },
  studentCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#F1F5F9' },
  studentMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary },
  info: { gap: 2 },
  name: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  meta: { fontSize: 12, color: theme.colors.textMuted },
  parentMeta: { fontSize: 11, color: theme.colors.primary, fontWeight: '600', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center' },
  emptyState: { padding: 60, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '90%', padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalHeaderTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  modalCloseBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 12 },
  modalBody: { flex: 1 },
  profileHero: { alignItems: 'center', marginBottom: 24, backgroundColor: '#F8FAFC', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  heroAvatar: { width: 90, height: 90, borderRadius: 30, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden', borderWidth: 3, borderColor: 'white', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  heroAvatarImg: { width: '100%', height: '100%' },
  heroAvatarText: { fontSize: 36, fontWeight: 'bold', color: theme.colors.primary },
  heroName: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  heroMeta: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4, fontWeight: '500' },
  detailsGrid: { gap: 20 },
  section: { backgroundColor: 'white', padding: 18, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: theme.colors.text },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  logDate: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },
  logStatus: { fontSize: 12, fontWeight: 'bold' },
  gradeCard: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  gradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gradeSubject: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  gradeBadge: { backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  gradeText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.primary },
  gradeRemarks: { fontSize: 12, color: theme.colors.textMuted, marginTop: 10, fontStyle: 'italic', backgroundColor: 'white', padding: 8, borderRadius: 8 },
  leaveCard: { backgroundColor: '#F8FAFC', padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  leaveDate: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  leaveReason: { fontSize: 12, color: theme.colors.textMuted, marginVertical: 6 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  emptyDetail: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', marginTop: 10, paddingVertical: 20 }
});
