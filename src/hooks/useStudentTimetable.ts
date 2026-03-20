import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type StudentProfile = Database['public']['Tables']['students']['Row'] & {
  class: { id: string; name: string } | null;
};

export function useStudentTimetable(authUserId: string | undefined) {
  // 1. Fetch Student Profile
  const { data: student, isLoading: isStudentLoading } = useQuery<StudentProfile | null>({
    queryKey: ['student-profile-timetable', authUserId],
    queryFn: async () => {
      if (!authUserId) return null;
      
      console.log('Fetching student profile for:', authUserId);
      let studentData: Database['public']['Tables']['students']['Row'] | null = null;
      
      const { data: initialData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', authUserId)
        .maybeSingle();
      
      studentData = initialData;
      
      // Fallback to email if user_id fetch yields nothing
      if (!studentData) {
        const { data: authData } = await supabase.auth.getUser();
        const authEmail = authData.user?.email;
        
        if (authEmail) {
          console.log('No student found by user_id, trying email:', authEmail);
          const { data: dataByEmail } = await supabase
            .from('students')
            .select('*')
            .eq('email', authEmail)
            .maybeSingle();
          
          if (dataByEmail) {
            const deb = dataByEmail as Database['public']['Tables']['students']['Row'];
            console.log('Student found by email:', deb.name);
            studentData = deb;
          }
        }
      }
      
      if (studentError) {
        console.error('Student fetch error:', studentError);
        throw studentError;
      }
      if (!studentData) {
        console.warn('No student profile found for auth user');
        return null;
      }

      const s = studentData as Database['public']['Tables']['students']['Row'];
      console.log('Student data found:', s.name, 'Class:', s.class_name);

      // Resolve class UUID from class_name and institution_id
      // Since classes are linked via groups, we might need a join, but try direct lookup first
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('name', s.class_name)
        .limit(1)
        .maybeSingle();

      if (classError) console.error('Error fetching class UUID:', classError);
      
      const c = classData as { id: string; name: string } | null;
      if (!c) console.warn('Could not resolve class UUID for:', s.class_name);
      
      return {
        ...s,
        class: c
      } as StudentProfile;
    },
    enabled: !!authUserId,
  });

  const classId = student?.class?.id;
  const section = student?.section;

  // 2. Fetch Regular Slots
  const { data: slots = [], isLoading: isSlotsLoading } = useQuery({
    queryKey: ['student-timetable-slots', classId],
    queryFn: async () => {
      if (!classId) return [];
      const { data, error } = await supabase
        .from('timetable')
        .select('*, subjects(name), profiles:faculty_id(full_name)')
        .eq('class_id', classId)
        .order('start_time');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!classId,
  });

  // 3. Fetch Special Slots
  const { data: specialSlots = [], isLoading: isSpecialLoading } = useQuery({
    queryKey: ['student-special-slots', classId, section],
    queryFn: async () => {
      if (!classId || !section) return [];
      const { data, error } = await supabase
        .from('special_timetable_slots')
        .select('*, subjects(name), profiles:faculty_id(full_name)')
        .eq('class_id', classId)
        .eq('section', section)
        .gte('event_date', new Date().toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!classId && !!section,
  });

  return {
    student,
    slots,
    specialSlots,
    isLoading: isStudentLoading || isSlotsLoading || isSpecialLoading,
  };
}
