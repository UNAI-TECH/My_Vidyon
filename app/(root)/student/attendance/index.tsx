import React from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useStudentDashboard } from '../../../../src/hooks/useStudentDashboard';
import { Badge } from '../../../../src/components/common/Badge';

export default function StudentAttendance() {
  const { user } = useAuth();
  const { attendanceRecords, isLoading } = useStudentDashboard(user?.id);

  return (
    <View style={styles.container}>
      <PageHeader title="Attendance History" subtitle="Your daily status tracking" />
      
      <FlatList
        data={attendanceRecords}
        keyExtractor={(item: any) => item.id || item.attendance_date}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.info}>
              <Text style={styles.date}>{item.attendance_date}</Text>
              <Text style={styles.time}>Marked at 09:15 AM</Text>
            </View>
            <Badge variant={item.status === 'present' ? 'success' : item.status === 'absent' ? 'destructive' : 'warning'}>
              {item.status}
            </Badge>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No records found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 24 },
  list: { paddingBottom: 24 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  info: { flex: 1 },
  date: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  time: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, color: theme.colors.textMuted },
});
