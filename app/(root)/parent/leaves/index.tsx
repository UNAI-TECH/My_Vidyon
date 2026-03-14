import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Calendar, Plus, Clock, CheckCircle } from 'lucide-react-native';

export default function ParentLeaves() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Leave Application" subtitle="Manage school absence requests for your child" />

      <TouchableOpacity style={styles.applyBtn}>
        <Plus size={20} color="white" {...({} as any)} />
        <Text style={styles.applyBtnText}>New Leave Request</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent History</Text>
        {[
          { child: 'Rahul N.', reason: 'Family Event', status: 'Approved', date: 'Mar 12 - Mar 14' },
          { child: 'Rahul N.', reason: 'Medical', status: 'Pending', date: 'Mar 05' },
        ].map((item, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.childName}>{item.child}</Text>
                <Text style={styles.reason}>{item.reason}</Text>
              </View>
              <View style={[styles.status, { backgroundColor: item.status === 'Approved' ? '#ECFDF5' : '#FFFBEB' }]}>
                <Text style={[styles.statusText, { color: item.status === 'Approved' ? '#10B981' : '#F59E0B' }]}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.footer}>
              <Clock size={14} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.dateText}>{item.date}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  applyBtn: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 32 },
  applyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  childName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  reason: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  status: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 12 },
  dateText: { fontSize: 12, color: theme.colors.textMuted }
});
