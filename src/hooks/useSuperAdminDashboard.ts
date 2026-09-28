import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { startOfMonth, subMonths, format } from 'date-fns';

export interface SuperAdminDashboardStats {
    totalInstitutions: number;
    totalRevenue: number;
    adRevenue: number;
    adRevenueEarned: number;
    feeRevenue: number;
    activeCampaigns: number;
    totalUsers: number;
    serverHealth: string;
    recentActivity: any[];
    pendingRequests: any[];
    revenueTrend: { labels: string[], data: number[] };
    onboardingTrend: { labels: string[], data: number[] };
    performanceRatios: number[];
}

export function useSuperAdminDashboard() {
    const queryClient = useQueryClient();

    // Real-time subscriptions
    useEffect(() => {
        const channel = supabase
            .channel('superadmin-ops')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'institutions' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['superadmin-institutions'] });
                    queryClient.invalidateQueries({ queryKey: ['superadmin-pending-requests'] });
                    queryClient.invalidateQueries({ queryKey: ['superadmin-onboarding-trend'] });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'fee_payments' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['superadmin-revenue'] });
                    queryClient.invalidateQueries({ queryKey: ['superadmin-revenue-trend'] });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'academic_events' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['superadmin-revenue'] });
                    queryClient.invalidateQueries({ queryKey: ['superadmin-revenue-trend'] });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
                    queryClient.invalidateQueries({ queryKey: ['superadmin-activity'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

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

    // 2. Global Revenue (Student Fees + Ad Sponsor Earnings)
    const { 
        data: revenueData = { totalRevenue: 0, adRevenue: 0, adRevenueEarned: 0, feeRevenue: 0, activeCampaigns: 0 }, 
        isLoading: loadingRev 
    } = useQuery({
        queryKey: ['superadmin-revenue'],
        queryFn: async () => {
            // A. Student Fee Payments
            const { data: fees } = await supabase
                .from('fee_payments')
                .select('amount_paid, amount');
            
            const feeRevenue = (fees as any[] || []).reduce((acc, curr) => 
                acc + (Number(curr.amount_paid) || Number(curr.amount) || 0), 0
            );

            // B. Ad Sponsor Revenue from academic_events
            const { data: ads } = await (supabase
                .from('academic_events') as any)
                .select('paid_amount, amount_debited, remaining_balance')
                .eq('is_admin_added', true);
            
            const adRevenueTotal = (ads as any[] || []).reduce((acc, curr) => 
                acc + (Number(curr.paid_amount) || 0), 0
            );
            const adRevenueEarned = (ads as any[] || []).reduce((acc, curr) => 
                acc + (Number(curr.amount_debited) || 0), 0
            );
            const activeCampaigns = (ads as any[] || []).filter(a => 
                (Number(a.remaining_balance) > 0 || Number(a.paid_amount) > 0)
            ).length;

            const totalRevenue = feeRevenue + adRevenueTotal;

            return {
                totalRevenue,
                feeRevenue,
                adRevenue: adRevenueTotal,
                adRevenueEarned,
                activeCampaigns
            };
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

    // 4. Revenue Trend (Last 6 Months)
    const { data: revenueTrend = { labels: [], data: [] }, isLoading: loadingRevTrend } = useQuery({
        queryKey: ['superadmin-revenue-trend'],
        queryFn: async () => {
            const months = Array.from({ length: 6 }).map((_, i) => subMonths(startOfMonth(new Date()), i)).reverse();
            const labels = months.map(m => format(m, 'MMM'));
            
            const startDate = months[0].toISOString();
            interface RevenueRecord { amount: number; created_at: string; }
            const { data } = await supabase
                .from('fee_payments')
                .select('amount, created_at')
                .gte('created_at', startDate);
            
            const typedData = (data as unknown as RevenueRecord[]) || [];
            
            const monthlyData = months.map(m => {
                const mStr = format(m, 'yyyy-MM');
                return typedData
                    .filter(p => format(new Date(p.created_at), 'yyyy-MM') === mStr)
                    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            });

            return { labels, data: monthlyData };
        }
    });

    // 5. Onboarding Trend (Last 4 Months)
    const { data: onboardingTrend = { labels: [], data: [] }, isLoading: loadingOnboardingTrend } = useQuery({
        queryKey: ['superadmin-onboarding-trend'],
        queryFn: async () => {
            const months = Array.from({ length: 4 }).map((_, i) => subMonths(startOfMonth(new Date()), i)).reverse();
            const labels = months.map(m => format(m, 'MMM'));
            
            const startDate = months[0].toISOString();
            interface InstitutionRecord { created_at: string; }
            const { data } = await supabase
                .from('institutions')
                .select('created_at')
                .gte('created_at', startDate);
            
            const typedData = (data as unknown as InstitutionRecord[]) || [];
            
            const monthlyData = months.map(m => {
                const mStr = format(m, 'yyyy-MM');
                return typedData
                    .filter(i => format(new Date(i.created_at), 'yyyy-MM') === mStr)
                    .length;
            });

            return { labels, data: monthlyData };
        }
    });

    // 6. Recent Activity
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

    // 7. Pending Requests
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

    // 8. Fetch authenticated user's profile
    const { data: profile = null } = useQuery({
        queryKey: ['superadmin-profile'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, image_url')
                .eq('id', user.id)
                .maybeSingle();
            
            if (error) {
                console.error('Error fetching superadmin profile:', error);
                return null;
            }
            return data as unknown as { full_name: string; image_url: string | null };
        },
    });

    // Calculate Ratios for ProgressChart (Current vs Target)
    const instTarget = 10; // Target 50 institutions
    const revTarget = 1000000;  // Target 1M revenue
    const userTarget = 1000; // Target 1000 users

    const performanceRatios = [
        Math.min(totalInstitutions / instTarget, 1),
        Math.min(revenueData.totalRevenue / revTarget, 1),
        Math.min(totalUsers / userTarget, 1)
    ];

    const stats: SuperAdminDashboardStats = {
        totalInstitutions,
        totalRevenue: revenueData.totalRevenue,
        adRevenue: revenueData.adRevenue,
        adRevenueEarned: revenueData.adRevenueEarned,
        feeRevenue: revenueData.feeRevenue,
        activeCampaigns: revenueData.activeCampaigns,
        totalUsers,
        serverHealth: '99.99%',
        recentActivity,
        pendingRequests,
        revenueTrend,
        onboardingTrend,
        performanceRatios
    };

    return {
        stats,
        profile,
        isLoading: loadingInst || loadingRev || loadingUsers || loadingActivity || loadingPending || loadingRevTrend || loadingOnboardingTrend,
    };
}
