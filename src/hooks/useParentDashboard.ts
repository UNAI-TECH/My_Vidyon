import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Student = Database['public']['Tables']['students']['Row'];

export interface ParentDashboardData {
    children: (Student & { name: string; attendance: string; grade: string })[];
    pendingFees: number;
    institution: Database['public']['Tables']['institutions']['Row'] | null;
    parentProfile: { full_name: string; image_url: string | null } | null;
}

export function useParentDashboard(parentId?: string): ParentDashboardData & { isLoading: boolean } {
    // 1. Fetch Linked Children
    const { data: children = [], isLoading } = useQuery({
        queryKey: ['parent-children', parentId],
        queryFn: async () => {
            if (!parentId) return [];
            
            // Get students linked to this parent (parent_id in students table is the parent's profile ID)
            const { data: linkedStudents, error: studentError } = await supabase
                .from('students')
                .select(`
                    *,
                    profiles!students_profile_id_fkey (full_name)
                `)
                .eq('parent_id', parentId);
            
            if (studentError) {
                console.error('Error fetching linked students:', studentError);
                return [];
            }

            if (!linkedStudents || linkedStudents.length === 0) return [];
            const studentIds = (linkedStudents as any[]).map(s => s.id);

            // 1. Bulk fetch Attendance
            const { data: allAtt } = await supabase
                .from('student_attendance')
                .select('student_id, status')
                .in('student_id', studentIds);
            
            // 2. Bulk fetch Grades
            const { data: allGrd } = await supabase
                .from('grades')
                .select('student_id, grade, created_at')
                .in('student_id', studentIds)
                .order('created_at', { ascending: false });

            const childrenWithStats = (linkedStudents as any[]).map((s: any) => {
                const studentAtt = (allAtt as any[] || []).filter(a => a.student_id === s.id);
                const studentGrd = (allGrd as any[] || []).find(g => g.student_id === s.id);

                const presentCount = studentAtt.filter(a => a.status === 'present').length;
                const totalAtt = studentAtt.length;
                const attendance = totalAtt > 0 ? `${Math.round((presentCount / totalAtt) * 100)}%` : 'N/A';

                return {
                    ...s,
                    name: s.profiles?.full_name || s.name,
                    attendance,
                    grade: studentGrd?.grade || 'N/A'
                };
            });

            return childrenWithStats;
        },
        enabled: !!parentId,
    });

    // 2. Fetch Pending Fees for all children
    const { data: pendingFees = 0 } = useQuery({
        queryKey: ['parent-pending-fees', parentId],
        queryFn: async () => {
            if (!parentId) return 0;
            
            const { data: studentProfiles } = await supabase
                .from('profiles')
                .select('id')
                .eq('parent_id', parentId)
                .eq('role', 'student');
            
            if (!studentProfiles || studentProfiles.length === 0) return 0;
            const studentIds = (studentProfiles as any[]).map(p => p.id);

            const { data: fees } = await supabase
                .from('student_fees')
                .select('amount_due')
                .in('student_id', studentIds);
            
            return (fees as any[] || []).reduce((acc, curr) => acc + (curr.amount_due || 0), 0);
        },
        enabled: !!parentId,
    });

    // 3. Fetch Institution Data (via profile)
    const { data: institution = null } = useQuery({
        queryKey: ['parent-institution', parentId],
        queryFn: async () => {
            if (!parentId) return null;
            
            const { data: profile } = await supabase
                .from('profiles')
                .select('institution_id')
                .eq('id', parentId)
                .maybeSingle();
            
            if (!profile || !(profile as any).institution_id) return null;

            const { data: inst } = await supabase
                .from('institutions')
                .select('*')
                .eq('id', (profile as any).institution_id)
                .maybeSingle();
            
            return inst;
        },
        enabled: !!parentId,
    });

    // 4. Fetch Parent Profile
    const { data: parentProfile = null } = useQuery({
        queryKey: ['parent-profile', parentId],
        queryFn: async () => {
            if (!parentId) return null;
            const { data } = await supabase
                .from('profiles')
                .select('full_name, image_url')
                .eq('id', parentId)
                .maybeSingle();
            return data as any;
        },
        enabled: !!parentId,
    });

    return {
        children,
        pendingFees,
        institution,
        parentProfile,
        isLoading,
    };
}
