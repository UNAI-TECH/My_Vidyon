import { useEffect } from 'react';
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
    upcomingExams: number;
    pendingFees: number;
    attendanceTrend: {
        labels: string[];
        data: number[];
    };
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
    const effectiveInstId = institutionId || studentProfile?.institution_id;

    // 1. Fetch Assignments strictly scoped to student's institution, class, and section
    const { data: assignments = [], isLoading: isAssignmentsLoading, refetch: refetchAssignments } = useQuery({
        queryKey: ['student-assignments', studentId, effectiveInstId, studentProfile?.class_name, studentProfile?.section],
        queryFn: async () => {
            if (!studentId || !studentProfile) return [];
            
            const rawInstId = effectiveInstId || studentProfile?.institution_id;
            if (!rawInstId) {
                console.warn('[useStudentDashboard] No institution ID found for student:', studentId);
                return [];
            }

            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            let validInstIds: string[] = [rawInstId];

            // Resolve both UUID ('id') and code ('institution_id') of the institution
            try {
                const instQuery = supabase.from('institutions').select('id, institution_id');
                if (isUUID(rawInstId)) {
                    instQuery.eq('id', rawInstId);
                } else {
                    instQuery.eq('institution_id', rawInstId);
                }
                const { data: instData } = await (instQuery as any).maybeSingle();
                if (instData) {
                    const instObj = instData as any;
                    if (instObj.id) validInstIds.push(instObj.id);
                    if (instObj.institution_id) validInstIds.push(instObj.institution_id);
                }
            } catch (instErr) {
                console.warn('[useStudentDashboard] Error resolving institution for assignments:', instErr);
            }
            validInstIds = Array.from(new Set(validInstIds.filter(Boolean)));

            // Resolve class UUIDs matching this student's class name within this institution
            const studentClassName = (studentProfile as any).class_name;
            if (!studentClassName) return [];

            const { data: potentialClasses } = await supabase
                .from('classes')
                .select('id, name')
                .in('institution_id', validInstIds);

            const className = studentClassName.toLowerCase().trim();
            const matchingClasses = (potentialClasses as any[] || []).filter((c: any) => {
                const cName = (c.name || '').toLowerCase().trim();
                return cName === className ||
                    cName === `class ${className}` ||
                    `class ${cName}` === className ||
                    cName.replace(/class\s*/i, '') === className.replace(/class\s*/i, '') ||
                    cName.replace(/[^a-z0-9]/g, '') === className.replace(/[^a-z0-9]/g, '');
            });

            const classIds = matchingClasses.map((c: any) => c.id).filter(Boolean);

            // Filter to valid UUIDs for assignments.institution_id (UUID column in Postgres)
            const validUuidInstIds = validInstIds.filter(id => isUUID(id));
            if (validUuidInstIds.length === 0) {
                return [];
            }

            // Query assignments strictly belonging to this institution
            let assignmentsQuery = supabase
                .from('assignments')
                .select('*')
                .in('institution_id', validUuidInstIds);

            // Match student's class (by class_id UUIDs or class_name string)
            if (classIds.length > 0) {
                const classIdInFilter = classIds.map(id => `"${id}"`).join(',');
                if (isUUID(studentClassName)) {
                    assignmentsQuery = assignmentsQuery.or(`class_id.in.(${classIdInFilter}),class_name.ilike."${studentClassName}",class_id.eq."${studentClassName}"`);
                } else {
                    assignmentsQuery = assignmentsQuery.or(`class_id.in.(${classIdInFilter}),class_name.ilike."${studentClassName}"`);
                }
            } else {
                if (isUUID(studentClassName)) {
                    assignmentsQuery = assignmentsQuery.or(`class_name.ilike."${studentClassName}",class_id.eq."${studentClassName}"`);
                } else {
                    assignmentsQuery = assignmentsQuery.ilike('class_name', studentClassName);
                }
            }

            // Match section: match student's section, or unassigned/null/empty section (whole class)
            const studentSection = (studentProfile as any).section;
            if (studentSection) {
                assignmentsQuery = assignmentsQuery.or(`section.ilike."${studentSection}",section.is.null,section.eq.""`);
            }

            assignmentsQuery = assignmentsQuery.order('due_date', { ascending: false });

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
                    subject: a.subject || 'General',
                    dueDate: a.due_date ? a.due_date.split('T')[0] : 'No Due Date',
                    status: (mySubmission as any)?.status || 'pending',
                };
            });
        },
        enabled: !!studentId && !!studentProfile,
    });

    // 2. Fetch Attendance
    const { data: attendanceRecords = [], refetch: refetchAttendance } = useQuery({
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
    const { data: grades = [], refetch: refetchGrades } = useQuery({
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
    const { data: fees = [], refetch: refetchFees } = useQuery({
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

    // 5. Fetch Upcoming Events (Filtered by Institution)
    const { data: eventsCount = 0 } = useQuery({
        queryKey: ['upcoming-events', institutionId],
        queryFn: async () => {
            if (!institutionId) return 0;
            const now = new Date().toISOString().split('T')[0];

            // Resolve UUID if needed
            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            let targetUuid = institutionId;
            if (!isUUID(institutionId)) {
                const { data } = await supabase.from('institutions').select('id').eq('institution_id', institutionId).maybeSingle();
                if (data) targetUuid = (data as any).id;
                else return 0;
            }

            const { count, error } = await supabase
                .from('academic_events')
                .select('*', { count: 'exact', head: true })
                .eq('institution_id', targetUuid)
                .gte('event_date', now);
            
            if (error) {
                console.error('Error fetching events count:', error);
                return 0;
            }
            return count || 0;
        },
        enabled: !!institutionId,
    });

    // 9. Fetch Upcoming Exams
    const { data: exams = [], isLoading: isExamsLoading, refetch: refetchExams } = useQuery({
        queryKey: ['student-exams', studentProfile?.class_name, studentProfile?.section, institutionId],
        queryFn: async () => {
            if (!studentProfile?.class_name || !institutionId) return [];
            
            // 1. Get Class IDs that might be used (Name or UUID)
            const { data: classesData } = await supabase
                .from('classes')
                .select('id')
                .eq('institution_id', institutionId)
                .eq('name', studentProfile.class_name);
            
            const classIds = (classesData as any[])?.map((c: any) => c.id) || [];
            
            // 2. Fetch schedules for my class (Match either the Name or the resolved UUID)
            let query = supabase
                .from('exam_schedules')
                .select('*, exam_schedule_entries(*)')
                .eq('institution_id', institutionId);

            if (classIds.length > 0) {
                const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                if (isUUID(studentProfile.class_name)) {
                    query = query.or(`class_id.eq."${studentProfile.class_name}",class_id.in.(${classIds.map(id => `"${id}"`).join(',')})`);
                } else {
                    query = query.in('class_id', classIds);
                }
            } else {
                query = query.eq('class_id', studentProfile.class_name);
            }
            
            if (studentProfile.section) {
                query = query.or(`section.eq."${studentProfile.section}",section.is.null`);
            }

            const { data: schedules, error } = await query
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching exams:', error);
                return [];
            }

            return (schedules as any[] || []).map(s => ({
                ...s,
                entries: s.exam_schedule_entries || []
            }));
        },
        enabled: !!studentProfile?.class_name && !!institutionId,
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
        upcomingExams: exams.length,
        pendingFees: (fees as Fee[]).reduce((acc: number, f: Fee) => acc + (f.amount_due || 0), 0),
        attendanceTrend: calculateAttendanceTrend(attendanceRecords as Attendance[]),
    };

    // 6. Fetch Institution Logo/Name
    const effectiveInst = institutionId || (studentProfile as any)?.institution_id;
    const { data: institution = null } = useQuery({
        queryKey: ['student-institution', effectiveInst],
        queryFn: async () => {
            if (!effectiveInst) return null;
            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            let query = supabase.from('institutions').select('name, logo_url, id, institution_id');
            if (isUUID(effectiveInst)) {
                query = query.eq('id', effectiveInst);
            } else {
                query = query.ilike('institution_id', effectiveInst);
            }
            const { data } = await (query as any).maybeSingle();
            return data as any;
        },
        enabled: !!effectiveInst,
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
            if (!isUUID(institutionId)) {
                const { data: instData } = await supabase
                    .from('institutions')
                    .select('id')
                    .eq('institution_id', institutionId)
                    .maybeSingle();
                if (instData) {
                    targetInstId = (instData as any).id;
                } else {
                    console.warn('[StudentMaterials] Could not resolve institution UUID for:', institutionId);
                    return [];
                }
            }

            // 2. Resolve Class UUID from Name - scoped to this institution
            const { data: potentialClasses } = await supabase
                .from('classes')
                .select('id, name')
                .eq('institution_id', targetInstId);
            
            const className = studentProfile.class_name.toLowerCase().trim();
            
            // Try multiple matching strategies
            const classMatch = (potentialClasses as any[] || []).find((c: any) => {
                const cName = c.name.toLowerCase().trim();
                return cName === className ||                          // exact match: "10th" === "10th"
                    cName === `class ${className}` ||                  // "class 10th" === class + "10th"
                    `class ${cName}` === className ||                  // "10th" === class + "10th" (reverse)
                    cName.replace(/class\s*/i, '') === className.replace(/class\s*/i, '') || // strip "class" from both
                    cName.replace(/[^a-z0-9]/g, '') === className.replace(/[^a-z0-9]/g, ''); // alphanumeric match
            });
            
            if (!classMatch) {
                console.warn('[StudentMaterials] No class match for:', studentProfile.class_name, 'in classes:', potentialClasses?.map((c: any) => c.name));

                // Fallback: try fetching materials directly by institution_id (some may not need class matching)
                const { data: fallbackData } = await supabase
                    .from('subject_materials')
                    .select('*, profiles:faculty_id(full_name), subjects:subject_id(name)')
                    .eq('institution_id', targetInstId)
                    .order('created_at', { ascending: false });

                return (fallbackData || []).map((m: any) => ({
                    ...m,
                    subject: m.subjects?.name || 'Unknown'
                }));
            }
            
            const classData = classMatch;

            // 3. Fetch materials scoped to institution + class + section
            let query = supabase
                .from('subject_materials')
                .select('*, profiles:faculty_id(full_name), subjects:subject_id(name)')
                .eq('institution_id', targetInstId)
                .eq('class_id', (classData as any).id)
                .order('created_at', { ascending: false });
            
            if (studentProfile.section) {
                query = query.eq('section', studentProfile.section);
            }

            const { data, error } = await query;
            if (error) {
                console.error('[StudentMaterials] Fetch error:', error);
                return [];
            }
            return (data || []).map((m: any) => ({
                ...m,
                subject: m.subjects?.name || 'Unknown'
            }));
        },
        enabled: !!studentProfile?.class_name && !!institutionId,
    });

    // 9. Real-time Subscriptions
    useEffect(() => {
        if (!studentId) return;

        const channel = supabase.channel(`student-dashboard-${studentId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'assignments', 
                filter: `class_name=eq.${studentProfile?.class_name}` 
            }, () => refetchAssignments())
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'submissions', 
                filter: `student_id=eq.${studentId}` 
            }, () => refetchAssignments())
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'student_attendance', 
                filter: `student_id=eq.${studentId}` 
            }, () => refetchAttendance())
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'grades', 
                filter: `student_id=eq.${studentId}` 
            }, () => refetchGrades())
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'student_fees', 
                filter: `student_id=eq.${studentId}` 
            }, () => refetchFees())
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'exam_schedules', 
                filter: `class_id=eq.${studentProfile?.class_name}` 
            }, () => refetchExams())
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [studentId, studentProfile?.class_name]);

    return {
        stats,
        assignments,
        attendanceRecords,
        grades,
        institution,
        studentProfile,
        certificates,
        materials,
        exams,
        isLoading: isProfileLoading || isAssignmentsLoading || isCertificatesLoading || isMaterialsLoading || isExamsLoading,
        isAssignmentsLoading,
        refetchAssignments,
    };
}

/**
 * Calculates a daily attendance percentage trend for the latest 6 records.
 * Map 'present', 'late', 'excused' -> 100, others -> 0.
 */
function calculateAttendanceTrend(records: Attendance[]) {
    const labels: string[] = [];
    const data: number[] = [];
    
    // Sort all records by date descending (latest first) to pick the window
    const sorted = [...records].sort((a, b) => 
        new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime()
    );

    if (sorted.length === 0) {
        return { 
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], 
            data: [0, 0, 0, 0, 0, 0] 
        };
    }

    // 1. Determine the latest record date to anchor our 6-day window
    const latestDate = new Date(sorted[0].attendance_date);
    
    // 2. Iterate BACKWARDS from latest date for 6 consecutive days to show "all the days"
    for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(latestDate);
        targetDate.setDate(latestDate.getDate() - i);
        
        const dateStr = targetDate.toISOString().split('T')[0];
        const dayLabel = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
        
        // Find if we have a record for this exact date
        // Use string comparison (YYYY-MM-DD) to be robust against timezones
        const dayRecord = sorted.find(r => r.attendance_date === dateStr);
        
        labels.push(dayLabel);
        
        if (dayRecord) {
            // Map status directly: present/late/excused count as "in school" (100)
            const isPresent = ['present', 'late', 'excused'].includes(dayRecord.status.toLowerCase());
            data.push(isPresent ? 100 : 0);
        } else {
            // No record for this day (holiday, weekend, or missed) -> 0
            data.push(0);
        }
    }

    return { labels, data };
}
