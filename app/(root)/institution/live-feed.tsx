import React from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { 
  Camera, 
  Activity, 
  Users,
  ShieldAlert
} from 'lucide-react-native';

export default function LiveFeed() {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Live Campus Feed" subtitle="Real-time Vision & Security Monitoring" />

      <View style={styles.cameraContainer}>
        <View style={styles.cameraFrame}>
            <View style={styles.overlay}>
              <Animated.View style={[styles.liveIndicator, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.liveText}>LIVE • GATE 01</Text>
              </Animated.View>
            </View>
            <Camera size={64} color="#CBD5E1" {...({} as any)} />
            <Text style={styles.placeholderText}>Camera Bridge Active</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.miniStat}>
          <Users size={18} color="#3B82F6" {...({} as any)} />
          <Text style={styles.miniValue}>1,240</Text>
          <Text style={styles.miniLabel}>On Campus</Text>
        </View>
        <View style={styles.miniStat}>
          <Activity size={18} color="#10B981" {...({} as any)} />
          <Text style={styles.miniValue}>42</Text>
          <Text style={styles.miniLabel}>Entries/Min</Text>
        </View>
        <View style={styles.miniStat}>
          <ShieldAlert size={18} color="#EF4444" {...({} as any)} />
          <Text style={styles.miniValue}>Low</Text>
          <Text style={styles.miniLabel}>Wait Time</Text>
        </View>
      </View>

      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Recent Access Detections</Text>
        {[ 'Student #4321 - Face ID Verified', 'Faculty #102 - Biometric Match', 'Student #982 - Late Entry Detected' ].map((log, i) => (
          <View key={i} style={styles.logItem}>
            <View style={styles.dot} />
            <Text style={styles.logText}>{log}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24 },
  cameraContainer: { marginBottom: 32 },
  cameraFrame: { height: 280, backgroundColor: '#1E293B', borderRadius: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  overlay: { position: 'absolute', top: 20, left: 20, zIndex: 10 },
  liveIndicator: { backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  liveText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  placeholderText: { color: '#64748B', marginTop: 16, fontSize: 14, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  miniStat: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  miniValue: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginVertical: 4 },
  miniLabel: { fontSize: 9, color: theme.colors.textMuted, fontWeight: 'bold', textTransform: 'uppercase' },
  logContainer: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  logTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  logItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B82F6' },
  logText: { fontSize: 13, color: theme.colors.text }
});
