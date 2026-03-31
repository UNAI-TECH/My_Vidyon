import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { format, subDays } from 'date-fns';
import { useEffect } from 'react';

export function useInstitutionAnalytics(institutionId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!institutionId) return;

    const channel = supabase.channel(`inst-analytics-${institutionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `institution_id=eq.${institutionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['institution-analytics', institutionId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `institution_id=eq.${institutionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['institution-analytics', institutionId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes', filter: `institution_id=eq.${institutionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['institution-analytics', institutionId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attendance', filter: `institution_id=eq.${institutionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['institution-analytics', institutionId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_fees', filter: `institution_id=eq.${institutionId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['institution-analytics', institutionId] });
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [institutionId, queryClient]);

  return useQuery({
    queryKey: ['institution-analytics', institutionId],
    queryFn: async () => {
      if (!institutionId) return null;

      // 1. Basic Counts
      const { data: groups } = await supabase.from('groups').select('id').eq('institution_id', institutionId);
      const groupIds = (groups || []).map(g => (g as any).id);

      const [
        { count: studentCount },
        { count: staffCount },
        { count: classCount }
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('institution_id', institutionId),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('role', 'faculty'),
        groupIds.length > 0 
          ? supabase.from('classes').select('*', { count: 'exact', head: true }).in('group_id', groupIds)
          : supabase.from('classes').select('*', { count: 'exact', head: true }).eq('institution_id', institutionId)
      ]);

      // 2. Fee Stats
      const { data: feesData } = await supabase
        .from('student_fees')
        .select('amount_paid, amount_due, status')
        .eq('institution_id', institutionId);

      const typedFees = (feesData || []) as { amount_paid: number; amount_due: number; status: string }[];

      const totalRevenue = typedFees.reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0) || 0;
      const totalDue = typedFees.reduce((sum, f) => sum + (Number(f.amount_due) || 0), 0) || 0;
      
      const feeStatusDistribution = [
        { name: 'Paid', value: typedFees.filter(f => f.status === 'paid').length || 0 },
        { name: 'Pending', value: typedFees.filter(f => f.status === 'pending' || !f.status).length || 0 },
        { name: 'Overdue', value: typedFees.filter(f => f.status === 'overdue').length || 0 }
      ];

      // 3. Attendance Trend (Last 7 days)
      const last7Days = Array.from({ length: 7 }).map((_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
      const { data: attendanceData } = await supabase
        .from('student_attendance')
        .select('attendance_date, status')
        .eq('institution_id', institutionId)
        .gte('attendance_date', last7Days[0]);

      const typedAttendance = (attendanceData || []) as { attendance_date: string; status: string }[];

      const attendanceTrend = last7Days.map(date => {
        const dayRecords = typedAttendance.filter(r => r.attendance_date === date) || [];
        const presentCount = dayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
        const percentage = dayRecords.length > 0 ? (presentCount / dayRecords.length) * 100 : 0;
        return {
          date: format(new Date(date), 'MMM dd'),
          percentage: Math.round(percentage)
        };
      });

      return {
        counts: {
          students: studentCount || 0,
          staff: staffCount || 0,
          classes: classCount || 0
        },
        fees: {
          totalRevenue,
          totalDue,
          collectionRate: totalDue > 0 ? Math.round((totalRevenue / totalDue) * 100) : 0,
          distribution: feeStatusDistribution
        },
        attendance: {
          overallPercentage: attendanceTrend.length > 0 ? Math.round(attendanceTrend.reduce((sum, d) => sum + d.percentage, 0) / attendanceTrend.length) : 0,
          trend: attendanceTrend
        }
      };
    },
    enabled: !!institutionId,
  });
}
