import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type FacultySubject = Database['public']['Tables']['faculty_subjects']['Row'] & {
    subjects: { name: string } | null;
    classes: { name: string } | null;
};

type TimetableSlot = Database['public']['Tables']['timetable']['Row'] & {
    subjects: { name: string } | null;
    classes: { name: string } | null;
};

export interface FacultyDashboardData {
    stats: FacultyDashboardStats;
    assignedSubjects: FacultySubject[];
    todaySchedule: TimetableSlot[];
    institution: Database['public']['Tables']['institutions']['Row'] | null;
    isLoading: boolean;
}

export interface FacultyDashboardStats {
    totalStudents: number;
    assignedStudents: number;
    activeSubjects: number;
    todayClasses: number;
    pendingReviews: number;
    pendingLeaves: number;
    pendingGrading: number;
    avgAttendance: string;
}

export interface FacultyProfile {
    full_name: string;
    image_url: string | null;
    department: string | null;
}

export function useFacultyDashboard(facultyId?: string, institutionId?: string) {
    // 1. Total Students in Institution
    const { data: totalStudents = 0, isLoading: isLoadingTotal } = useQuery({
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

    // 2. Assigned Subjects & Students in those classes
    const { data: assignedData = { subjects: [], studentCount: 0 }, isLoading: isLoadingAssigned } = useQuery({
        queryKey: ['faculty-assigned-subjects', facultyId],
        queryFn: async () => {
            if (!facultyId) return { subjects: [], studentCount: 0 };
            
            // Fetch subjects
            const { data: subjectsData, error: subjectsError } = await supabase
                .from('faculty_subjects')
                .select('*, subjects:subject_id(name), classes:class_id(name)')
                .eq('faculty_profile_id', facultyId);
            
            if (subjectsError) {
                console.error('Error fetching faculty subjects:', subjectsError);
                return { subjects: [], studentCount: 0 };
            }

            const subjects = (subjectsData || []) as unknown as FacultySubject[];
            
            // Get unique class/section combinations to count students
            const classFilters = subjects.map(s => `(class_name.eq.${s.classes?.name},section.eq.${s.section})`).join(',');
            
            let studentCount = 0;
            if (subjects.length > 0) {
                // This is a bit complex for a single query if we have many classes, 
                // but let's try to get count of students in assigned classes
                const { count } = await supabase
                    .from('students')
                    .select('id', { count: 'exact', head: true })
                    .in('class_name', subjects.map(s => s.classes?.name).filter(Boolean) as string[])
                    // We might need a more refined way to count students per section if needed
                studentCount = count || 0;
            }

            return { subjects, studentCount };
        },
        enabled: !!facultyId,
    });
    
    const assignedSubjects = assignedData.subjects;
    const assignedStudents = assignedData.studentCount;

    // 3. Today's Schedule
    const { data: todaySchedule = [], isLoading: isLoadingSchedule } = useQuery({
        queryKey: ['faculty-today-schedule', facultyId],
        queryFn: async () => {
            if (!facultyId) return [];
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];
            
            const { data, error } = await supabase
                .from('timetable')
                .select('*, subjects:subject_id(name), classes:class_id(name)')
                .eq('faculty_id', facultyId)
                .eq('day_of_week', today)
                .order('start_time');

            if (error) {
                console.error('Error fetching timetable:', error);
                return [];
            }
            return (data || []) as unknown as TimetableSlot[];
        },
        enabled: !!facultyId,
    });

    // 4. Pending Reviews (Submissions for faculty's assignments)
    const { data: pendingReviews = 0, isLoading: isLoadingReviews } = useQuery({
        queryKey: ['faculty-pending-reviews', facultyId],
        queryFn: async () => {
            if (!facultyId) return 0;
            const { data: assignmentsData } = await supabase
                .from('assignments')
                .select('id')
                .eq('teacher_id', facultyId);
            if (!assignmentsData || assignmentsData.length === 0) return 0;
            const assignmentIds = (assignmentsData as any[]).map(a => a.id);
            const { count } = await supabase
                .from('submissions')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending')
                .in('assignment_id', assignmentIds);
            return count || 0;
        },
        enabled: !!facultyId,
    });

    // 5. Pending Leaves (where faculty is the class teacher)
    const { data: pendingLeaves = 0, isLoading: isLoadingLeaves } = useQuery({
        queryKey: ['faculty-pending-leaves', facultyId],
        queryFn: async () => {
            if (!facultyId) return 0;
            const { count } = await supabase
                .from('leave_requests')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending')
                .eq('assigned_class_teacher_id', facultyId);
            return count || 0;
        },
        enabled: !!facultyId,
    });

    // 6. Pending Grading (status = draft)
    const { data: pendingGrading = 0, isLoading: isLoadingGrading } = useQuery({
        queryKey: ['faculty-pending-grading', facultyId],
        queryFn: async () => {
            if (!facultyId) return 0;
            const { count } = await supabase
                .from('exam_results')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'draft')
                .eq('staff_id', facultyId);
            return count || 0;
        },
        enabled: !!facultyId,
    });

    // 7. Fetch Institution Data
    const { data: institution = null } = useQuery({
        queryKey: ['faculty-institution', institutionId],
        queryFn: async () => {
            if (!institutionId) return null;
            const { data: inst } = await supabase
                .from('institutions')
                .select('*')
                .eq('id', institutionId)
                .maybeSingle();
            return inst as any;
        },
        enabled: !!institutionId,
    });

    // 8. Fetch Faculty Profile
    const { data: facultyProfile = null } = useQuery<FacultyProfile | null>({
        queryKey: ['faculty-profile', facultyId],
        queryFn: async () => {
            if (!facultyId) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, image_url, department')
                .eq('id', facultyId)
                .maybeSingle();
            
            if (error) {
                console.error('Error fetching faculty profile:', error);
                return null;
            }
            return data as unknown as FacultyProfile;
        },
        enabled: !!facultyId,
    });

    const stats: FacultyDashboardStats = {
        totalStudents,
        assignedStudents,
        activeSubjects: assignedSubjects.length,
        todayClasses: todaySchedule.length,
        pendingReviews,
        pendingLeaves,
        pendingGrading,
        avgAttendance: '92%', // Mocked for now
    };

    return {
        stats,
        assignedSubjects,
        todaySchedule,
        institution,
        facultyProfile,
        isLoading: isLoadingAssigned || isLoadingSchedule || isLoadingGrading || isLoadingLeaves || isLoadingReviews,
    };
}
