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
      if (!s) {
        console.log('No student profile found for user_id:', authUserId);
        return null;
      }
      console.log('Student data found:', s.name, 'Class Name:', s.class_name, 'Inst ID:', s.institution_id);

      // Resolve class UUID from class_name and institution_id
      let potentialClasses = null;
      if (s.institution_id) {
        console.log('Fetching classes for institution:', s.institution_id);
        const { data, error } = await supabase
          .from('classes')
          .select('id, name')
          .eq('institution_id', s.institution_id);
        
        if (error) console.error('Error fetching classes for UUID resolution:', error);
        console.log('Found potential classes count:', data?.length || 0);
        potentialClasses = data;
      } else {
        console.warn('Student has no institution_id! UUID resolution will fail.');
      }
      
      let resolvedClass = null;
      if (potentialClasses && s.class_name) {
        const className = s.class_name.toLowerCase().trim();
        resolvedClass = (potentialClasses as any[] || []).find((c: any) => {
            const cName = c.name.toLowerCase().trim();
            const match = cName === className ||                          // exact match
                cName === `class ${className}` ||                  // "class 10th"
                `class ${cName}` === className ||                  // reverse
                cName.replace(/class\s*/i, '') === className.replace(/class\s*/i, '') || 
                cName.replace(/[^a-z0-9]/g, '') === className.replace(/[^a-z0-9]/g, '');
            return match;
        });
        console.log('Class resolution attempt for:', className, 'Result:', resolvedClass ? `${resolvedClass.name} (${resolvedClass.id})` : 'FAILED');
      }
      
      if (!resolvedClass) return { ...s, class: null };

      // 3. Finally fetch slots for the resolved class UUID
      console.log('Fetching timetable slots for class_id:', resolvedClass.id);
      const { data: slotsData, error: slotsError } = await supabase
        .from('timetable')
        .select('*, profiles(full_name), subjects(name)')
        .eq('class_id', resolvedClass.id);

      if (slotsError) console.error('Timetable slots fetch error:', slotsError);
      console.log('Timetable slots found:', slotsData?.length || 0);
      if (slotsData && slotsData.length > 0) {
        console.log('Sample slot day_of_week:', slotsData[0].day_of_week);
      }
      
      return {
        ...s,
        class: resolvedClass || null
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
