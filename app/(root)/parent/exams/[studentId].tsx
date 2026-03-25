import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  ChevronLeft,
  AlertCircle,
  FileStack,
  Download,
  ClipboardList
} from 'lucide-react-native';
import { useExamTimetable } from '../../../../src/hooks/useExamTimetable';
import { downloadAndShareFile } from '../../../../src/utils/fileUtils';

export default function ParentStudentExams() {
  const { studentId, name } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // 1. Fetch Student Details to get Class/Section
  const { data: student, isLoading: isStudentLoading } = useQuery<{
    id: string;
    name: string;
    class_name: string;
    section: string;
    institution_id: string;
  }>({
    queryKey: ['parent-exam-student', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, class_name, section, institution_id')
        .eq('id', studentId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!studentId
  });

  // 2. Resolve Class ID from Class Name
  const { data: resolvedClassId } = useQuery({
    queryKey: ['resolve-class-id', student?.class_name, student?.institution_id],
    queryFn: async () => {
      if (!student?.class_name) return null;
      const { data: potentialClasses } = await supabase
        .from('classes')
        .select('id, name')
        .eq('institution_id', student.institution_id);
      
      if (!potentialClasses) return null;

      const match = (potentialClasses as any[]).find(c => {
         const name = (c.name || '').toLowerCase();
         const studentClass = student.class_name.toLowerCase();
         if (name === studentClass) return true;
         try {
           const parsed = JSON.parse(c.name);
           if (parsed.name && parsed.name.toLowerCase() === studentClass) return true;
         } catch (e) {}
         return name.includes(studentClass) || studentClass.includes(name);
      });
      return (match as any)?.id || null;
    },
    enabled: !!student?.class_name
  });

  // 3. Fetch Exam Schedules for this Class/Section using the standardized hook
  const { schedules, isLoadingSchedules: isExamsLoading } = useExamTimetable({
    institutionId: student?.institution_id,
    classId: resolvedClassId || undefined,
    section: student?.section || undefined
  });

  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [isEntriesLoading, setIsEntriesLoading] = useState(false);

  const fetchEntries = async (scheduleId: string) => {
    try {
      setIsEntriesLoading(true);
      const { data, error } = await supabase
        .from('exam_schedule_entries')
        .select('*')
        .eq('exam_schedule_id', scheduleId) // Fixed column name
        .order('exam_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      // 2. Get existing results for these entries
      const { data: results } = await supabase
        .from('exam_results')
        .select('*')
        .eq('student_id', studentId)
        .eq('exam_id', scheduleId)
        .eq('status', 'PUBLISHED');

      const calculateGrade = (score: number, max: number) => {
        const p = (score / max) * 100;
        if (p >= 90) return { label: 'A+', color: '#166534' };
        if (p >= 80) return { label: 'A', color: '#166534' };
        if (p >= 70) return { label: 'B', color: '#3b82f6' };
        if (p >= 60) return { label: 'C', color: '#854d0e' };
        if (p >= 50) return { label: 'D', color: '#854d0e' };
        return { label: 'F', color: '#991b1b' };
      };

      const resultsMap = (results || []).reduce((acc: any, res: any) => {
        acc[res.subject_id] = {
          ...res,
          grade: calculateGrade(res.total_marks, res.max_marks)
        };
        return acc;
      }, {});

      const mapped = (data || []).map((entry: any) => ({
        ...entry,
        result: resultsMap[entry.subject_id] || null
      }));

      setEntries(mapped);
    } catch (err) {
      console.error("Error fetching entries:", err);
    } finally {
      setIsEntriesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSchedule) {
      fetchEntries(selectedSchedule.id);
    }
  }, [selectedSchedule]);

  const checkIsEnded = (date: string, endTime?: string) => {
    try {
      // Formats expected: date "YYYY-MM-DD", endTime "HH:MM" or "HH:MM:SS"
      const examDateTime = new Date(`${date}T${endTime || '23:59:00'}`);
      return examDateTime < new Date();
    } catch (e) {
      return false;
    }
  };

  if (isStudentLoading || isExamsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader 
        title={selectedSchedule ? "Exam Timetable" : "Exam Schedules"} 
        subtitle={selectedSchedule ? selectedSchedule.exam_display_name : `Upcoming exams for ${name || student?.name}`}
        leftAction={
          <TouchableOpacity onPress={() => selectedSchedule ? setSelectedSchedule(null) : router.back()}>
            <ChevronLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        }
      />

      {selectedSchedule ? (
        <ScrollView contentContainerStyle={styles.content}>
          {isEntriesLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : entries.length > 0 ? (
            entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.subjectRow}>
                    <BookOpen size={18} color={theme.colors.primary} {...({} as any)} />
                    <Text style={styles.subjectName}>{entry.subject}</Text>
                  </View>
                  <View style={[
                    styles.dateBadge, 
                    checkIsEnded(entry.exam_date, entry.end_time) && { backgroundColor: '#EF4444' }
                  ]}>
                    <Calendar size={12} color="white" {...({} as any)} />
                    <Text style={styles.dateText}>
                      {entry.exam_date} {checkIsEnded(entry.exam_date, entry.end_time) && " (Ended)"}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                   <View style={styles.infoRow}>
                      <Clock size={14} color={theme.colors.textMuted} {...({} as any)} />
                      <Text style={styles.infoText}>{entry.start_time} - {entry.end_time}</Text>
                   </View>
                   
                   {entry.syllabus_notes ? (() => {
                      let syllabusData = { text: '', materials: [] };
                      try {
                        syllabusData = JSON.parse(entry.syllabus_notes);
                      } catch (e) {
                        syllabusData = { text: entry.syllabus_notes, materials: [] };
                      }

                      return (
                        <View style={styles.syllabusContainer}>
                          {syllabusData.text ? (
                            <View style={styles.syllabusBox}>
                              <Text style={styles.syllabusLabel}>Syllabus / Instructions:</Text>
                              <Text style={styles.syllabusText}>{syllabusData.text}</Text>
                            </View>
                          ) : null}

                          {syllabusData.materials && syllabusData.materials.length > 0 && (
                            <View style={styles.materialsSection}>
                              {syllabusData.materials.map((m: any, idx: number) => (
                                <TouchableOpacity 
                                  key={idx} 
                                  style={styles.materialCard}
                                  onPress={() => downloadAndShareFile(m.url, m.name)}
                                >
                                  <FileStack size={14} color={theme.colors.primary} {...({} as any)} />
                                  <Text style={styles.materialName} numberOfLines={1}>{m.name}</Text>
                                  <Download size={14} color={theme.colors.primary} {...({} as any)} />
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })() : null}

                    {entry.result && (
                      <View style={styles.resultContainer}>
                        <View style={styles.resultHeader}>
                          <Text style={styles.resultLabel}>EXAM RESULT</Text>
                          <View style={[styles.statusBadge, { backgroundColor: entry.result.status === 'PUBLISHED' ? '#DCFCE7' : '#F1F5F9' }]}>
                            <Text style={[styles.statusText, { color: entry.result.status === 'PUBLISHED' ? '#166534' : theme.colors.textMuted }]}>
                              {entry.result.status}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.scoreRow}>
                          <View style={styles.scoreBox}>
                            <Text style={styles.scoreVal}>{entry.result.total_marks}</Text>
                            <Text style={styles.scoreMax}>/ {entry.result.max_marks}</Text>
                          </View>
                          <View style={[styles.gradeBadge, { backgroundColor: entry.result.grade.color + '15' }]}>
                             <Text style={[styles.gradeText, { color: entry.result.grade.color }]}>{entry.result.grade.label}</Text>
                          </View>
                        </View>
                        {entry.result.remarks && (
                          <View style={styles.remarksBox}>
                            <Text style={styles.remarksText}>"{entry.result.remarks}"</Text>
                          </View>
                        )}
                      </View>
                    )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <AlertCircle size={48} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.emptyTitle}>No Timetable Found</Text>
              <Text style={styles.emptySub}>The entries for this exam haven't been added yet.</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ClipboardList size={48} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.emptyTitle}>No Exams Scheduled</Text>
              <Text style={styles.emptySub}>There are no upcoming exams for your child's class.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.scheduleCard}
              onPress={() => setSelectedSchedule(item as any)}
            >
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleName}>{(item as any).exam_display_name}</Text>
                <Text style={styles.scheduleMeta}>
                  {(item as any).exam_type} • Academic Year {(item as any).academic_year}
                </Text>
              </View>
              <ChevronLeft size={20} color={theme.colors.textMuted} style={{ transform: [{ rotate: '180deg' }] }} {...({} as any)} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24 },
  list: { padding: 24 },
  scheduleCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity:0.05, shadowRadius:5 },
  scheduleInfo: { flex: 1 },
  scheduleName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  scheduleMeta: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  
  entryCard: { backgroundColor: 'white', borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity:0.05, shadowRadius:5, overflow: 'hidden' },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjectName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  dateBadge: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  dateText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  cardBody: { padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  infoText: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
  syllabusBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  syllabusLabel: { fontSize: 10, fontWeight: 'bold', color: theme.colors.textMuted, marginBottom: 4, textTransform: 'uppercase' },
  syllabusText: { fontSize: 12, color: theme.colors.text, lineHeight: 18 },
  
  syllabusContainer: { gap: 8 },
  materialsSection: { gap: 6 },
  materialCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F1F5F9', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  materialName: { flex: 1, fontSize: 11, fontWeight: '600', color: theme.colors.text },

  empty: { alignItems: 'center', marginTop: 100, gap: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  emptySub: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },

  resultContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultLabel: { fontSize: 10, fontWeight: '800', color: theme.colors.primary, letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: 'bold' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  scoreBox: { flexDirection: 'row', alignItems: 'baseline', gap: 2, backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  scoreVal: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  scoreMax: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  gradeText: { fontSize: 16, fontWeight: '900' },
  remarksBox: { flex: 1, backgroundColor: theme.colors.primary + '05', padding: 8, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: theme.colors.primary },
  remarksText: { fontSize: 12, color: theme.colors.text, fontStyle: 'italic' }
});
