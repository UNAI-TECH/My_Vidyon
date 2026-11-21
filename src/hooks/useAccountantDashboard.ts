import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type FeePayment = Database['public']['Tables']['fee_payments']['Row'] & {
    students: { name: string; register_number?: string; class_name?: string; section?: string } | null;
};

export interface DailyCollectionTrend {
    date: string;
    day: string;
    amount: number;
}

export interface AccountantDashboardStats {
    totalRevenue: number;
    outstandingAmount: number;
    transactionCount: number;
    recentPayments: FeePayment[];
    weeklyTrend: DailyCollectionTrend[];
    accountantProfile: { full_name: string; image_url: string | null } | null;
    feeDistribution: { name: string; value: number; color: string; count: number }[];
}

export function useAccountantDashboard(institutionId?: string) {
    const queryClient = useQueryClient();

    // 1. Total Revenue (YTD) - Sum amount_paid or amount from fee_payments
    const { data: totalRevenue = 0, refetch: refetchRevenue, isLoading: isRevLoading } = useQuery({
        queryKey: ['accountant-revenue', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const { data, error } = await supabase
                .from('fee_payments')
                .select('amount_paid, amount')
                .eq('institution_id', institutionId);
            
            if (error) {
                console.error('Error fetching total revenue:', error);
                return 0;
            }
            return (data as any[] || []).reduce((acc, curr) => acc + Number(curr.amount_paid || curr.amount || 0), 0);
        },
        enabled: !!institutionId,
    });

    // 2. Outstanding Amount - Net balance due across student_fees
    const { data: outstandingAmount = 0, refetch: refetchOutstanding, isLoading: isOutLoading } = useQuery({
        queryKey: ['accountant-outstanding', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const { data, error } = await supabase
                .from('student_fees')
                .select('amount_due, amount_paid, concession_amount')
                .eq('institution_id', institutionId);
            
            if (error) {
                console.error('Error fetching outstanding:', error);
                return 0;
            }
            return (data as any[] || []).reduce((acc, curr) => {
                const bal = Math.max(0, Number(curr.amount_due || 0) - Number(curr.amount_paid || 0) - Number(curr.concession_amount || 0));
                return acc + bal;
            }, 0);
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
                .select('status, amount_paid, amount_due, concession_amount')
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
            const p = Number(f.amount_paid || 0);
            const d = Number(f.amount_due || 0);
            const c = Number(f.concession_amount || 0);
            const bal = Math.max(0, d - p - c);

            if (f.status === 'overdue') {
                overdue++;
            } else if (bal <= 0 && (p > 0 || d > 0)) {
                paid++;
            } else {
                pending++;
            }
        });

        return [
            { name: 'Paid', value: paid, color: '#10B981', count: paid },
            { name: 'Pending / Partial', value: pending, color: '#F59E0B', count: pending },
            { name: 'Overdue', value: overdue, color: '#EF4444', count: overdue },
        ];
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

    // 5. Weekly Revenue Collections Trend (Last 7 Days)
    const { data: weeklyTrend = [], refetch: refetchTrend } = useQuery({
        queryKey: ['accountant-weekly-trend', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];
            const last7Days = Array.from({ length: 7 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d.toISOString().split('T')[0];
            });

            const { data, error } = await supabase
                .from('fee_payments')
                .select('amount_paid, amount, payment_date')
                .eq('institution_id', institutionId)
                .gte('payment_date', `${last7Days[0]}T00:00:00Z`);

            if (error) return [];
            const items = (data || []) as any[];

            return last7Days.map(dateStr => {
                const d = new Date(dateStr);
                const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
                const dayTotal = items
                    .filter(p => p.payment_date && p.payment_date.startsWith(dateStr))
                    .reduce((sum, p) => sum + Number(p.amount_paid || p.amount || 0), 0);
                return {
                    date: dateStr,
                    day: dayName,
                    amount: Math.round(dayTotal),
                };
            });
        },
        enabled: !!institutionId,
    });

    // 6. Recent Payments
    const { data: recentPayments = [], refetch: refetchRecent, isLoading: isRecentLoading } = useQuery({
        queryKey: ['accountant-recent-payments', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];
            const { data, error } = await supabase
                .from('fee_payments')
                .select('*, students(name, register_number, class_name, section)')
                .eq('institution_id', institutionId)
                .order('payment_date', { ascending: false })
                .limit(5);
            
            if (error) {
                console.error('Error fetching recent payments:', error);
                return [];
            }
            return (data || []).map((p: any) => ({
                ...p,
                amount_paid: Number(p.amount_paid ?? p.amount ?? 0),
            })) as unknown as FeePayment[];
        },
        enabled: !!institutionId,
    });

    // 7. Real-time Subscriptions
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
                refetchTrend();
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

    // 8. Fetch Institution Logo/Name
    const { data: institution = null } = useQuery({
        queryKey: ['accountant-institution', institutionId],
        queryFn: async () => {
            if (!institutionId) return null;
            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            let query = supabase.from('institutions').select('name, logo_url');
            if (isUUID(institutionId)) {
                query = query.eq('id', institutionId);
            } else {
                query = query.ilike('institution_id', institutionId);
            }
            const { data } = await (query as any).maybeSingle();
            return data as any;
        },
        enabled: !!institutionId,
    });

    // 9. Fetch Accountant Profile
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
            weeklyTrend,
            feeDistribution,
            accountantProfile
        },
        institution,
        isLoading: isRevLoading || isOutLoading,
    };
}
