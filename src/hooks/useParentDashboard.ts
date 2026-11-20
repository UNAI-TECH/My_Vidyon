import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Student = Database['public']['Tables']['students']['Row'];

export interface UpcomingFeeItem {
    id: string;
    studentId: string;
    studentName: string;
    termName: string;
    feeName: string;
    dueDate?: string | null;
    invoicedAmount: number;
    concessionAmount: number;
    paidAmount: number;
    remainingDue: number;
    status: 'pending' | 'partial' | 'paid';
    isOverdue: boolean;
}

export interface ParentDashboardData {
    children: (Student & { name: string; attendance: string; grade: string; roll_no?: string; image_url?: string | null })[];
    pendingFees: number;
    totalPaid: number;
    totalDue: number;
    totalConcessions: number;
    upcomingFees: UpcomingFeeItem[];
    nextDueFee: UpcomingFeeItem | null;
    paymentHistory: any[]; // History of completed payments
    institution: Database['public']['Tables']['institutions']['Row'] | null;
    parentProfile: { full_name: string; image_url: string | null } | null;
}

export function useParentDashboard(parentId?: string, parentEmail?: string): ParentDashboardData & { isLoading: boolean } {
    // 1. Fetch Linked Children (combines parent_student_links + direct parent_id + email fallback)
    const { data: children = [], isLoading: isChildrenLoading, refetch: refetchChildren } = useQuery({
        queryKey: ['parent-children-v2', parentId, parentEmail],
        queryFn: async () => {
            if (!parentId) return [];
            
            try {
                // Method A: parent_student_links table
                const { data: links, error: linkErr } = await (supabase as any)
                    .from('parent_student_links')
                    .select(`
                        id,
                        student_id,
                        relationship_type,
                        students (
                            id,
                            name,
                            class_name,
                            section,
                            image_url,
                            register_number,
                            institution_id,
                            dob,
                            gender,
                            parent_id
                        )
                    `)
                    .eq('parent_profile_id', parentId);

                if (linkErr) {
                    console.warn('[useParentDashboard] parent_student_links query:', linkErr.message);
                }

                // Method B: direct students where parent_id = parentId
                const { data: directStudents, error: directErr } = await (supabase as any)
                    .from('students')
                    .select('id, name, class_name, section, image_url, register_number, institution_id, dob, gender, parent_id')
                    .eq('parent_id', parentId);

                if (directErr) {
                    console.warn('[useParentDashboard] direct students query:', directErr.message);
                }

                // Method C: fallback by parent email
                let emailStudents: any[] = [];
                const effectiveEmail = parentEmail?.trim();
                if (effectiveEmail) {
                    const { data: byEmail, error: emailErr } = await (supabase as any)
                        .from('students')
                        .select('id, name, class_name, section, image_url, register_number, institution_id, dob, gender, parent_id')
                        .eq('parent_email', effectiveEmail);
                    if (!emailErr && Array.isArray(byEmail)) {
                        emailStudents = byEmail;
                    }
                }

                // Deduplicate across all link sources
                const studentMap = new Map<string, any>();

                if (Array.isArray(links)) {
                    links.forEach((l: any) => {
                        if (l?.students && l.students.id) {
                            studentMap.set(l.students.id, l.students);
                        }
                    });
                }

                if (Array.isArray(directStudents)) {
                    directStudents.forEach((s: any) => {
                        if (s?.id && !studentMap.has(s.id)) {
                            studentMap.set(s.id, s);
                        }
                    });
                }

                if (Array.isArray(emailStudents)) {
                    emailStudents.forEach((s: any) => {
                        if (s?.id && !studentMap.has(s.id)) {
                            studentMap.set(s.id, s);
                        }
                    });
                }

                const mergedStudents = Array.from(studentMap.values());
                if (mergedStudents.length === 0) return [];

                const studentIds = mergedStudents.map((s) => s.id);

                // Fetch attendance metrics
                const { data: allAtt } = await supabase
                    .from('student_attendance')
                    .select('student_id, status')
                    .in('student_id', studentIds);

                // Fetch latest published exam result
                const { data: allRes } = await supabase
                    .from('exam_results')
                    .select('student_id, total_marks, status, created_at')
                    .in('student_id', studentIds)
                    .eq('status', 'PUBLISHED')
                    .order('created_at', { ascending: false });

                return mergedStudents.map((s: any) => {
                    const studentAtt = (allAtt as any[] || []).filter((a) => a.student_id === s.id);
                    const studentRes = (allRes as any[] || []).find((g) => g.student_id === s.id);

                    const presentCount = studentAtt.filter((a) => a.status === 'present').length;
                    const totalAtt = studentAtt.length;
                    const attendance = totalAtt > 0 ? `${Math.round((presentCount / totalAtt) * 100)}%` : 'N/A';

                    return {
                        ...s,
                        name: s.name || 'Student',
                        image_url: s.image_url || null,
                        attendance,
                        grade: studentRes ? `${studentRes.total_marks}` : 'N/A',
                        roll_no: s.register_number || s.roll_number || 'N/A',
                        register_number: s.register_number || s.roll_number || 'N/A',
                        class_name: s.class_name || '',
                        section: s.section || '',
                    };
                });
            } catch (err: any) {
                console.warn('[useParentDashboard] Error loading children:', err);
                return [];
            }
        },
        enabled: !!parentId,
    });

    // 2. Fetch Aggregated Metrics & Upcoming Fees
    const { data: feeInfo = {
        pendingFees: 0,
        totalPaid: 0,
        totalDue: 0,
        totalConcessions: 0,
        upcomingFees: [] as UpcomingFeeItem[],
        nextDueFee: null as UpcomingFeeItem | null,
    }, refetch: refetchMetrics } = useQuery({
        queryKey: ['parent-fee-metrics-detailed', parentId, children.map((c) => c.id).join(',')],
        queryFn: async () => {
            if (!parentId || children.length === 0) {
                return {
                    pendingFees: 0,
                    totalPaid: 0,
                    totalDue: 0,
                    totalConcessions: 0,
                    upcomingFees: [] as UpcomingFeeItem[],
                    nextDueFee: null as UpcomingFeeItem | null,
                };
            }
            const studentIds = children.map((c) => c.id);

            try {
                // Fetch student_fees with attached structures and concessions
                const { data: fees, error: feeErr } = await (supabase as any)
                    .from('student_fees')
                    .select(`
                        *,
                        fee_structures(id, name, category, term_id, description),
                        concessions:fee_concessions(id, concession_type, amount, percentage)
                    `)
                    .in('student_id', studentIds)
                    .order('due_date', { ascending: true });

                if (feeErr) console.warn('[useParentDashboard] student_fees query:', feeErr);

                // Fetch terms lookup map
                const { data: termsData } = await (supabase as any)
                    .from('academic_terms')
                    .select('id, term_name, academic_year');

                const termMap = new Map<string, string>();
                (termsData || []).forEach((t: any) => termMap.set(t.id, t.term_name));

                // Student name lookup map
                const childNameMap = new Map<string, string>();
                children.forEach((c) => childNameMap.set(c.id, c.name));

                let totalPending = 0;
                let totalPaid = 0;
                let totalDue = 0;
                let totalConcessions = 0;
                const upcomingList: UpcomingFeeItem[] = [];

                const now = new Date();

                (fees || []).forEach((f: any) => {
                    const due = Number(f.amount_due || 0);
                    const paid = Number(f.amount_paid || 0);
                    const conc = Number(f.concession_amount || 0);
                    const bal = f.balance !== undefined
                        ? Number(f.balance)
                        : Math.max(0, due - paid - conc);

                    totalDue += due;
                    totalPaid += paid;
                    totalConcessions += conc;

                    const effectiveTermId = f.term_id || f.fee_structures?.term_id || null;
                    const termName = effectiveTermId
                        ? termMap.get(effectiveTermId) || 'Term Fee'
                        : 'Academic Year';
                    const feeName = f.fee_structures?.name || 'Tuition Fee';
                    const isOverdue = bal > 0 && f.due_date ? new Date(f.due_date) < now : false;
                    const status = bal <= 0 ? 'paid' : paid > 0 ? 'partial' : 'pending';

                    if (bal > 0) {
                        totalPending += bal;
                        upcomingList.push({
                            id: f.id,
                            studentId: f.student_id,
                            studentName: childNameMap.get(f.student_id) || 'Child',
                            termName,
                            feeName,
                            dueDate: f.due_date || null,
                            invoicedAmount: due,
                            concessionAmount: conc,
                            paidAmount: paid,
                            remainingDue: bal,
                            status,
                            isOverdue,
                        });
                    }
                });

                // Sort upcoming fees: overdue first, then by earliest due date
                upcomingList.sort((a, b) => {
                    if (a.isOverdue && !b.isOverdue) return -1;
                    if (!a.isOverdue && b.isOverdue) return 1;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                });

                // Fetch payments history for accurate total paid verification
                const { data: payments } = await (supabase as any)
                    .from('fee_payments')
                    .select('amount_paid')
                    .in('student_id', studentIds);

                const paidByHistory = (payments || []).reduce(
                    (acc: number, curr: any) => acc + Number(curr.amount_paid || 0),
                    0
                );

                return {
                    pendingFees: totalPending,
                    totalPaid: Math.max(totalPaid, paidByHistory),
                    totalDue,
                    totalConcessions,
                    upcomingFees: upcomingList,
                    nextDueFee: upcomingList.length > 0 ? upcomingList[0] : null,
                };
            } catch (err: any) {
                console.warn('[useParentDashboard] Error calculating fee metrics:', err);
                return {
                    pendingFees: 0,
                    totalPaid: 0,
                    totalDue: 0,
                    totalConcessions: 0,
                    upcomingFees: [] as UpcomingFeeItem[],
                    nextDueFee: null as UpcomingFeeItem | null,
                };
            }
        },
        enabled: !!parentId && children.length > 0,
    });

    // 3. Fetch Institution Data
    const { data: institution = null, refetch: refetchInstitution } = useQuery({
        queryKey: ['parent-institution', parentId],
        queryFn: async () => {
            if (!parentId) return null;
            const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', parentId).maybeSingle();
            let instId = (profile as any)?.institution_id;
            if (!instId && children.length > 0) {
                instId = (children[0] as any)?.institution_id;
            }
            if (!instId) return null;

            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            let query = supabase.from('institutions').select('*');
            if (isUUID(instId)) {
                query = query.eq('id', instId);
            } else {
                query = query.ilike('institution_id', instId);
            }
            const { data: inst } = await (query as any).maybeSingle();
            return inst;
        },
        enabled: !!parentId,
    });

    // 4. Fetch Payment History
    const { data: paymentHistory = [], refetch: refetchHistory } = useQuery({
        queryKey: ['parent-payment-history', parentId, children.map((c) => c.id).join(',')],
        queryFn: async () => {
            if (!parentId || children.length === 0) return [];
            const studentIds = children.map((c) => c.id);
            const { data, error } = await supabase
                .from('fee_payments')
                .select('*, fee_structures(name, description)')
                .in('student_id', studentIds)
                .order('payment_date', { ascending: false });
            
            if (error) console.error('Payment History Fetch Error:', error);
            return data || [];
        },
        enabled: !!parentId && children.length > 0,
    });

    // 5. Fetch Parent Profile
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

    // 6. Real-time Subscriptions
    useEffect(() => {
        if (!parentId) return;

        const channel = supabase.channel(`parent-dashboard-${parentId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'parent_student_links', filter: `parent_profile_id=eq.${parentId}` }, () => refetchChildren())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `parent_id=eq.${parentId}` }, () => refetchChildren())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attendance' }, () => refetchChildren())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_results' }, () => refetchChildren())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_fees' }, () => { refetchMetrics(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_concessions' }, () => { refetchMetrics(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_payments' }, () => { refetchHistory(); refetchMetrics(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'institutions' }, () => { refetchInstitution(); })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [parentId]);

    return {
        children,
        pendingFees: feeInfo.pendingFees,
        totalPaid: feeInfo.totalPaid,
        totalDue: feeInfo.totalDue,
        totalConcessions: feeInfo.totalConcessions,
        upcomingFees: feeInfo.upcomingFees,
        nextDueFee: feeInfo.nextDueFee,
        paymentHistory,
        institution,
        parentProfile,
        isLoading: isChildrenLoading,
    };
}
