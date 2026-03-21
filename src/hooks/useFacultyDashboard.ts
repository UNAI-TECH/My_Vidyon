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

            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

            const subjects = (subjectsData as any[] || [])
                .filter(s => !!s.subjects && !!s.subject_id && isUUID(s.subject_id) && !!s.class_id && isUUID(s.class_id)) as unknown as FacultySubject[];
            
            console.log('Faculty Subjects Filter Results:', {
                rawCount: subjectsData?.length || 0,
                filteredCount: subjects.length,
                sampleIds: subjects.slice(0, 3).map(s => s.subject_id)
            });
            
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
    const { data: facultyProfile = null, isLoading: isProfileLoading } = useQuery<FacultyProfile | null>({
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

    // 9. Methods for Certificates & Materials
    const uploadCertificate = async (data: any) => {
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        console.log('Final Certificate Upload ID Check:', { subject_id: data.subject_id, valid: isUUID(data.subject_id || '') });
        
        if (data.subject_id && !isUUID(data.subject_id)) throw new Error('Invalid subject ID format: ' + data.subject_id);
        if (data.class_id && !isUUID(data.class_id)) throw new Error('Invalid class ID format: ' + data.class_id);
        
        // Auto-fill names if missing
        const mapping = assignedSubjects.find(s => s.subject_id === data.subject_id && s.class_id === data.class_id);
        const finalData = {
            ...data,
            subject: data.subject || mapping?.subjects?.name || 'Unknown',
            class_name: data.class_name || mapping?.classes?.name || 'Unknown',
        };

        const { error } = await supabase.from('certificates').insert(finalData);
        if (error) throw error;
        return true;
    };

    const uploadMaterial = async (data: any) => {
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        console.log('Final Material Upload ID Check:', { subject_id: data.subject_id, institution_id: data.institution_id });

        if (data.subject_id && !isUUID(data.subject_id)) throw new Error('Invalid subject ID format: ' + data.subject_id);
        if (data.class_id && !isUUID(data.class_id)) throw new Error('Invalid class ID format: ' + data.class_id);
        if (data.institution_id && !isUUID(data.institution_id)) throw new Error('Invalid institution ID format: ' + data.institution_id);

        // Remove subject/class_name as they don't exist in the subject_materials schema provided
        const { subject, class_name, ...insertData } = data;

        const { error } = await supabase.from('subject_materials').insert(insertData);
        if (error) throw error;
        return true;
    };

    // 10. Fetch Faculty's Uploaded Materials
    const { data: myMaterials = [], isLoading: isLoadingMyMaterials, refetch: refetchMaterials } = useQuery({
        queryKey: ['faculty-my-materials', facultyId],
        queryFn: async () => {
            if (!facultyId) return [];
            const { data, error } = await supabase
                .from('subject_materials')
                .select('*, subjects:subject_id(name), classes:class_id(name)')
                .eq('faculty_id', facultyId)
                .order('created_at', { ascending: false });
            if (error) {
                console.error('Error fetching faculty materials:', error);
                return [];
            }
            return data || [];
        },
        enabled: !!facultyId,
    });

    // 11. Fetch Faculty's Assignments (Hardened against Join Failures)
    const { data: myAssignments = [], isLoading: isLoadingMyAssignments, refetch: refetchAssignments } = useQuery({
        queryKey: ['faculty-my-assignments', facultyId],
        queryFn: async () => {
            if (!facultyId) return [];
            
            // Try with joins first
            const { data, error } = await supabase
                .from('assignments')
                .select('*, subjects:subject_id(name), classes:class_id(name)')
                .eq('teacher_id', facultyId)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Faculty Assignments join failed, falling back to safe fetch:', error.message);
                // Fallback to safe fetch without joins if type mismatch occurs
                const { data: safeData, error: safeError } = await supabase
                    .from('assignments')
                    .select('*')
                    .eq('teacher_id', facultyId)
                    .order('created_at', { ascending: false });
                
                if (safeError) {
                    console.error('Safe fetch also failed:', safeError);
                    return [];
                }
                
                // Add submission counts separately for safeData if needed, 
                // but for now just return the data to stop the spinner
                return safeData || [];
            }

            // Manually add submission stats if not joined
            const assignmentsWithStats = await Promise.all((data || []).map(async (a: any) => {
                const { count } = await supabase
                    .from('submissions')
                    .select('*', { count: 'exact', head: true })
                    .eq('assignment_id', a.id);
                return { ...a, submissionCount: count || 0 };
            }));

            return assignmentsWithStats;
        },
        enabled: !!facultyId,
    });

    const deleteMaterial = async (materialId: string, fileUrl?: string) => {
        try {
            // 1. Delete from Storage if URL is provided
            if (fileUrl) {
                const pathParts = fileUrl.split('/storage/v1/object/public/materials/');
                if (pathParts.length > 1) {
                    const filePath = decodeURIComponent(pathParts[1]);
                    await supabase.storage.from('materials').remove([filePath]);
                }
            }
            // 2. Delete from DB
            const { error } = await supabase.from('subject_materials').delete().eq('id', materialId);
            if (error) throw error;
            await refetchMaterials();
            return true;
        } catch (error) {
            console.error('Error deleting material:', error);
            throw error;
        }
    };

    const deleteAssignment = async (assignmentId: string) => {
        const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
        if (error) throw error;
        await refetchAssignments();
        return true;
    };

    const fetchSubmissions = async (assignmentId: string) => {
        const { data, error } = await supabase
            .from('submissions')
            .select('*')
            .eq('assignment_id', assignmentId);
        if (error) throw error;
        return data;
    };

    const fetchClassStudents = async (className: string, section?: string) => {
        const query = supabase
            .from('students')
            .select('id, profiles!students_profile_id_fkey(full_name, image_url)')
            .eq('class_name', className);
        
        if (section) {
            query.eq('section', section);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        return data?.map((s: any) => ({
            id: s.id,
            roll_no: 'N/A',
            full_name: s.profiles?.full_name || 'Unknown',
            image_url: s.profiles?.image_url
        }));
    };

    const verifySubmission = async (submissionId: string, updates: { 
        status: 'verified' | 'rejected', 
        grade?: number, 
        feedback?: string
    }) => {
        const { error } = await (supabase.from('submissions') as any)
            .update({
                ...updates,
                verified_at: new Date().toISOString(),
                verified_by: facultyId
            })
            .eq('id', submissionId);
        
        if (error) throw error;

        // Trigger notification logic could go here
        return true;
    };

    return {
        stats,
        assignedSubjects,
        assignedStudents,
        todaySchedule,
        pendingReviews,
        pendingLeaves,
        pendingGrading,
        institution,
        facultyProfile,
        isLoading: isLoadingTotal || isLoadingAssigned || isLoadingSchedule || isLoadingReviews || isLoadingLeaves || isLoadingGrading || isProfileLoading,
        isLoadingProfile: isProfileLoading,
        uploadCertificate,
        uploadMaterial,
        myMaterials,
        isLoadingMyMaterials,
        refetchMaterials,
        deleteMaterial,
        myAssignments,
        isLoadingMyAssignments,
        refetchAssignments,
        deleteAssignment,
        fetchSubmissions,
        fetchClassStudents,
        verifySubmission,
    };
}
