import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useExamTimetable } from '../../../../src/hooks/useExamTimetable';
import { useStudentDashboard } from '../../../../src/hooks/useStudentDashboard';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  ChevronRight,
  AlertCircle,
  FileText,
  Download,
  FileStack
} from 'lucide-react-native';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { downloadAndShareFile } from '../../../../src/utils/fileUtils';

export default function StudentExams() {
  const { user, institutionId } = useAuth();
  
  // 1. Get student's class details
  const { studentProfile } = useStudentDashboard(user?.id, institutionId || undefined);
  
  // 2. Resolve classId from className
  const { data: classId } = useQuery({
    queryKey: ['resolve-class-id', studentProfile?.class_name, institutionId],
    queryFn: async () => {
      if (!studentProfile?.class_name) return null;
      
      // Fetch all classes to perform robust matching (handles JSON names and fuzzy matching)
      const { data: potentialClasses } = await supabase.from('classes').select('id, name');
      
      if (!potentialClasses) return null;

      const classMatch = (potentialClasses as any[]).find(c => {
         const name = (c.name || '').toLowerCase();
         const studentClass = studentProfile.class_name.toLowerCase();
         
         // Direct Match
         if (name === studentClass) return true;
         
         // Handle JSON string names (common in this DB)
         try {
           const parsed = JSON.parse(c.name);
           if (parsed.name && parsed.name.toLowerCase() === studentClass) return true;
         } catch (e) {}

         // Semi-fuzzy matches
         return name.includes(studentClass) || studentClass.includes(name);
      });

      return (classMatch as any)?.id || null;
    },
    enabled: !!studentProfile?.class_name
  });

  // 2.5 Resolve internal student_id from profiles.id
  const { data: internalStudent } = useQuery({
    queryKey: ['resolve-internal-student-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();
      return data as { id: string } | null;
    },
    enabled: !!user?.id
  });

  // 3. Fetch schedules for this class
  const { 
    schedules, 
    isLoadingSchedules, 
    fetchEntries 
  } = useExamTimetable({ 
      institutionId: institutionId || undefined,
      classId: (classId as any), 
      section: studentProfile?.section || undefined 
  });

  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);

  const handleSelectExam = async (exam: any) => {
    try {
      setSelectedExam(exam);
      setIsLoadingEntries(true);
      
      // 1. Fetch entries
      const { data: entryData, error: entryError } = await supabase
        .from('exam_schedule_entries')
        .select('*')
        .eq('exam_schedule_id', exam.id)
        .order('exam_date', { ascending: true });
      
      if (entryError) throw entryError;

      // 2. Fetch results
      const { data: results } = await supabase
        .from('exam_results')
        .select('*')
        .eq('student_id', internalStudent?.id || '')
        .eq('exam_id', exam.id)
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

      const mapped = (entryData || []).map((entry: any) => ({
        ...entry,
        result: resultsMap[entry.subject_id] || null
      }));

      setEntries(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  if (isLoadingSchedules) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (selectedExam) {
    return (
      <View style={styles.container}>
        <PageHeader 
          title={selectedExam.exam_display_name} 
          subtitle={`${selectedExam.exam_type} • Class ${studentProfile?.class_name}`}
        />
        
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedExam(null)}>
          <ChevronRight size={20} color={theme.colors.primary} style={{ transform: [{ rotate: '180deg' }] }} {...({} as any)} />
          <Text style={styles.backBtnText}>View All Exams</Text>
        </TouchableOpacity>

        {isLoadingEntries ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.entryList}>
            {entries.length > 0 ? entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.subjectBox}>
                    <BookOpen size={20} color="white" {...({} as any)} />
                    <Text style={styles.subjectText}>{entry.subject}</Text>
                  </View>
                  <View style={styles.dateBox}>
                    <Calendar size={14} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.dateText}>{entry.exam_date}</Text>
                  </View>
                </View>

                <View style={styles.entryDetails}>
                   <View style={styles.timeRow}>
                      <Clock size={16} color={theme.colors.primary} {...({} as any)} />
                      <Text style={styles.timeText}>{entry.start_time} - {entry.end_time}</Text>
                   </View>
                   {entry.syllabus_notes && (() => {
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
                              <Text style={styles.syllabusLabel}>Syllabus:</Text>
                              <Text style={styles.syllabusContent}>{syllabusData.text}</Text>
                            </View>
                          ) : null}

                          {syllabusData.materials && syllabusData.materials.length > 0 && (
                            <View style={styles.materialsSection}>
                              <Text style={styles.materialsLabel}>Materials & Notes</Text>
                              {syllabusData.materials.map((m: any, idx: number) => (
                                <TouchableOpacity 
                                  key={idx} 
                                  style={styles.materialCard}
                                  onPress={() => downloadAndShareFile(m.url, m.name)}
                                >
                                  <View style={styles.materialIcon}>
                                    <FileStack size={18} color={theme.colors.primary} {...({} as any)} />
                                  </View>
                                  <Text style={styles.materialName} numberOfLines={1}>{m.name}</Text>
                                  <Download size={18} color={theme.colors.primary} {...({} as any)} />
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })()}
                </View>
              </View>
            )) : (
              <View style={styles.empty}>
                <AlertCircle size={48} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.emptyTitle}>Schedules Coming Soon</Text>
                <Text style={styles.emptySub}>Subject details are being finalized.</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader 
        title="My Exams" 
        subtitle="View your upcoming examination schedules"
      />

      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AlertCircle size={48} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.emptyTitle}>No Exams Scheduled</Text>
            <Text style={styles.emptySub}>Keep up with your studies! New schedules will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.scheduleCard}
            onPress={() => handleSelectExam(item)}
          >
            <View style={styles.cardGlow} />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleName}>{item.exam_display_name}</Text>
              <Text style={styles.scheduleMeta}>{item.exam_type} • Academic Year {item.academic_year}</Text>
              <View style={styles.viewBadge}>
                <Text style={styles.viewBadgeText}>View Details</Text>
              </View>
            </View>
            <ChevronRight size={24} color={theme.colors.primary} {...({} as any)} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 24 },
  scheduleCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#F1F5F9', elevation: 4, shadowColor: '#000', shadowOffset: { width:0, height:4 }, shadowOpacity:0.06, shadowRadius:12, overflow: 'hidden' },
  cardGlow: { position: 'absolute', top: 0, left: 0, width: 6, height: '100%', backgroundColor: theme.colors.primary },
  scheduleInfo: { flex: 1 },
  scheduleName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  scheduleMeta: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  viewBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 12 },
  viewBadgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase' },
  
  entryList: { padding: 24, paddingBottom: 60 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 24, marginTop: 8, marginBottom: 16 },
  backBtnText: { color: theme.colors.primary, fontWeight: 'bold' },
  entryCard: { backgroundColor: 'white', borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity:0.05, shadowRadius:8, overflow: 'hidden' },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC' },
  subjectBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  subjectText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  entryDetails: { padding: 20, gap: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeText: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  syllabusContainer: { gap: 12 },
  syllabusBox: { backgroundColor: '#F1F5F9', padding: 16, borderRadius: 16 },
  syllabusLabel: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted, marginBottom: 4, textTransform: 'uppercase' },
  syllabusContent: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  
  materialsSection: { marginTop: 4 },
  materialsLabel: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted, marginBottom: 10, textTransform: 'uppercase' },
  materialCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 8 },
  materialIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
  materialName: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.text },

  empty: { alignItems: 'center', marginTop: 100, gap: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text },
  emptySub: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },

  resultContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultLabel: { fontSize: 10, fontWeight: '800', color: theme.colors.primary, letterSpacing: 1 },
  statusBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: 'bold', color: '#166534' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  scoreBox: { flexDirection: 'row', alignItems: 'baseline', gap: 2, backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  scoreVal: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text },
  scoreMax: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600' },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  gradeText: { fontSize: 18, fontWeight: '900' },
  remarksBox: { backgroundColor: theme.colors.primary + '05', padding: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  remarksText: { fontSize: 12, color: theme.colors.text, fontStyle: 'italic', lineHeight: 18 }
});
