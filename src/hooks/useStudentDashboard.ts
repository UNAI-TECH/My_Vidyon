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
            
            // 1. Try by user_id
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('user_id', authUserId)
                .maybeSingle();
            
            if (data) return data;

            // 2. Fallback to auth email if user_id fails
            const { data: authData } = await supabase.auth.getUser();
            const email = authData.user?.email;
            
            if (email) {
                const { data: byEmail } = await supabase
                    .from('students')
                    .select('*')
                    .eq('email', email)
                    .maybeSingle();
                if (byEmail) return byEmail;
            }

            if (error) {
                console.error('Error fetching student profile:', error);
            }
            return null;
        },
        enabled: !!authUserId,
    });

    const studentId = studentProfile?.id;

    // 1. Fetch Assignments for student's class
    const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery({
        queryKey: ['student-assignments', studentId, studentProfile?.class_name],
        queryFn: async () => {
            if (!studentId || !studentProfile) return [];
            
            // Fetch assignments for this class
            const assignmentsQuery = supabase
                .from('assignments')
                .select('*')
                .eq('class_name', (studentProfile as Student).class_name);

            const section = (studentProfile as Student).section;
            if (section) {
                assignmentsQuery.eq('section', section);
            }

            const { data: assignmentsData, error: assignmentsError } = await assignmentsQuery;

            if (assignmentsError) {
                console.error('Error fetching assignments:', assignmentsError);
                return [];
            }

            // Fetch submissions for this student
            const { data: submissionsData, error: submissionsError } = await supabase
                .from('submissions')
                .select('*')
                .eq('student_id', studentId);

            if (submissionsError) {
                console.error('Error fetching submissions:', submissionsError);
            }

            return (assignmentsData || []).map((a: any) => {
                const mySubmission = (submissionsData || []).find((s: any) => s.assignment_id === a.id);
                return {
                    id: a.id,
                    title: a.title,
                    subject: a.subject,
                    dueDate: a.due_date,
                    status: (mySubmission as any)?.status || 'pending',
                };
            });
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

    // 6. Fetch Institution Logo/Name
    const { data: institution = null } = useQuery({
        queryKey: ['student-institution', institutionId],
        queryFn: async () => {
            if (!institutionId) return null;
            const { data } = await supabase
                .from('institutions')
                .select('name, logo_url')
                .eq('institution_id', institutionId)
                .maybeSingle();
            return data as any;
        },
        enabled: !!institutionId,
    });

    // 7. Fetch Certificates
    const { data: certificates = [], isLoading: isCertificatesLoading } = useQuery({
        queryKey: ['student-certificates', studentProfile?.email],
        queryFn: async () => {
            if (!studentProfile?.email) return [];
            const { data, error } = await supabase
                .from('certificates')
                .select('*')
                .eq('student_email', studentProfile.email)
                .order('uploaded_at', { ascending: false });
            return data || [];
        },
        enabled: !!studentProfile?.email,
    });

    // 8. Fetch Subject Materials
    const { data: materials = [], isLoading: isMaterialsLoading } = useQuery({
        queryKey: ['student-materials', studentProfile?.class_name, studentProfile?.section, institutionId],
        queryFn: async () => {
            if (!studentProfile?.class_name || !institutionId) return [];
            
            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            let targetInstId = institutionId;

            // 1. Resolve Institution UUID if needed
            console.log('Student Materials Fetch - Initial InstitutionId:', institutionId);
            if (!isUUID(institutionId)) {
                const { data: instData } = await supabase
                    .from('institutions')
                    .select('id')
                    .eq('institution_id', institutionId)
                    .maybeSingle();
                if (instData) {
                    targetInstId = (instData as any).id;
                    console.log('Student Materials Fetch - Resolved Institution UUID:', targetInstId);
                } else {
                    console.error('Student Materials Fetch - Could not resolve Institution UUID for:', institutionId);
                    return [];
                }
            }

            // 2. Resolve Class UUID from Name (Hardened)
            console.log('Student Materials Fetch - Resolving Class:', studentProfile.class_name, 'for Inst:', targetInstId);
            
            // Try exact, alternative, and then fuzzy match
            const { data: potentialClasses, error: classError } = await supabase
                .from('classes')
                .select('id, name');
            
            if (classError) {
                console.error('Student Materials Fetch - Error fetching classes:', classError);
                return [];
            }

            const classMatch = (potentialClasses || []).find(c => 
                c.name.toLowerCase() === studentProfile.class_name.toLowerCase() ||
                c.name.toLowerCase() === `class ${studentProfile.class_name.toLowerCase()}` ||
                c.name.toLowerCase().includes(studentProfile.class_name.toLowerCase()) ||
                studentProfile.class_name.toLowerCase().includes(c.name.toLowerCase())
            );
            
            if (!classMatch) {
                console.error('Student Materials Fetch - Could not find Class for:', studentProfile.class_name, 'among', potentialClasses?.length, 'classes');
                return [];
            }
            console.log('Student Materials Fetch - Resolved Class UUID:', classMatch.id, '(', classMatch.name, ')');
            const classData = classMatch;

            // 3. Fetch materials
            const query = supabase
                .from('subject_materials')
                .select('*, profiles:faculty_id(full_name), subjects:subject_id(name)')
                .eq('class_id', (classData as any).id);
            
            if (studentProfile.section) {
                query.eq('section', studentProfile.section);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Student Materials Fetch - DB Error:', error);
                return [];
            }
            console.log('Student Materials Fetch - Success. Count:', data?.length || 0);
            return (data || []).map((m: any) => ({
                ...m,
                subject: m.subjects?.name || 'Unknown' // Map subject name for UI compatibility
            }));
        },
        enabled: !!studentProfile?.class_name && !!institutionId,
    });

    return {
        stats,
        assignments,
        attendanceRecords,
        grades,
        institution,
        studentProfile,
        certificates,
        materials,
        isLoading: isProfileLoading || isCertificatesLoading || isMaterialsLoading,
    };
}
