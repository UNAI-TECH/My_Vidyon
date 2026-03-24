import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

export type Exam = Database['public']['Tables']['exams']['Row'];
export type ExamSchedule = Database['public']['Tables']['exam_schedules']['Row'];
export type ExamEntry = Database['public']['Tables']['exam_schedule_entries']['Row'];

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
            return 45; // Placeholder
        },
        enabled: !!facultyId,
    });

    // 3. Fetch Entries for those exams (to show a personal schedule)
    const { data: scheduleEntries = [], isLoading: isLoadingEntries } = useQuery<any[]>({
        queryKey: ['faculty-exam-entries', facultyId, exams],
        queryFn: async () => {
            if (!facultyId || (exams as any[]).length === 0) return [];
            
            const scheduleIds = (exams as any[]).map(e => e.id);
            const { data, error } = await supabase
                .from('exam_schedule_entries')
                .select(`
                    *,
                    exam_schedules!exam_schedule_entries_exam_schedule_id_fkey (exam_display_name, class_id, section)
                `)
                .in('exam_schedule_id', scheduleIds)
                .order('exam_date', { ascending: true });
            
            if (error) {
                console.error("Error fetching entries:", error);
                return [];
            }
            return data || [];
        },
        enabled: !!facultyId && (exams as any[]).length > 0,
    });

    return {
        exams,
        scheduleEntries,
        pendingMarks,
        isLoading: isLoadingExams || isLoadingEntries,
    };
}
