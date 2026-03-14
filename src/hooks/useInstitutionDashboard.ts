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
    const { data: totalStudents = 0 } = useQuery({
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
    const { data: totalStaff = 0 } = useQuery({
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
    const { data: attendanceStats = { present: 0, total: 0 } } = useQuery({
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
    const { data: totalRevenue = 0 } = useQuery({
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
    const { data: pendingLeaves = 0 } = useQuery({
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
        isLoading: false,
    };
}
