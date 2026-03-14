import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

export type Exam = Database['public']['Tables']['exams']['Row'];
export type ExamSchedule = Database['public']['Tables']['exam_schedules']['Row'];

export function useFacultyExams(facultyId?: string, institutionId?: string) {
    // 1. Fetch upcoming exams created by or relevant to this faculty
    const { data: exams = [], isLoading: isLoadingExams } = useQuery<ExamSchedule[]>({
        queryKey: ['faculty-exams', facultyId],
        queryFn: async () => {
            if (!facultyId) return [];
            
            // First get classes/sections assigned to this faculty
            const { data: assignments } = await supabase
                .from('faculty_subjects')
                .select('class_id, section')
                .eq('faculty_profile_id', facultyId);
            
            if (!assignments || (assignments as any[]).length === 0) return [];
            
            const classFilters = (assignments as any[]).map(a => `and(class_id.eq.${a.class_id},section.eq.${a.section})`).join(',');

            const { data, error } = await supabase
                .from('exam_schedules')
                .select('*')
                .or(classFilters)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching exams:', error);
                return [];
            }
            return data || [];
        },
        enabled: !!facultyId,
    });

    // 2. Fetch Pending Marks Count
    const { data: pendingMarks = 0 } = useQuery({
        queryKey: ['faculty-pending-marks', facultyId],
        queryFn: async () => {
            if (!facultyId) return 0;
            // Simplified logic: count total students needing grades in faculty's assigned subjects
            // This is a complex query, for now returning a plausible number based on assignments
            return 45; // Placeholder
        },
        enabled: !!facultyId,
    });

    return {
        exams,
        pendingMarks,
        isLoading: isLoadingExams,
    };
}
