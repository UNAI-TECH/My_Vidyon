import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { 
  ShieldAlert, 
  Terminal, 
  Clock,
  Activity
} from 'lucide-react-native';

export default function AdminLogs() {
  const logs = [
    { id: '1', action: 'New Institution Added', admin: 'kamal_saas', date: '10:30 AM', type: 'system' },
    { id: '2', action: 'Role Updated: principal@abc.com', admin: 'kamal_saas', date: '09:15 AM', type: 'security' },
    { id: '3', action: 'Server Maintenance Triggered', admin: 'System', date: '08:00 AM', type: 'infra' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="Platform Logs" subtitle="Global audit trails for Super Admin actions" />
      
      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.typeIcon, { backgroundColor: item.type === 'security' ? '#FEF2F2' : '#F1F5F9' }]}>
              {item.type === 'security' ? (
                <ShieldAlert size={18} color="#EF4444" {...({} as any)} />
              ) : (
                <Terminal size={18} color={theme.colors.textMuted} {...({} as any)} />
              )}
            </View>
            <View style={styles.content}>
              <Text style={styles.action}>{item.action}</Text>
              <Text style={styles.meta}>By {item.admin} • {item.date}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.type.toUpperCase()}</Text>
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
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  typeIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  content: { flex: 1 },
  action: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text },
  meta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  tag: { backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 8, fontWeight: 'bold', color: theme.colors.textMuted }
});
