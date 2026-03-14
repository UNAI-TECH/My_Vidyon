import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type FacultySubject = Database['public']['Tables']['faculty_subjects']['Row'] & {
    subjects: { name: string } | null;
    classes: { name: string } | null;
};

type TimetableSlot = Database['public']['Tables']['timetable_slots']['Row'] & {
    subjects: { name: string } | null;
};

export interface FacultyDashboardStats {
    totalStudents: number;
    activeSubjects: number;
    todayClasses: number;
    pendingReviews: number;
    avgAttendance: string;
}

export function useFacultyDashboard(facultyId?: string, institutionId?: string) {
    // 1. Total Students in Institution
    const { data: totalStudents = 0 } = useQuery({
        queryKey: ['faculty-total-students', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const { count } = await supabase
                .from('students')
                .select('id', { count: 'exact', head: true })
                .eq('institution_id', institutionId);
            return count || 0;
        },
        enabled: !!institutionId,
    });

    // 2. Assigned Subjects
    const { data: assignedSubjects = [] } = useQuery({
        queryKey: ['faculty-assigned-subjects', facultyId],
        queryFn: async () => {
            if (!facultyId) return [];
            const { data, error } = await supabase
                .from('faculty_subjects')
                .select('*, subjects:subject_id(name), classes:class_id(name)')
                .eq('faculty_profile_id', facultyId);
            
            if (error) {
                console.error('Error fetching faculty subjects:', error);
                return [];
            }
            return (data || []) as unknown as FacultySubject[];
        },
        enabled: !!facultyId,
    });

    // 3. Today's Schedule
    const { data: todaySchedule = [] } = useQuery({
        queryKey: ['faculty-today-schedule', facultyId],
        queryFn: async () => {
            if (!facultyId) return [];
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];
            
            const { data, error } = await supabase
                .from('timetable_slots')
                .select('*, subjects:subject_id(name)')
                .eq('faculty_id', facultyId)
                .eq('day_of_week', today)
                .order('period_index');

            if (error) {
                console.error('Error fetching timetable:', error);
                return [];
            }
            return (data || []) as unknown as TimetableSlot[];
        },
        enabled: !!facultyId,
    });

    // 4. Pending Reviews (Submissions for faculty's assignments)
    const { data: pendingReviews = 0 } = useQuery({
        queryKey: ['faculty-pending-reviews', facultyId],
        queryFn: async () => {
            if (!facultyId) return 0;
            
            // First get assignments by this faculty
            const { data: assignments } = await supabase
                .from('assignments')
                .select('id')
                .eq('teacher_id', facultyId);
            
            if (!assignments || assignments.length === 0) return 0;
            
            const assignmentIds = (assignments as any[]).map(a => a.id);
            
            const { count, error } = await supabase
                .from('submissions')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending')
                .in('assignment_id', assignmentIds);
            
            if (error) {
                console.error('Error fetching pending reviews:', error);
                return 0;
            }
            return count || 0;
        },
        enabled: !!facultyId,
    });

    const stats: FacultyDashboardStats = {
        totalStudents,
        activeSubjects: assignedSubjects.length,
        todayClasses: todaySchedule.length,
        pendingReviews,
        avgAttendance: '92%', // Mocked for now
    };

    return {
        stats,
        assignedSubjects,
        todaySchedule,
        isLoading: false, // You could drive this from Query status
    };
}
