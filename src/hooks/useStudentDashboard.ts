import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Student = Database['public']['Tables']['students']['Row'];
type AssignmentWithSub = Database['public']['Tables']['assignments']['Row'] & {
    submissions: Database['public']['Tables']['submissions']['Row'][];
};
type Attendance = Database['public']['Tables']['student_attendance']['Row'];
type Grade = Database['public']['Tables']['grades']['Row'];
type Fee = Database['public']['Tables']['student_fees']['Row'];

export interface StudentDashboardStats {
    totalAssignments: number;
    pendingAssignments: number;
    attendancePercentage: string;
    averageGrade: string;
    upcomingEvents: number;
    pendingFees: number;
}

export function useStudentDashboard(authUserId?: string, institutionId?: string) {
    // 0. Fetch Student Profile to get the internal student_id and class
    const { data: studentProfile, isLoading: isProfileLoading } = useQuery<Student | null>({
        queryKey: ['student-profile', authUserId],
        queryFn: async () => {
            if (!authUserId) return null;
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('user_id', authUserId)
                .maybeSingle();
            if (error) {
                console.error('Error fetching student profile:', error);
                return null;
            }
            return data;
        },
        enabled: !!authUserId,
    });

    const studentId = studentProfile?.id;

    // 1. Fetch Assignments for student's class
    const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery({
        queryKey: ['student-assignments', studentId, (studentProfile as Student)?.class_name],
        queryFn: async () => {
            if (!studentId || !studentProfile) return [];
            
            const { data, error } = await supabase
                .from('assignments')
                .select('*, submissions(*)')
                .eq('class_name', (studentProfile as Student).class_name)
                .eq('submissions.student_id', studentId);

            if (error) {
                console.error('Error fetching assignments:', error);
                return [];
            }

            const assignmentsData = data as unknown as AssignmentWithSub[];

            return assignmentsData.map((a) => ({
                id: a.id,
                title: a.title,
                subject: a.subject,
                dueDate: a.due_date,
                status: a.submissions?.[0]?.status || 'pending',
            }));
        },
        enabled: !!studentId && !!studentProfile,
    });

    // 2. Fetch Attendance
    const { data: attendanceRecords = [], isLoading: isAttendanceLoading } = useQuery({
        queryKey: ['student-attendance', studentId],
        queryFn: async () => {
            if (!studentId) return [];
            const { data, error } = await supabase
                .from('student_attendance')
                .select('*')
                .eq('student_id', studentId)
                .order('attendance_date', { ascending: false });
            return data || [];
        },
        enabled: !!studentId,
    });

    // 3. Fetch Grades
    const { data: grades = [], isLoading: isGradesLoading } = useQuery({
        queryKey: ['student-grades', studentId],
        queryFn: async () => {
            if (!studentId) return [];
            const { data, error } = await supabase
                .from('grades')
                .select('*')
                .eq('student_id', studentId);
            return data || [];
        },
        enabled: !!studentId,
    });

    // 4. Fetch Fees
    const { data: fees = [], isLoading: isFeesLoading } = useQuery({
        queryKey: ['student-fees', studentId],
        queryFn: async () => {
            if (!studentId) return [];
            const { data, error } = await supabase
                .from('student_fees')
                .select('*')
                .eq('student_id', studentId);
            return data || [];
        },
        enabled: !!studentId,
    });

    // 5. Fetch Upcoming Events
    const { data: eventsCount = 0, isLoading: isEventsLoading } = useQuery({
        queryKey: ['upcoming-events', institutionId],
        queryFn: async () => {
            const now = new Date().toISOString().split('T')[0];
            const { count, error } = await supabase
                .from('academic_events')
                .select('*', { count: 'exact', head: true })
                .gte('event_date', now);
            return count || 0;
        },
        enabled: !!institutionId,
    });

    const stats: StudentDashboardStats = {
        totalAssignments: assignments.length,
        pendingAssignments: (assignments as any[]).filter((a: any) => a.status === 'pending').length,
        attendancePercentage: (attendanceRecords as Attendance[]).length > 0 
            ? `${Math.round(((attendanceRecords as Attendance[]).filter(r => r.status === 'present').length / (attendanceRecords as Attendance[]).length) * 100)}%`
            : 'N/A',
        averageGrade: (grades as Grade[]).length > 0 
            ? `${Math.round((grades as Grade[]).reduce((acc: number, g: Grade) => acc + (((g.marks || 0) / (g.total_marks || 100)) * 100), 0) / (grades as Grade[]).length)}%` 
            : 'N/A',
        upcomingEvents: eventsCount,
        pendingFees: (fees as Fee[]).reduce((acc: number, f: Fee) => acc + (f.amount_due || 0), 0),
    };

    return {
        stats,
        assignments,
        attendanceRecords,
        grades,
        isLoading: isProfileLoading,
    };
}
