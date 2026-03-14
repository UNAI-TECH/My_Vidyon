import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { Book, FileText, Download, ChevronRight } from 'lucide-react-native';

export default function StudentCourses() {
  const courses = [
    { id: '1', name: 'Advanced Mathematics', instructor: 'Dr. Ramesh R.', code: 'MATH401', progress: '65%' },
    { id: '2', name: 'Physics - Newtonian Mechanics', instructor: 'Prof. S. Kumar', code: 'PHYS302', progress: '40%' },
    { id: '3', name: 'Organic Chemistry', instructor: 'Dr. Anita B.', code: 'CHEM201', progress: '80%' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="Course Management" subtitle="Access your syllabi and materials" />
      
      <FlatList
        data={courses}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.iconWrapper}>
              <Book size={20} color={theme.colors.primary} {...({} as any)} />
            </View>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.progress}>{item.progress} Complete</Text>
              </View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.instructor}>{item.instructor}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn}>
                  <FileText size={14} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.actionText}>Syllabus</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Download size={14} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.actionText}>Materials</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ChevronRight size={20} color={theme.colors.textMuted} {...({} as any)} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  list: { paddingBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  iconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  content: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  code: { fontSize: 10, fontWeight: 'bold', color: theme.colors.primary, textTransform: 'uppercase' },
  progress: { fontSize: 10, color: '#10B981', fontWeight: 'bold' },
  name: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  instructor: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primary + '10', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionText: { fontSize: 11, fontWeight: 'bold', color: theme.colors.primary },
});
