import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type FeePayment = Database['public']['Tables']['fee_payments']['Row'] & {
    students: { name: string } | null;
};

export interface AccountantDashboardStats {
    totalRevenue: number;
    outstandingAmount: number;
    transactionCount: number;
    recentPayments: FeePayment[];
    accountantProfile: { full_name: string; image_url: string | null } | null;
}

export function useAccountantDashboard(institutionId?: string) {
    // 1. Total Revenue (YTD)
    const { data: totalRevenue = 0 } = useQuery({
        queryKey: ['accountant-revenue', institutionId],
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

    // 2. Outstanding Amount
    const { data: outstandingAmount = 0 } = useQuery({
        queryKey: ['accountant-outstanding', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const { data } = await supabase
                .from('student_fees')
                .select('amount_due')
                .eq('institution_id', institutionId);
            
            return (data as any[] || []).reduce((acc, curr) => acc + (curr.amount_due || 0), 0);
        },
        enabled: !!institutionId,
    });

    // 3. Transaction Count
    const { data: transactionCount = 0 } = useQuery({
        queryKey: ['accountant-transactions-count', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const { count } = await supabase
                .from('fee_payments')
                .select('id', { count: 'exact', head: true })
                .eq('institution_id', institutionId);
            return count || 0;
        },
        enabled: !!institutionId,
    });

    // 4. Recent Payments
    const { data: recentPayments = [] } = useQuery({
        queryKey: ['accountant-recent-payments', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];
            const { data, error } = await supabase
                .from('fee_payments')
                .select('*, students(name)')
                .eq('institution_id', institutionId)
                .order('payment_date', { ascending: false })
                .limit(5);
            
            if (error) {
                console.error('Error fetching recent payments:', error);
                return [];
            }
            return data as unknown as FeePayment[];
        },
        enabled: !!institutionId,
    });

    const stats = {
        totalRevenue,
        outstandingAmount,
        transactionCount,
        recentPayments,
    };

    // 5. Fetch Institution Logo/Name
    const { data: institution = null } = useQuery({
        queryKey: ['accountant-institution', institutionId],
        queryFn: async () => {
            if (!institutionId) return null;
            const { data } = await supabase
                .from('institutions')
                .select('name, logo_url')
                .eq('institution_id', institutionId)
                .maybeSingle();
            return data as any;
        },
        enabled: !!institutionId,
    });

    // 6. Fetch Accountant Profile
    const { data: accountantProfile = null } = useQuery({
        queryKey: ['accountant-profile', institutionId],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await supabase
                .from('profiles')
                .select('full_name, image_url')
                .eq('id', user.id)
                .maybeSingle();
            return data as any;
        },
    });

    return {
        stats: { ...stats, accountantProfile },
        institution,
        isLoading: false,
    };
}
