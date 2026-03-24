import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useStudentDashboard } from '../../../../src/hooks/useStudentDashboard';
import { BookOpen, Download, FileText } from 'lucide-react-native';
import { downloadAndShareFile } from '../../../../src/utils/fileUtils';

export default function StudentCourses() {
  const { user, institutionId } = useAuth();
  const { materials, isLoading } = useStudentDashboard(user?.id, institutionId || undefined);
  const [selectedSubject, setSelectedSubject] = React.useState('All');

  // Extract unique subjects for filtering
  const subjects = React.useMemo(() => {
    const unique = new Set((materials || []).map((m: any) => m.subject).filter(Boolean));
    return ['All', ...Array.from(unique)].sort();
  }, [materials]);

  const filteredMaterials = React.useMemo(() => {
    if (selectedSubject === 'All') return materials;
    return (materials || []).filter((m: any) => m.subject === selectedSubject);
  }, [materials, selectedSubject]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Course Materials" subtitle="Access your study resources and notes" />
      
      <View style={styles.filterWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterContainer}
        >
          {subjects.map((subject) => (
            <TouchableOpacity
              key={subject}
              style={[
                styles.filterChip,
                selectedSubject === subject && styles.activeFilterChip
              ]}
              onPress={() => setSelectedSubject(subject)}
            >
              <Text style={[
                styles.filterChipText,
                selectedSubject === subject && styles.activeFilterChipText
              ]}>
                {subject}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredMaterials}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.iconWrapper}>
              <FileText size={24} color={theme.colors.primary} {...({} as any)} />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subject}>{item.subject}</Text>
              {item.description && (
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.downloadBtn}
              onPress={() => downloadAndShareFile(item.file_url, item.file_name || `material_${item.id}.pdf`)}
            >
              <Download size={20} color={theme.colors.primary} {...({} as any)} />
              <Text style={styles.downloadLabel}>Download</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BookOpen size={48} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.emptyText}>No materials uploaded yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  iconWrapper: { width: 50, height: 50, borderRadius: 12, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  subject: { fontSize: 13, color: theme.colors.primary, fontWeight: '600', marginTop: 2 },
  description: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  downloadBtn: { backgroundColor: theme.colors.primary + '10', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 12 },
  downloadLabel: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: theme.colors.textMuted, marginTop: 16, fontSize: 15 },
  
  filterWrapper: { marginBottom: 20, marginHorizontal: -24 },
  filterContainer: { paddingHorizontal: 24, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  activeFilterChip: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  activeFilterChipText: { color: 'white' },
});
