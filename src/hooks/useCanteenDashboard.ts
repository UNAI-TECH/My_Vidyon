import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useCallback } from 'react';

export function useCanteenDashboard(institutionId?: string, selectedClass?: string, selectedSection?: string) {
  const queryClient = useQueryClient();

  // 1. Fetch all students with their profile images
  const { data: studentData, isLoading: studentsLoading } = useQuery({
    queryKey: ['canteen-students', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data: students, error } = await supabase
        .from('students')
        .select('id, user_id, name, register_number, class_name, section, image_url, academic_year')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .order('class_name')
        .order('name');

      if (error) {
        console.error('[Canteen] Student fetch error:', error);
        throw error;
      }

      const studentsList = (students || []) as any[];
      const userIds = studentsList.map(s => s.user_id).filter(Boolean);

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, image_url')
          .in('id', userIds);

        if (profiles) {
          const profileMap = new Map((profiles as any[]).map(p => [p.id, p.image_url]));
          return studentsList.map(s => ({
            ...s,
            image_url: s.image_url || profileMap.get(s.user_id) || null,
          }));
        }
      }

      return studentsList;
    },
    enabled: !!institutionId,
  });

  // 2. Fetch today's canteen attendance records (DEPRECATED: Now uses student_attendance)
  const today = new Date().toISOString().split('T')[0];

  // 3. Fetch today's SCHOOL attendance from student_attendance table (morning check-in)
  //    "present" and "late" are treated as IN-SCHOOL
  //    "absent" is treated as ABSENT-FROM-SCHOOL
  const { data: schoolAttendance } = useQuery({
    queryKey: ['canteen-school-attendance', institutionId, today],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from('student_attendance')
        .select('id, student_id, status, canteen_permission, entry_allowed, academic_year')
        .eq('institution_id', institutionId)
        .gte('created_at', today + 'T00:00:00')
        .lte('created_at', today + 'T23:59:59');

      if (error) {
        console.warn('[Canteen] School attendance fetch error:', error);
        return [];
      }
      return (data || []) as any[];
    },
    enabled: !!institutionId,
    refetchInterval: 15000,
  });

  // 4. Derive class list and section list from students
  const allStudents = studentData || [];
  const classes = Array.from(
    new Set(allStudents.map((s: any) => s.class_name).filter(Boolean))
  ).sort() as string[];

  const filteredByClass = selectedClass 
    ? allStudents.filter((s: any) => s.class_name === selectedClass)
    : allStudents;

  const sections = Array.from(
    new Set(filteredByClass.map((s: any) => s.section).filter(Boolean))
  ).sort() as string[];

  // 5. Merge students with attendance data
  const allMerged = filteredByClass
    .filter((s: any) => !selectedSection || s.section === selectedSection)
    .map((s: any) => {
      const schoolRecord = (schoolAttendance || []).find((a: any) => a.student_id === s.id);

      // Determine school presence: present/late = "in_school", absent = "absent_school", no record = "no_record"
      const rawStatus = schoolRecord?.status?.toLowerCase?.() || '';
      let schoolPresence: 'in_school' | 'absent_school' | 'no_record' = 'no_record';
      if (rawStatus === 'present' || rawStatus === 'late') {
        schoolPresence = 'in_school';
      } else if (rawStatus === 'absent') {
        schoolPresence = 'absent_school';
      }

      return {
        id: s.id,
        recordId: schoolRecord?.id || null, // The student_attendance primary key
        name: s.name,
        roll: s.register_number || '—',
        className: s.class_name,
        section: s.section,
        imageUrl: s.image_url || null,
        canteenStatus: schoolRecord?.canteen_permission || 'unverified',
        schoolPresence,
        entryAllowed: schoolRecord?.entry_allowed ?? true,
        academicYear: schoolRecord?.academic_year || s.academic_year,
      };
    });

  // 6. Split into two groups: present in school vs absent from school
  const presentInSchool = allMerged.filter(s => s.schoolPresence === 'in_school');
  const absentFromSchool = allMerged.filter(s => s.schoolPresence === 'absent_school');
  const noSchoolRecord = allMerged.filter(s => s.schoolPresence === 'no_record');

  // 7. Compute stats
  const stats = {
    total: allMerged.length,
    inSchool: presentInSchool.length,
    absentSchool: absentFromSchool.length,
    noRecord: noSchoolRecord.length,
    permitted: allMerged.filter(s => s.canteenStatus === 'permitted').length,
    absent: allMerged.filter(s => s.canteenStatus === 'absent').length,
    illegal: allMerged.filter(s => s.canteenStatus === 'illegal').length,
    unverified: allMerged.filter(s => s.canteenStatus === 'unverified').length,
  };

  // 8. Fetch Institution
  const { data: institution = null } = useQuery({
    queryKey: ['canteen-institution', institutionId],
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

  // 9. Fetch Canteen Profile
  const { data: canteenProfile = null } = useQuery({
    queryKey: ['canteen-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, image_url')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching canteen profile:', error);
        return null;
      }
      return data as unknown as { full_name: string; image_url: string | null };
    },
  });

  // 10. Refresh helper
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['canteen-students'] });
    queryClient.invalidateQueries({ queryKey: ['canteen-attendance'] });
    queryClient.invalidateQueries({ queryKey: ['canteen-school-attendance'] });
  }, [queryClient]);

  return {
    presentInSchool,
    absentFromSchool,
    noSchoolRecord,
    allStudents: allMerged,
    classes,
    sections,
    stats,
    institution,
    canteenProfile,
    isLoading: studentsLoading,
    refresh,
  };
}
