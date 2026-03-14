import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

export interface SuperAdminDashboardStats {
    totalInstitutions: number;
    totalRevenue: number;
    totalUsers: number;
    serverHealth: string;
    recentActivity: any[];
    pendingRequests: any[];
}

export function useSuperAdminDashboard() {
    // 1. Total Institutions
    const { data: totalInstitutions = 0, isLoading: loadingInst } = useQuery({
        queryKey: ['superadmin-institutions'],
        queryFn: async () => {
            const { count } = await supabase
                .from('institutions')
                .select('id', { count: 'exact', head: true });
            return count || 0;
        },
    });

    // 2. Global Revenue
    const { data: totalRevenue = 0, isLoading: loadingRev } = useQuery({
        queryKey: ['superadmin-revenue'],
        queryFn: async () => {
            const { data } = await supabase
                .from('fee_payments')
                .select('amount_paid');
            
            return (data as any[] || []).reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
        },
    });

    // 3. Total Users
    const { data: totalUsers = 0, isLoading: loadingUsers } = useQuery({
        queryKey: ['superadmin-users'],
        queryFn: async () => {
            const { count } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true });
            return count || 0;
        },
    });

    // 4. Recent Activity (Latest Profiles)
    const { data: recentActivity = [], isLoading: loadingActivity } = useQuery({
        queryKey: ['superadmin-activity'],
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*, institutions(name)')
                .order('created_at', { ascending: false })
                .limit(5);
            return data || [];
        },
    });

    // 5. Pending Requests
    const { data: pendingRequests = [], isLoading: loadingPending } = useQuery({
        queryKey: ['superadmin-pending-requests'],
        queryFn: async () => {
            const { data } = await supabase
                .from('institutions')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            return data || [];
        },
    });

    const stats: SuperAdminDashboardStats = {
        totalInstitutions,
        totalRevenue,
        totalUsers,
        serverHealth: '99.99%',
        recentActivity,
        pendingRequests,
    };

    return {
        stats,
        isLoading: loadingInst || loadingRev || loadingUsers || loadingActivity || loadingPending,
    };
}
