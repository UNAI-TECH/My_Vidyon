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
  AlertCircle
} from 'lucide-react-native';

import { useRouter } from 'expo-router';

export default function FacultyExams() {
  const { user } = useAuth();
  const router = useRouter();
  const { exams, pendingMarks, isLoading } = useFacultyExams(user?.id);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Exam Management" subtitle="Manage papers and student marks" />

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Exams</Text>
        {exams.length > 0 ? (
          exams.map((exam, i) => (
            <View key={exam.id || i} style={styles.examCard}>
              <View style={styles.examInfo}>
                <Text style={styles.examName}>{exam.exam_display_name || exam.exam_type}</Text>
                <View style={styles.examMeta}>
                  <Calendar size={12} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.metaText}>{exam.academic_year} • Class {exam.class_id} {exam.section}</Text>
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
  actions: { borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 16 },
  actionBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '500' },
});
