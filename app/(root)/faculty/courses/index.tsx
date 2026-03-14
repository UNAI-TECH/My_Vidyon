import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Plus, 
  BookOpen, 
  Users, 
  FileEdit,
  Upload
} from 'lucide-react-native';
import { useFacultyDashboard } from '../../../../src/hooks/useFacultyDashboard';
import { ActivityIndicator } from 'react-native';

export default function FacultyCourses() {
  const { user, institutionId } = useAuth();
  const { assignedSubjects, isLoading } = useFacultyDashboard(user?.id, institutionId || undefined);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Course Administration" subtitle="Manage subjects and content" />

      <TouchableOpacity style={styles.createBtn}>
        <Plus size={20} color="white" {...({} as any)} />
        <Text style={styles.createBtnText}>Create New Subject</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Assigned Subjects</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : assignedSubjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>You haven't been assigned to any subjects yet.</Text>
          </View>
        ) : (
          assignedSubjects.map((assignment: any, i: number) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.code}>{assignment.subjects?.code || 'SUB'}</Text>
                  <Text style={styles.name}>{assignment.subjects?.name || 'Subject'}</Text>
                </View>
                <View style={styles.stats}>
                  <View style={styles.statItem}>
                    <Users size={12} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.statText}>Section {assignment.section}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <BookOpen size={12} color={theme.colors.textMuted} {...({} as any)} />
                    <Text style={styles.statText}>{assignment.classes?.name || 'Class'}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.miniBtn}>
                  <FileEdit size={14} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.miniBtnText}>Edit Syllabus</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.miniBtn}>
                  <Upload size={14} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.miniBtnText}>Add Material</Text>
                </TouchableOpacity>
              </View>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  code: { fontSize: 10, fontWeight: 'bold', color: theme.colors.primary, textTransform: 'uppercase' },
  name: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginTop: 2 },
  stats: { alignItems: 'flex-end', gap: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, color: theme.colors.textMuted },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  actionRow: { flexDirection: 'row', gap: 12 },
  miniBadgeText: { fontSize: 10, fontWeight: '600', color: theme.colors.textMuted },
  miniBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary + '40', backgroundColor: theme.colors.primary + '05' },
  miniBtnText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary },
  emptyCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 24, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' },
});
