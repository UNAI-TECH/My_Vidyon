import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  Award, 
  Download, 
  Eye,
  FileText
} from 'lucide-react-native';

export default function StudentCertificates() {
  const certificates = [
    { id: '1', title: 'Academic Excellence - Grade 9', date: 'June 2025', issuer: 'ABC High School' },
    { id: '2', title: 'Inter-School Debate Winner', date: 'Oct 2025', issuer: 'District Education Board' },
    { id: '3', title: 'Python Programming Basics', date: 'Jan 2026', issuer: 'Vidyon Labs' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="Digital Certificates" subtitle="Your repository for academic & extracurricular achievements" />
      
      <FlatList
        data={certificates}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Award size={24} color={theme.colors.primary} {...({} as any)} />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{item.issuer} • {item.date}</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.miniBtn}>
                  <Eye size={14} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.btnText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.miniBtn}>
                  <Download size={14} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.btnText}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  list: { paddingBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  iconBox: { width: 52, height: 52, borderRadius: 16, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  meta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  miniBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  btnText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary }
});
