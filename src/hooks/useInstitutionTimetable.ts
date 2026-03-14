import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useCallback } from 'react';

export function useInstitutionTimetable(institutionId: string | null, facultyId?: string) {
  const queryClient = useQueryClient();

  // 1. Fetch Timetable Config
  const { data: config, isLoading: isConfigLoading } = useQuery({
    queryKey: ['timetable-config', institutionId],
    queryFn: async () => {
      if (!institutionId) return null;
      const { data, error } = await supabase
        .from('timetable_configs')
        .select('*')
        .eq('institution_id', institutionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!institutionId,
  });

  // 2. Fetch Slots for specific faculty
  const { data: slots = [], isLoading: isSlotsLoading } = useQuery({
    queryKey: ['timetable-slots', facultyId],
    queryFn: async () => {
      if (!facultyId) return [];
      const { data, error } = await supabase
        .from('timetable_slots')
        .select('*, subjects(name), classes(name)')
        .eq('faculty_id', facultyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!facultyId,
  });

  // 3. Update/Save Slot
  const saveSlot = async (slotData: any) => {
    try {
      if (!institutionId || !facultyId) return;

      // Ensure config exists
      let configId = config?.id;
      if (!configId) {
        const { data: newConfig } = await supabase
          .from('timetable_configs')
          .insert({ institution_id: institutionId })
          .select('id')
          .single();
        configId = newConfig?.id;
      }

      // Delete existing at same day/period
      await supabase
        .from('timetable_slots')
        .delete()
        .match({
          faculty_id: facultyId,
          day_of_week: slotData.day_of_week,
          period_index: slotData.period_index
        });

      // Insert new
      if (slotData.subject_id) {
        await supabase.from('timetable_slots').insert({
          ...slotData,
          config_id: configId,
          faculty_id: facultyId
        });
      }

      queryClient.invalidateQueries({ queryKey: ['timetable-slots', facultyId] });
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e };
    }
  };

  return {
    config,
    slots,
    isLoading: isConfigLoading || isSlotsLoading,
    saveSlot
  };
}
