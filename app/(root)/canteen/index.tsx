import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert } from 'react-native';
import { NotificationBell } from '../../../src/components/common/NotificationBell';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { useAuth } from '../../../src/hooks/useAuth';
import { useCanteenDashboard } from '../../../src/hooks/useCanteenDashboard';
import { supabase } from '../../../src/lib/supabase';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Search,
  Lock
} from 'lucide-react-native';

export default function CanteenDashboard() {
  const { institutionId, role } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string | undefined>();
  const { students, classes, institution, canteenProfile, isLoading } = useCanteenDashboard(institutionId || undefined, selectedClass);

  const welcomeName = canteenProfile?.full_name || 'Canteen Manager';

  const toggleStatus = async (studentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'permitted' ? 'unverified' : currentStatus === 'unverified' ? 'absent' : 'permitted';
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('canteen_attendance')
      .upsert({
        student_id: studentId,
        institution_id: institutionId!,
        canteen_date: today,
        status: nextStatus,
      } as any, { onConflict: 'student_id,canteen_date' });

    if (error) {
      console.error('Error updating canteen status:', error);
      Alert.alert('Error', 'Failed to update canteen status.');
    }
  };

  const handleCloseDay = () => {
    Alert.alert(
      "Submit & Close Day",
      "This will finalize all meal records for today. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Finalize", onPress: () => console.log("Day Closed"), style: "destructive" }
      ]
    );
  };

  if (isLoading) return <View style={styles.container}><Text>Loading Canteen Data...</Text></View>;

  return (
    <View style={styles.container}>
      <PageHeader 
        title={`Hello, ${welcomeName}!`} 
        subtitle="Real-time Dining entry control" 
        institutionName={institution?.name}
        institutionLogo={institution?.logo_url}
        userRole={role || undefined}
        userAvatar={canteenProfile?.image_url || undefined}
        userSubtitle="Canteen Admin"
        actions={<NotificationBell />}
      />
      
      <View style={styles.classSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          <TouchableOpacity 
            style={[styles.chip, !selectedClass && styles.activeChip]}
            onPress={() => setSelectedClass(undefined)}
          >
            <Text style={[styles.chipText, !selectedClass && styles.activeChipText]}>All</Text>
          </TouchableOpacity>
          {classes.map(cls => (
            <TouchableOpacity 
              key={cls} 
              style={[styles.chip, selectedClass === cls && styles.activeChip]}
              onPress={() => setSelectedClass(cls)}
            >
              <Text style={[styles.chipText, selectedClass === cls && styles.activeChipText]}>{cls}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={students}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.studentCard}>
            <View style={styles.studentInfo}>
              <Text style={styles.roll}>#{item.roll}</Text>
              <Text style={styles.name}>{item.name}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => toggleStatus(item.id, item.status)}
              style={[
                styles.statusBadge, 
                item.status === 'permitted' ? styles.bgPermitted : 
                item.status === 'absent' ? styles.bgAbsent : styles.bgUnverified
              ]}
            >
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>Operational Legend</Text>
            <View style={styles.legendGrid}>
              <View style={styles.legendItem}><View style={[styles.dot, styles.bgPermitted]} /><Text style={styles.legendText}>Permitted (Present)</Text></View>
              <View style={styles.legendItem}><View style={[styles.dot, styles.bgAbsent]} /><Text style={styles.legendText}>Absent (Security Alert)</Text></View>
              <View style={styles.legendItem}><View style={[styles.dot, styles.bgUnverified]} /><Text style={styles.legendText}>Unverified (Manual)</Text></View>
            </View>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleCloseDay}>
          <Lock size={20} color="white" {...({} as any)} />
          <Text style={styles.closeBtnText}>Submit & Close Day</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  classSelector: { paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  chipScroll: { paddingHorizontal: 24, gap: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F1F5F9' },
  activeChip: { backgroundColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textMuted },
  activeChipText: { color: 'white' },
  list: { padding: 24 },
  studentCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  studentInfo: { flex: 1 },
  roll: { fontSize: 10, fontWeight: 'bold', color: theme.colors.textMuted },
  name: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold', color: 'white' },
  bgPermitted: { backgroundColor: '#10B981' },
  bgAbsent: { backgroundColor: '#EF4444' },
  bgUnverified: { backgroundColor: '#94A3B8' },
  legend: { marginBottom: 24, backgroundColor: 'white', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  legendTitle: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted, marginBottom: 12, letterSpacing: 1 },
  legendGrid: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: theme.colors.text },
  footer: { padding: 24, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  closeBtn: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  closeBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
