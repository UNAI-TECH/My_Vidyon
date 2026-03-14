import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type CanteenRecord = Database['public']['Tables']['canteen_attendance']['Row'] & {
    students: { name: string; register_number: string } | null;
};

export interface CanteenDashboardData {
    students: any[];
    classes: string[];
}

export function useCanteenDashboard(institutionId?: string, selectedClass?: string) {
    // 1. Fetch Students with Canteen Status for Today
    const { data: canteenData = [], isLoading } = useQuery({
        queryKey: ['canteen-attendance', institutionId, selectedClass],
        queryFn: async () => {
            if (!institutionId) return [];
            const today = new Date().toISOString().split('T')[0];
            
            // Get all students in the selected class first
            let studentQuery = supabase
                .from('students')
                .select('id, name, register_number, class_name')
                .eq('institution_id', institutionId);
            
            if (selectedClass) {
                studentQuery = studentQuery.eq('class_name', selectedClass);
            }

            const { data: students, error: studentError } = await studentQuery;
            if (studentError) throw studentError;

            // Get canteen attendance for today
            const { data: attendance, error: attendanceError } = await supabase
                .from('canteen_attendance')
                .select('*')
                .eq('canteen_date', today);
            
            if (attendanceError) throw attendanceError;

            // Merge data
            return ((students || []) as any[]).map(s => {
                const record = ((attendance || []) as any[]).find(a => a.student_id === s.id);
                return {
                    id: s.id,
                    name: s.name,
                    roll: s.register_number,
                    status: record?.status || 'unverified',
                };
            });
        },
        enabled: !!institutionId,
    });

    // 2. Fetch Classes for selector
    const { data: classes = [] } = useQuery({
        queryKey: ['institution-classes', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];
            const { data: classes = [] } = await supabase
                .from('classes')
                .select('name')
                .eq('institution_id', institutionId);
            return Array.from(new Set(((classes || []) as any[]).map(c => c.name)));
        },
        enabled: !!institutionId,
    });

    return {
        students: canteenData,
        classes,
        isLoading,
    };
}
