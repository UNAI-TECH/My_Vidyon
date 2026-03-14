import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Plus, 
  FileEdit, 
  Send,
  Users,
  Clock,
  ChevronRight
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../src/lib/supabase';
import { ActivityIndicator } from 'react-native';
import { format } from 'date-fns';

export default function FacultyAssignments() {
  const { user, institutionId } = useAuth();

  // Fetch assignments by this teacher
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['faculty-assignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('assignments')
        .select('*, subjects:subject_id(name)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Assignment Control" subtitle="Create and manage class tasks" />

      <TouchableOpacity style={styles.createBtn}>
        <Plus size={20} color="white" {...({} as any)} />
        <Text style={styles.createBtnText}>Create New Assignment</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Assignments</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : assignments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No assignments created yet.</Text>
          </View>
        ) : (
          assignments.map((assignment: any) => (
            <View key={assignment.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.title}>{assignment.title}</Text>
                  <Text style={styles.subjectSub}>{(assignment as any).subjects?.name || 'Subject'}</Text>
                </View>
                <FileEdit size={16} color={theme.colors.primary} {...({} as any)} />
              </View>
              <View style={styles.meta}>
                <View style={styles.metaItem}>
                  <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                  <Text style={styles.metaText}>Due: {assignment.due_date ? format(new Date(assignment.due_date), 'MMM d, yyyy') : 'No due date'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.reviewBtn}>
                <Send size={14} color="white" {...({} as any)} />
                <Text style={styles.reviewBtnText}>Review & Grade</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  createBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 32 },
  createBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: theme.colors.textMuted },
  submissionText: { fontSize: 11, color: theme.colors.primary, fontWeight: '600' },
  reviewBtn: { backgroundColor: '#1E293B', borderRadius: 12, paddingVertical: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  reviewBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  subjectSub: { fontSize: 11, color: theme.colors.primary, marginTop: 2, fontWeight: '600' },
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 32, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 }
});
