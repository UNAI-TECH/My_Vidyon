import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { theme } from '../../../../src/theme';
import { PageHeader } from '../../../../src/components/common/PageHeader';
import { useAuth } from '../../../../src/hooks/useAuth';
import { supabase } from '../../../../src/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar as CalendarIcon,
  TrendingUp,
  AlertCircle
} from 'lucide-react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function MyAttendanceScreen() {
  const { user, institutionId } = useAuth();

  // Fetch attendance records for the current user
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['my-staff-attendance', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('profile_id', user.id)
        .order('attendance_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const stats = React.useMemo(() => {
    if (records.length === 0) return { present: 0, absent: 0, late: 0, total: 0, rate: 0 };
    const present = records.filter((r: any) => r.status === 'present').length;
    const absent = records.filter((r: any) => r.status === 'absent').length;
    const late = records.filter((r: any) => r.status === 'late').length;
    const total = records.length;
    const rate = Math.round(((present + late) / total) * 100);
    return { present, absent, late, total, rate };
  }, [records]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'present': return { color: '#10B981', bg: '#DCFCE7', icon: CheckCircle2 };
      case 'absent': return { color: '#EF4444', bg: '#FEE2E2', icon: XCircle };
      case 'late': return { color: '#F59E0B', bg: '#FEF3C7', icon: Clock };
      case 'half_day': return { color: '#6366F1', bg: '#E0E7FF', icon: AlertCircle };
      default: return { color: '#64748B', bg: '#F1F5F9', icon: AlertCircle };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader 
          title="My Attendance" 
          subtitle="View your personal attendance history and trends" 
        />

        {/* Summary Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Attendance Rate</Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{stats.rate}%</Text>
            <View style={styles.progressBg}>
              <View style={[styles.progressBar, { width: `${stats.rate}%`, backgroundColor: theme.colors.primary }]} />
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={[styles.miniStat, { backgroundColor: '#F0FDF4' }]}>
              <Text style={[styles.miniLabel, { color: '#16A34A' }]}>Present</Text>
              <Text style={[styles.miniValue, { color: '#16A34A' }]}>{stats.present}</Text>
            </View>
            <View style={[styles.miniStat, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.miniLabel, { color: '#DC2626' }]}>Absent</Text>
              <Text style={[styles.miniValue, { color: '#DC2626' }]}>{stats.absent}</Text>
            </View>
            <View style={[styles.miniStat, { backgroundColor: '#FFFBEB' }]}>
              <Text style={[styles.miniLabel, { color: '#D97706' }]}>Late</Text>
              <Text style={[styles.miniValue, { color: '#D97706' }]}>{stats.late}</Text>
            </View>
          </View>
        </View>

        {/* Recent History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent History</Text>
          {records.length > 0 ? (
            records.slice(0, 10).map((record: any) => {
              const style = getStatusStyle(record.status);
              const Icon = style.icon;
              return (
                <View key={record.id} style={styles.historyItem}>
                  <View style={[styles.iconBox, { backgroundColor: style.bg }]}>
                    <Icon size={20} color={style.color} {...({} as any)} />
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemDate}>{format(new Date(record.attendance_date), 'EEEE, MMM d, yyyy')}</Text>
                    <Text style={styles.itemStatus}>{record.status.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusTag, { backgroundColor: style.bg }]}>
                    <Text style={[styles.statusTagText, { color: style.color }]}>Confirmed</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <CalendarIcon size={48} color={theme.colors.textMuted} {...({} as any)} />
              <Text style={styles.emptyText}>No attendance records found.</Text>
            </View>
          )}
        </View>

        {records.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Monthly Distribution</Text>
            <PieChart
              data={[
                { name: 'Present', population: stats.present, color: '#10B981', legendFontColor: '#64748B', legendFontSize: 12 },
                { name: 'Absent', population: stats.absent, color: '#EF4444', legendFontColor: '#64748B', legendFontSize: 12 },
                { name: 'Late', population: stats.late, color: '#F59E0B', legendFontColor: '#64748B', legendFontSize: 12 },
              ]}
              width={screenWidth - 48}
              height={180}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 100 },
  statsGrid: { marginBottom: 32 },
  statCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  statLabel: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600', marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: 'bold', marginBottom: 16 },
  progressBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  statRow: { flexDirection: 'row', gap: 12 },
  miniStat: { flex: 1, padding: 16, borderRadius: 20, alignItems: 'center' },
  miniLabel: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  miniValue: { fontSize: 18, fontWeight: 'bold' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: 16 },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  itemDetails: { flex: 1 },
  itemDate: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  itemStatus: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '700', marginTop: 2 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTagText: { fontSize: 10, fontWeight: 'bold' },
  chartSection: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
});
