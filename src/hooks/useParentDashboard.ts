import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Student = Database['public']['Tables']['students']['Row'];

export interface ParentDashboardData {
    children: (Student & { attendance: string; grade: string })[];
    pendingFees: number;
}

export function useParentDashboard(parentId?: string) {
    // 1. Fetch Linked Children
    const { data: children = [], isLoading } = useQuery({
        queryKey: ['parent-children', parentId],
        queryFn: async () => {
            if (!parentId) return [];
            
            // Get relations
            const { data: relations, error: relError } = await supabase
                .from('parent_student_relations')
                .select('student_id')
                .eq('parent_id', parentId);
            
            if (relError || !relations || relations.length === 0) return [];
            
            const studentIds = (relations as any[]).map(r => r.student_id);
            
            // Get student details
            const { data: students, error: stdError } = await supabase
                .from('students')
                .select('*')
                .in('id', studentIds);
            
            if (stdError || !students) return [];

            // For each student, get quick stats (attendance & last grade)
            const childrenWithStats = await Promise.all((students as any[]).map(async (s) => {
                // Attendance
                const { data: att } = await supabase
                    .from('student_attendance')
                    .select('status')
                    .eq('student_id', s.id);
                
                const attPercent = att && att.length > 0
                    ? `${Math.round(((att as any[]).filter(a => a.status === 'present').length / (att as any[]).length) * 100)}%`
                    : 'N/A';
                
                // Grades
                const { data: grd } = await supabase
                    .from('grades')
                    .select('grade_letter')
                    .eq('student_id', s.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                return {
                    ...s,
                    attendance: attPercent,
                    grade: grd?.grade_letter || 'N/A',
                };
            }));

            return childrenWithStats;
        },
        enabled: !!parentId,
    });

    // 2. Fetch Pending Fees for all children
    const { data: pendingFees = 0 } = useQuery({
        queryKey: ['parent-pending-fees', parentId],
        queryFn: async () => {
            if (!parentId) return 0;
            const { data: relations } = await supabase
                .from('parent_student_relations')
                .select('student_id')
                .eq('parent_id', parentId);
            
            if (!relations || relations.length === 0) return 0;
            const studentIds = (relations as any[]).map(r => r.student_id);

            const { data: fees } = await supabase
                .from('student_fees')
                .select('amount_due')
                .in('student_id', studentIds);
            
            return (fees as any[] || []).reduce((acc, curr) => acc + (curr.amount_due || 0), 0);
        },
        enabled: !!parentId,
    });

    return {
        children,
        pendingFees,
        isLoading,
    };
}
