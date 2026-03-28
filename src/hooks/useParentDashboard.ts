import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Student = Database['public']['Tables']['students']['Row'];

export interface ParentDashboardData {
    children: (Student & { name: string; attendance: string; grade: string; roll_no?: string; image_url?: string | null })[];
    pendingFees: number;
    totalPaid: number;
    paymentHistory: any[]; // History of completed payments
    institution: Database['public']['Tables']['institutions']['Row'] | null;
    parentProfile: { full_name: string; image_url: string | null } | null;
}

export function useParentDashboard(parentId?: string): ParentDashboardData & { isLoading: boolean } {
    // 1. Fetch Linked Children
    const { data: children = [], isLoading, refetch: refetchChildren } = useQuery({
        queryKey: ['parent-children', parentId],
        queryFn: async () => {
            if (!parentId) return [];
            
            const { data: linkedStudents, error: studentError } = await supabase
                .from('students')
                .select('*, profiles!students_profile_id_fkey (full_name, image_url)')
                .eq('parent_id', parentId);
            
            console.log('Linked Students found:', linkedStudents?.length || 0);
            if (studentError) console.error('Linked Students Error:', studentError);

            if (studentError || !linkedStudents || linkedStudents.length === 0) return [];
            const studentIds = (linkedStudents as any[]).map(s => s.id);

            const { data: allAtt } = await supabase
                .from('student_attendance')
                .select('student_id, status')
                .in('student_id', studentIds);
            
            const { data: allGrd } = await supabase
                .from('grades')
                .select('student_id, grade, created_at')
                .in('student_id', studentIds)
                .order('created_at', { ascending: false });

            return (linkedStudents as any[]).map((s: any) => {
                const studentAtt = (allAtt as any[] || []).filter(a => a.student_id === s.id);
                const studentGrd = (allGrd as any[] || []).find(g => g.student_id === s.id);

                const presentCount = studentAtt.filter(a => a.status === 'present').length;
                const totalAtt = studentAtt.length;
                const attendance = totalAtt > 0 ? `${Math.round((presentCount / totalAtt) * 100)}%` : 'N/A';

                return {
                    ...s,
                    name: s.profiles?.full_name || s.name,
                    image_url: s.image_url || s.profiles?.image_url,
                    attendance,
                    grade: studentGrd?.grade || 'N/A',
                    roll_no: s.register_number,
                    class_name: s.class_name,
                    section: s.section
                };
            });
        },
        enabled: !!parentId,
    });

    // 2. Fetch Aggregated Metrics
    const { data: metrics = { pending: 0, paid: 0 }, refetch: refetchMetrics } = useQuery({
        queryKey: ['parent-fee-metrics', parentId, children.map(c => c.id).join(',')],
        queryFn: async () => {
            if (!parentId || children.length === 0) return { pending: 0, paid: 0 };
            const studentIds = children.map(c => c.id);

            // Fetch from student_fees (current status)
            const { data: fees } = await supabase
                .from('student_fees')
                .select('amount_due, amount_paid')
                .in('student_id', studentIds);
            
            // Fetch from fee_payments (historical logs)
            const { data: payments } = await supabase
                .from('fee_payments')
                .select('amount_paid')
                .in('student_id', studentIds);

            const pending = (fees as any[] || []).reduce((acc, curr) => acc + (curr.amount_due || 0), 0);
            const paidByFees = (fees as any[] || []).reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
            const paidByHistory = (payments as any[] || []).reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);

            return {
                pending,
                paid: Math.max(paidByFees, paidByHistory) // Robustness against missing history logs
            };
        },
        enabled: !!parentId && children.length > 0,
    });

    // 4. Fetch Institution Data
    const { data: institution = null, refetch: refetchInstitution } = useQuery({
        queryKey: ['parent-institution', parentId],
        queryFn: async () => {
            if (!parentId) return null;
            const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', parentId).maybeSingle();
            if (!profile || !(profile as any).institution_id) return null;
            const { data: inst } = await supabase.from('institutions').select('*').eq('institution_id', (profile as any).institution_id).maybeSingle();
            return inst;
        },
        enabled: !!parentId,
    });

    // 5. Fetch Payment History
    const { data: paymentHistory = [], refetch: refetchHistory } = useQuery({
        queryKey: ['parent-payment-history', parentId, children.map(c => c.id).join(',')],
        queryFn: async () => {
            if (!parentId || children.length === 0) return [];
            const studentIds = children.map(c => c.id);
            console.log('Fetching Payment History for Student IDs:', studentIds);
            const { data, error } = await supabase
                .from('fee_payments')
                .select('*, fee_structures(name, description)')
                .in('student_id', studentIds)
                .order('payment_date', { ascending: false });
            
            if (error) console.error('Payment History Fetch Error:', error);
            console.log('Fetched Payments:', data?.length || 0);
            return data || [];
        },
        enabled: !!parentId && children.length > 0,
    });

    // 6. Fetch Parent Profile
    const { data: parentProfile = null } = useQuery({
        queryKey: ['parent-profile', parentId],
        queryFn: async () => {
            if (!parentId) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, image_url')
                .eq('id', parentId)
                .maybeSingle();
            
            if (error) {
                console.error('Error fetching parent profile:', error);
                return null;
            }
            return data as unknown as { full_name: string; image_url: string | null };
        },
        enabled: !!parentId,
    });

    // 7. Real-time Subscriptions
    useEffect(() => {
        if (!parentId) return;

        const channel = supabase.channel(`parent-dashboard-${parentId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `parent_id=eq.${parentId}` }, () => refetchChildren())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attendance' }, () => refetchChildren())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'grades' }, () => refetchChildren())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_fees' }, () => { refetchMetrics(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_payments' }, () => { refetchHistory(); refetchMetrics(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, () => { refetchInstitution(); })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [parentId]);

    return {
        children,
        pendingFees: metrics.pending,
        totalPaid: metrics.paid,
        paymentHistory,
        institution,
        parentProfile,
        isLoading,
    };
}
