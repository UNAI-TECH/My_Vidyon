import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useInstitutionTimetable(institutionId: string | null, facultyId?: string) {
  const queryClient = useQueryClient();

  // 1. Fetch Slots from the correct 'timetable' table
  const { data: slots = [], isLoading: isSlotsLoading } = useQuery({
    queryKey: ['timetable-slots', facultyId],
    queryFn: async () => {
      if (!facultyId) return [];
      const { data, error } = await supabase
        .from('timetable')
        .select('*, subjects(name), classes(name)')
        .eq('faculty_id', facultyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!facultyId,
  });

  // 2. Fetch Special Slots
  const { data: specialSlots = [], isLoading: isSpecialLoading } = useQuery({
    queryKey: ['special-timetable-slots', facultyId],
    queryFn: async () => {
      if (!facultyId) return [];
      const { data, error } = await supabase
        .from('special_timetable_slots')
        .select('*, subjects(name), classes(name)')
        .eq('faculty_id', facultyId)
        .gte('event_date', new Date().toISOString().split('T')[0]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!facultyId,
  });

  // 3. Update/Save Slot to 'timetable'
  const saveSlot = async (slotData: any) => {
    try {
      if (!institutionId || !facultyId) return { success: false, error: 'Missing ID' };

      // Delete existing at same day/time for this faculty to allow "overwriting"
      // Note: your schema doesn't have a unique constraint on (day, time, faculty), 
      // but we assume one slot per faculty per time.
      await (supabase.from('timetable') as any)
        .delete()
        .match({
          institution_id: institutionId,
          faculty_id: facultyId,
          day_of_week: slotData.day_of_week,
          start_time: slotData.start_time
        });

      // Insert new - matching the provided schema exactly
      // We skip 'break' and 'lunch' as they are UI-only concepts in this view
      if (slotData.subject_id && slotData.subject_id !== 'none' && slotData.subject_id !== 'break' && slotData.subject_id !== 'lunch') {
        const { error: insertError } = await (supabase.from('timetable') as any).insert({
          institution_id: institutionId, // text identifier (slug)
          class_id: slotData.class_id || null,
          subject_id: slotData.subject_id,
          faculty_id: facultyId,
          day_of_week: slotData.day_of_week,
          start_time: slotData.start_time,
          end_time: slotData.end_time,
          room_number: slotData.room_number || null
        });
        
        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ['timetable-slots', facultyId] });
      return { success: true };
    } catch (e) {
      console.error('Save slot error:', e);
      return { success: false, error: e };
    }
  };

  // 4. Save Special Slot
  const saveSpecialSlot = async (specialData: any) => {
    try {
      if (!institutionId || !facultyId) return { success: false, error: 'Missing ID' };

      const { error } = await supabase
        .from('special_timetable_slots')
        .upsert({
          ...specialData,
          institution_id: institutionId,
          faculty_id: facultyId
        });

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['special-timetable-slots', facultyId] });
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e };
    }
  };

  return {
    slots,
    specialSlots,
    isLoading: isSlotsLoading || isSpecialLoading,
    saveSlot,
    saveSpecialSlot
  };
}
