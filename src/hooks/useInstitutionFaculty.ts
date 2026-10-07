import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useEffect, useCallback } from 'react';

export function useInstitutionFaculty(institutionId: string | null) {
  const queryClient = useQueryClient();

  // 1. Fetch allClasses
  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['institution-classes-assign', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data: groupsData, error } = await supabase
        .from('groups')
        .select('id, classes(id, name, sections, class_teacher_id)')
        .eq('institution_id', institutionId);

      if (error) throw error;

      const fetchedClasses: any[] = [];
      (groupsData as any[])?.forEach((g: any) => {
        if (g.classes) {
          (g.classes as any[]).forEach(c => {
            const sections = Array.isArray(c.sections) ? c.sections : [c.sections];
            sections.forEach((sec: any) => {
              if (sec) {
                fetchedClasses.push({
                  id: c.id,
                  name: c.name,
                  section: sec,
                  classTeacherId: c.class_teacher_id
                });
              }
            });
          });
        }
      });
      return fetchedClasses;
    },
    enabled: !!institutionId,
  });

  // 2. Fetch allStaff
  const { data: staff = [], isLoading: isStaffLoading } = useQuery({
    queryKey: ['institution-staff-assign', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('institution_id', institutionId);
      if (error) throw error;
      const targetRoles = ['faculty', 'teacher', 'admin', 'staff', 'accountant'];
      return (data || []).filter((p: any) => targetRoles.includes(p.role));
    },
    enabled: !!institutionId,
  });

  // 3. Fetch allSubjects
  const { data: subjects = [], isLoading: isSubjectsLoading } = useQuery({
    queryKey: ['institution-subjects-assign', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('institution_id', institutionId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!institutionId,
  });

  // 4. Fetch faculty_subjects assignments
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ['institution-assignments-assign', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from('faculty_subjects')
        .select('*')
        .eq('institution_id', institutionId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!institutionId,
  });

  const assignStaff = async (classId: string, section: string, subjectId: string, staffIds: string[]) => {
    if (!institutionId) return;
    try {
      // Delete existing
      await supabase
        .from('faculty_subjects')
        .delete()
        .match({
          institution_id: institutionId,
          class_id: classId,
          section: section,
          subject_id: subjectId,
          assignment_type: 'subject_staff'
        });

      // Insert new
      if (staffIds.length > 0) {
        const toInsert = staffIds.map(fid => ({
          institution_id: institutionId,
          class_id: classId,
          section: section,
          subject_id: subjectId,
          faculty_profile_id: fid,
          assignment_type: 'subject_staff'
        }));
        await (supabase as any).from('faculty_subjects').insert(toInsert);
      }
      queryClient.invalidateQueries({ queryKey: ['institution-assignments-assign'] });
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const assignClassTeacher = async (classId: string, section: string, teacherId: string) => {
    if (!institutionId) return;
    try {
      // 1. Enforce Exclusivity: Check if this teacher is already a class teacher elsewhere
      if (teacherId) {
        const { data: existingAssignment } = await (supabase as any)
          .from('faculty_subjects')
          .select('class_id, section')
          .eq('institution_id', institutionId)
          .eq('faculty_profile_id', teacherId)
          .eq('assignment_type', 'class_teacher')
          .single();

        if (existingAssignment && (existingAssignment.class_id !== classId || existingAssignment.section !== section)) {
          // Unassign from previous class in both tables
          await (supabase as any)
            .from('faculty_subjects')
            .delete()
            .match({
              institution_id: institutionId,
              faculty_profile_id: teacherId,
              assignment_type: 'class_teacher'
            });

          await (supabase as any)
            .from('classes')
            .update({ class_teacher_id: null })
            .eq('id', existingAssignment.class_id);
            
          console.log(`Unassigned ${teacherId} from old class ${existingAssignment.class_id}`);
        }
      }

      // 2. Remove existing class teacher for the TARGET class/section
      await (supabase as any)
        .from('faculty_subjects')
        .delete()
        .match({
          institution_id: institutionId,
          class_id: classId,
          section: section,
          assignment_type: 'class_teacher'
        });

      // 3. Perform new assignment
      if (teacherId) {
        await (supabase as any).from('faculty_subjects').insert({
          institution_id: institutionId,
          class_id: classId,
          section: section,
          faculty_profile_id: teacherId,
          assignment_type: 'class_teacher',
          subject_id: null
        });
      }
      
      // 4. Sync classes table for the target class
      await (supabase as any)
        .from('classes')
        .update({ class_teacher_id: teacherId || null })
        .eq('id', classId);

      queryClient.invalidateQueries({ queryKey: ['institution-assignments-assign'] });
      queryClient.invalidateQueries({ queryKey: ['institution-classes-assign'] });
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  return {
    classes,
    staff,
    subjects,
    assignments,
    isLoading: isClassesLoading || isStaffLoading || isSubjectsLoading || isAssignmentsLoading,
    assignStaff,
    assignClassTeacher
  };
}
