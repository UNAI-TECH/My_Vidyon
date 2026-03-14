import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  MessageCircle
} from 'lucide-react-native';

export default function InstitutionLeaves() {
  const requests = [
    { id: '1', name: 'Prof. John Doe', role: 'Faculty', type: 'Sick Leave', duration: '2 Days', status: 'pending' },
    { id: '2', name: 'Rahul N.', role: 'Student (10-A)', type: 'Emergency', duration: '1 Day', status: 'pending' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="Leave Approvals" subtitle="Centralized request management for staff & students" />
      
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <User size={20} color={theme.colors.primary} {...({} as any)} />
                </View>
                <View>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.role}>{item.role}</Text>
                </View>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{item.type}</Text>
              </View>
            </View>

            <View style={styles.body}>
              <View style={styles.metaInfo}>
                <Clock size={14} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.metaText}>Duration: {item.duration}</Text>
              </View>
              <TouchableOpacity style={styles.chatBtn}>
                <MessageCircle size={14} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.chatText}>Discuss</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]}>
                <XCircle size={18} color="#EF4444" {...({} as any)} />
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]}>
                <CheckCircle size={18} color="white" {...({} as any)} />
                <Text style={styles.approveText}>Approve</Text>
              </TouchableOpacity>
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
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  role: { fontSize: 11, color: theme.colors.textMuted },
  typeBadge: { backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  typeText: { fontSize: 10, fontWeight: 'bold', color: theme.colors.textMuted },
  body: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  metaInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: theme.colors.textMuted },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.primary },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  rejectBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2' },
  rejectText: { color: '#EF4444', fontWeight: 'bold', fontSize: 13 },
  approveBtn: { backgroundColor: '#10B981' },
  approveText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
});
