import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { Activity, ShieldCheck, Zap, HardDrive } from 'lucide-react-native';

export default function AdminStatus() {
  const services = [
    { name: 'API Engine', status: 'Operational', latency: '45ms', load: '12%' },
    { name: 'PostgreSQL Sync', status: 'Operational', latency: '12ms', load: '8%' },
    { name: 'Auth Bridge', status: 'Operational', latency: '88ms', load: '15%' },
    { name: 'Real-time SSE', status: 'Operational', latency: '5ms', load: '2%' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Cloud Status" subtitle="Real-time infrastructure monitoring" />

      <View style={styles.grid}>
        {services.map((s, i) => (
          <View key={i} style={styles.statusCard}>
            <View style={styles.header}>
              <Text style={styles.serviceName}>{s.name}</Text>
              <View style={styles.dot} />
            </View>
            <View style={styles.metrics}>
              <View style={styles.metricItem}>
                <Zap size={14} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.metricText}>{s.latency}</Text>
              </View>
              <View style={styles.metricItem}>
                <HardDrive size={14} color={theme.colors.textMuted} {...({} as any)} />
                <Text style={styles.metricText}>{s.load}</Text>
              </View>
            </View>
            <View style={styles.badge}>
              <ShieldCheck size={12} color="#10B981" {...({} as any)} />
              <Text style={styles.badgeText}>{s.status}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.uptimeCard}>
        <Activity size={24} color={theme.colors.primary} style={{ marginBottom: 12 }} {...({} as any)} />
        <Text style={styles.uptimeTitle}>99.99% Network Uptime</Text>
        <Text style={styles.uptimeSub}>Last 30 days of global performance</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  statusCard: { flex: 1, minWidth: '45%', backgroundColor: 'white', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  serviceName: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  metrics: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricText: { fontSize: 11, color: theme.colors.textMuted },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#10B981' },
  uptimeCard: { backgroundColor: 'white', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  uptimeTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 },
  uptimeSub: { fontSize: 14, color: theme.colors.textMuted }
});
