import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

export interface InstitutionDashboardStats {
    totalStudents: number;
    totalStaff: number;
    attendancePercentage: string;
    totalRevenue: number;
    pendingLeaveRequests: number;
}

export function useInstitutionDashboard(institutionId?: string) {
    // 1. Total Students
    const { data: totalStudents = 0, refetch: refetchStudents } = useQuery({
        queryKey: ['institution-total-students', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const { count } = await supabase
                .from('students')
                .select('id', { count: 'exact', head: true })
                .eq('institution_id', institutionId);
            return count || 0;
        },
        enabled: !!institutionId,
    });

    // 2. Total Staff
    const { data: totalStaff = 0, refetch: refetchStaff } = useQuery({
        queryKey: ['institution-total-staff', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const { count } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('institution_id', institutionId)
                .in('role', ['faculty', 'teacher', 'staff', 'admin', 'accountant', 'canteen']);
            return count || 0;
        },
        enabled: !!institutionId,
    });

    // 3. Today's Attendance
    const { data: attendanceStats = { present: 0, total: 0 }, refetch: refetchAttendance } = useQuery({
        queryKey: ['institution-attendance-today', institutionId],
        queryFn: async () => {
            if (!institutionId) return { present: 0, total: 0 };
            const today = new Date().toISOString().split('T')[0];
            
            const { data: attendance } = await supabase
                .from('student_attendance')
                .select('status')
                .eq('institution_id', institutionId)
                .eq('attendance_date', today);
            
            const present = (attendance as any[])?.filter(a => a.status === 'present').length || 0;
            return {
                present,
                total: (attendance as any[])?.length || 0
            };
        },
        enabled: !!institutionId,
    });

    // 4. Total Revenue (YTD)
    const { data: totalRevenue = 0, refetch: refetchRevenue } = useQuery({
        queryKey: ['institution-revenue', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const { data } = await supabase
                .from('fee_payments')
                .select('amount_paid')
                .eq('institution_id', institutionId);
            
            return (data as any[] || []).reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
        },
        enabled: !!institutionId,
    });

    // 5. Pending Leaves
    const { data: pendingLeaves = 0, refetch: refetchLeaves } = useQuery({
        queryKey: ['institution-pending-leaves', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const { count: studentLeaves } = await supabase
                .from('leave_requests')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending');
            
            const { count: staffLeaves } = await supabase
                .from('staff_leaves')
                .select('id', { count: 'exact', head: true })
                .eq('institution_id', institutionId)
                .eq('status', 'pending');
                
            return (studentLeaves || 0) + (staffLeaves || 0);
        },
        enabled: !!institutionId,
    });

    // 6. Fetch authenticated user's profile
    const { data: profile = null } = useQuery({
        queryKey: ['institution-profile'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
            return data as any;
        },
    });

    // 7. Fetch institution details
    const { data: institution = null } = useQuery({
        queryKey: ['institution-details', institutionId],
        queryFn: async () => {
            if (!institutionId) return null;
            const { data } = await supabase
                .from('institutions')
                .select('*')
                .eq('institution_id', institutionId)
                .maybeSingle();
            return data as any;
        },
        enabled: !!institutionId,
    });

    // 8. Real-time Subscriptions
    useEffect(() => {
        if (!institutionId) return;

        const channel = supabase.channel(`institution-dashboard-${institutionId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `institution_id=eq.${institutionId}` }, () => refetchStudents())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `institution_id=eq.${institutionId}` }, () => refetchStaff())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attendance', filter: `institution_id=eq.${institutionId}` }, () => refetchAttendance())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_payments', filter: `institution_id=eq.${institutionId}` }, () => refetchRevenue())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => refetchLeaves())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_leaves', filter: `institution_id=eq.${institutionId}` }, () => refetchLeaves())
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [institutionId]);

    const stats: InstitutionDashboardStats = {
        totalStudents,
        totalStaff,
        attendancePercentage: attendanceStats.total > 0 
            ? `${Math.round((attendanceStats.present / attendanceStats.total) * 100)}%`
            : 'N/A',
        totalRevenue,
        pendingLeaveRequests: pendingLeaves,
    };

    return {
        stats,
        profile,
        institution,
        isLoading: false,
    };
}
