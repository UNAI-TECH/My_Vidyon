import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    feeDistribution: { name: string; value: number; color: string }[];
}

export function useAccountantDashboard(institutionId?: string) {
    const queryClient = useQueryClient();

    // 1. Total Revenue (YTD) - Sum amount_paid from fee_payments (Source of truth for cash flow)
    const { data: totalRevenue = 0, refetch: refetchRevenue } = useQuery({
        queryKey: ['accountant-revenue', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const { data, error } = await supabase
                .from('fee_payments')
                .select('amount_paid')
                .eq('institution_id', institutionId);
            
            if (error) {
                console.error('Error fetching total revenue:', error);
                return 0;
            }
            return (data as any[] || []).reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
        },
        enabled: !!institutionId,
    });

    // 2. Outstanding Amount - Sum amount_due from student_fees (Source of truth for expected dues)
    const { data: outstandingAmount = 0, refetch: refetchOutstanding } = useQuery({
        queryKey: ['accountant-outstanding', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const { data, error } = await supabase
                .from('student_fees')
                .select('amount_due')
                .eq('institution_id', institutionId);
            
            if (error) {
                console.error('Error fetching outstanding:', error);
                return 0;
            }
            return (data as any[] || []).reduce((acc, curr) => acc + (curr.amount_due || 0), 0);
        },
        enabled: !!institutionId,
    });

    // 3. Fee Distribution Logic
    const { data: feeDistributionRaw = [], refetch: refetchDistribution } = useQuery({
        queryKey: ['accountant-fee-dist', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];
            const { data } = await supabase
                .from('student_fees')
                .select('status, amount_paid, amount_due')
                .eq('institution_id', institutionId);
            return (data || []) as any[];
        },
        enabled: !!institutionId
    });

    const feeDistribution = useMemo(() => {
        let paid = 0;
        let pending = 0;
        let overdue = 0;

        feeDistributionRaw.forEach(f => {
            const p = f.amount_paid || 0;
            const d = f.amount_due || 0;
            if (f.status === 'overdue') overdue++;
            else if (d > p) pending++;
            else if (d > 0) paid++;
        });

        return [
            { name: 'Paid', value: paid, color: '#10B981' },
            { name: 'Pending', value: pending, color: '#F59E0B' },
            { name: 'Overdue', value: overdue, color: '#EF4444' },
        ].filter(i => i.value > 0);
    }, [feeDistributionRaw]);

    // 4. Transaction Count (Based on fee_payments)
    const { data: transactionCount = 0, refetch: refetchTransCount } = useQuery({
        queryKey: ['accountant-transactions-count', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const { count, error } = await supabase
                .from('fee_payments')
                .select('id', { count: 'exact', head: true })
                .eq('institution_id', institutionId);
            
            if (error) {
                console.error('Error fetching transaction count:', error);
                return 0;
            }
            return count || 0;
        },
        enabled: !!institutionId,
    });

    // 5. Recent Payments
    const { data: recentPayments = [], refetch: refetchRecent } = useQuery({
        queryKey: ['accountant-recent-payments', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];
            const { data, error } = await supabase
                .from('fee_payments')
                .select('*, students(name, register_number, class_name)')
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

    // 6. Real-time Subscriptions
    useEffect(() => {
        if (!institutionId) return;

        const channel = supabase.channel(`accountant-dashboard-${institutionId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'fee_payments', 
                filter: `institution_id=eq.${institutionId}` 
            }, () => {
                refetchRevenue();
                refetchTransCount();
                refetchRecent();
            })
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'student_fees', 
                filter: `institution_id=eq.${institutionId}` 
            }, () => {
                refetchRevenue();
                refetchOutstanding();
                refetchDistribution();
                refetchTransCount();
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [institutionId]);

    // 7. Fetch Institution Logo/Name
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

    // 8. Fetch Accountant Profile
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
        stats: {
            totalRevenue,
            outstandingAmount,
            transactionCount,
            recentPayments,
            feeDistribution,
            accountantProfile
        },
        institution,
        isLoading: false,
    };
}
