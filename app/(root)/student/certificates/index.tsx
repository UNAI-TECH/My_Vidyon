import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useStudentDashboard } from '../../../../src/hooks/useStudentDashboard';
import { Award, Download, Clock } from 'lucide-react-native';
import { format } from 'date-fns';
import { downloadAndShareFile } from '../../../../src/utils/fileUtils';

export default function StudentCertificates() {
  const { user } = useAuth();
  const { certificates, isLoading } = useStudentDashboard(user?.id);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Certificates" subtitle="View your achievements and certifications" />
      
      <FlatList
        data={certificates}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.iconWrapper}>
              <Award size={24} color={theme.colors.primary} {...({} as any)} />
            </View>
            <View style={styles.content}>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.description}>{item.course_description}</Text>
              <View style={styles.footer}>
                <Clock size={12} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.date}>Issued: {format(new Date(item.uploaded_at), 'MMM d, yyyy')}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.downloadBtn}
              onPress={() => downloadAndShareFile(item.file_url, item.file_name || `certificate_${item.id}.pdf`)}
            >
              <Download size={20} color={theme.colors.primary} {...({} as any)} />
              <Text style={styles.downloadLabel}>Download</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Award size={48} color={theme.colors.textMuted} {...({} as any)} />
            <Text style={styles.emptyText}>No certificates issued yet.</Text>
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
  category: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  description: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  date: { fontSize: 11, color: theme.colors.textMuted },
  downloadBtn: { backgroundColor: theme.colors.primary + '10', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 12 },
  downloadLabel: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: theme.colors.textMuted, marginTop: 16, fontSize: 15 },
});
