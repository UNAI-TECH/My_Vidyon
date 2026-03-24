import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../../../src/theme';
import { PageHeader } from '../../../../../src/components/common/PageHeader';
import { useExamTimetable } from '../../../../../src/hooks/useExamTimetable';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  ChevronLeft,
  AlertCircle,
  FileStack,
  Download
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { downloadAndShareFile } from '../../../../../src/utils/fileUtils';

export default function FacultyExamSchedule() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { fetchEntries } = useExamTimetable({});

  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchEntries(id as string);
        setEntries(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Exam Timetable" 
        subtitle="Manage your schedule and student preparation"
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color={theme.colors.text} {...({} as any)} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {entries.length > 0 ? entries.map((entry) => (
          <View key={entry.id} style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <View style={styles.subjectRow}>
                <BookOpen size={18} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.subjectName}>{entry.subject}</Text>
              </View>
              <View style={styles.dateBadge}>
                <Calendar size={12} color="white" {...({} as any)} />
                <Text style={styles.dateText}>{entry.exam_date}</Text>
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
            </View>
          </View>
        )) : (
          <View style={styles.empty}>
            <AlertCircle size={48} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.emptyTitle}>No Entries Found</Text>
            <Text style={styles.emptySub}>This exam doesn't have a specific timetable yet.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24 },
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

  empty: { alignItems: 'center', marginTop: 100, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  emptySub: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center' }
});
