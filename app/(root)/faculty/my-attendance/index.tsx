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
import { PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

// Helper to expand from_date to to_date (inclusive) safely without UTC shift
const getDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
  try {
    if (!startDateStr) return [];
    if (!endDateStr) endDateStr = startDateStr;
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [ey, em, ed] = endDateStr.split('-').map(Number);
    
    const dates: string[] = [];
    let current = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    
    let count = 0;
    while (current <= end && count < 60) {
      dates.push(format(current, 'yyyy-MM-dd'));
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  } catch (_) {
    return [startDateStr];
  }
};

export default function MyAttendanceScreen() {
  const { user, institutionId } = useAuth();

  // 1. Fetch attendance records for the current user
  const { data: rawAttendance = [], isLoading: isLoadingAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['my-staff-attendance', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', user.id)
        .order('attendance_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 2. Fetch faculty's own leave requests (pending and approved)
  const { data: leaveRequests = [], isLoading: isLoadingLeaves, refetch: refetchLeaves } = useQuery({
    queryKey: ['my-leave-requests-attendance', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('staff_id', user.id)
        .neq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leave requests for attendance:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 3. Realtime subscription to live attendance and leave updates
  React.useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`faculty-my-attendance-live-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_attendance', filter: `staff_id=eq.${user.id}` }, () => {
        refetchAttendance();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests', filter: `staff_id=eq.${user.id}` }, () => {
        refetchLeaves();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  // 4. Merge attendance logs and leave requests (requested leave days count as absent)
  const records = React.useMemo(() => {
    const attendanceMap = new Map<string, any>();

    // Add confirmed attendance entries
    rawAttendance.forEach((rec: any) => {
      attendanceMap.set(rec.attendance_date, {
        ...rec,
        is_leave: false,
      });
    });

    // Overlay leave requested days (mark as absent)
    leaveRequests.forEach((leave: any) => {
      const dates = getDatesInRange(leave.from_date, leave.to_date);
      dates.forEach((dateStr) => {
        const existing = attendanceMap.get(dateStr);
        if (existing) {
          // If already in attendance, update status to absent reflecting leave request
          attendanceMap.set(dateStr, {
            ...existing,
            status: 'absent',
            is_leave: true,
            leave_id: leave.id,
            leave_status: leave.status,
            leave_reason: leave.reason || 'Leave requested',
            leave_type: leave.leave_type || 'Casual/Medical',
          });
        } else {
          // Virtual record for requested leave day
          attendanceMap.set(dateStr, {
            id: `leave-${leave.id}-${dateStr}`,
            staff_id: user?.id,
            attendance_date: dateStr,
            status: 'absent',
            is_leave: true,
            leave_id: leave.id,
            leave_status: leave.status,
            leave_reason: leave.reason || 'Leave requested',
            leave_type: leave.leave_type || 'Casual/Medical',
            created_at: leave.created_at,
          });
        }
      });
    });

    // Return records sorted by attendance_date descending
    return Array.from(attendanceMap.values()).sort(
      (a, b) => new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime()
    );
  }, [rawAttendance, leaveRequests, user?.id]);

  const stats = React.useMemo(() => {
    if (records.length === 0) return { present: 0, absent: 0, late: 0, total: 0, rate: 0 };
    const present = records.filter((r: any) => r.status === 'present').length;
    const absent = records.filter((r: any) => r.status === 'absent').length;
    const late = records.filter((r: any) => r.status === 'late').length;
    const total = records.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { present, absent, late, total, rate };
  }, [records]);

  const getStatusStyle = (status: string, isLeave?: boolean) => {
    if (isLeave) {
      return { color: '#EF4444', bg: '#FEE2E2', icon: XCircle };
    }
    switch (status) {
      case 'present': return { color: '#10B981', bg: '#DCFCE7', icon: CheckCircle2 };
      case 'absent': return { color: '#EF4444', bg: '#FEE2E2', icon: XCircle };
      case 'late': return { color: '#F59E0B', bg: '#FEF3C7', icon: Clock };
      case 'half_day': return { color: '#6366F1', bg: '#E0E7FF', icon: AlertCircle };
      default: return { color: '#64748B', bg: '#F1F5F9', icon: AlertCircle };
    }
  };

  const isLoading = isLoadingAttendance || isLoadingLeaves;

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
            records.slice(0, 15).map((record: any) => {
              const style = getStatusStyle(record.status, record.is_leave);
              const Icon = style.icon;
              const isLeaveApproved = record.leave_status === 'approved';
              return (
                <View key={record.id} style={styles.historyItem}>
                  <View style={[styles.iconBox, { backgroundColor: style.bg }]}>
                    <Icon size={20} color={style.color} {...({} as any)} />
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemDate}>{format(new Date(record.attendance_date), 'EEEE, MMM d, yyyy')}</Text>
                    <Text style={styles.itemStatus}>
                      {record.is_leave ? 'ABSENT (ON LEAVE)' : record.status.toUpperCase()}
                    </Text>
                    {record.is_leave && record.leave_reason ? (
                      <Text style={styles.itemReason} numberOfLines={1}>
                        Reason: {record.leave_reason}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[
                    styles.statusTag, 
                    { backgroundColor: record.is_leave ? (isLeaveApproved ? '#DCFCE7' : '#FEF3C7') : style.bg }
                  ]}>
                    <Text style={[
                      styles.statusTagText, 
                      { color: record.is_leave ? (isLeaveApproved ? '#16A34A' : '#D97706') : style.color }
                    ]}>
                      {record.is_leave ? (isLeaveApproved ? 'Leave Approved' : 'Leave Requested') : 'Confirmed'}
                    </Text>
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
  itemReason: { fontSize: 11, color: '#64748B', marginTop: 2 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTagText: { fontSize: 10, fontWeight: 'bold' },
  chartSection: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
});
