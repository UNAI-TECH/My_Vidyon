import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type ExamSchedule = Database['public']['Tables']['exam_schedules']['Row'];
type ExamEntry = Database['public']['Tables']['exam_schedule_entries']['Row'];

export function useExamTimetable(options: {
    facultyId?: string;
    studentId?: string;
    classId?: string;
    section?: string;
    institutionId?: string;
}) {
    const queryClient = useQueryClient();
    const { facultyId, studentId, classId, section, institutionId } = options;

    // 1. Fetch Exam Schedules
    const { data: schedules = [] as ExamSchedule[], isLoading: isLoadingSchedules, refetch: refetchSchedules } = useQuery({
        queryKey: ['exam-schedules', { facultyId, studentId, classId, section, institutionId }],
        queryFn: async () => {
            let query = supabase.from('exam_schedules').select('*');

            if (institutionId) {
                query = query.eq('institution_id', institutionId);
            }
            if (classId) {
                query = query.eq('class_id', classId);
            }
            if (section) {
                query = query.or(`section.eq.${section},section.is.null`);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!(institutionId || classId || section),
    });

    // 2. Fetch Entries for a specific schedule
    const fetchEntries = async (scheduleId: string) => {
        const { data, error } = await supabase
            .from('exam_schedule_entries')
            .select('*')
            .eq('exam_schedule_id', scheduleId)
            .order('exam_date', { ascending: true })
            .order('start_time', { ascending: true });
        
        if (error) throw error;
        return data;
    };

    // 3. Create Schedule (Institution)
    const createSchedule = useMutation({
        mutationFn: async (newSchedule: any) => {
            const { entries, ...scheduleData } = newSchedule;
            
            // 1. Create or Update the parent schedule
            const { data: schedule, error: sError } = await (supabase
                .from('exam_schedules')
                .upsert(scheduleData, { 
                    onConflict: 'institution_id,class_id,section,exam_type,academic_year' 
                })
                .select()
                .single() as any);
            
            if (sError) throw sError;

            // 2. Clear existing entries if it's an update
            await supabase
                .from('exam_schedule_entries')
                .delete()
                .eq('exam_schedule_id', schedule.id);

            // 3. Add new entries
            if (entries && entries.length > 0) {
                const entriesWithId = entries.map((e: any) => ({
                    ...e,
                    exam_schedule_id: schedule.id
                }));
                const { error: eError } = await supabase
                    .from('exam_schedule_entries')
                    .insert(entriesWithId);
                
                if (eError) throw eError;
            }

            return schedule;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
        }
    });

    // 4. Delete Schedule
    const deleteSchedule = useMutation({
        mutationFn: async (scheduleId: string) => {
            // Cascade delete should handle entries if FK set correctly, 
            // but for safety we do it manually or via single delete command if RLS permits
            const { error } = await supabase.from('exam_schedules').delete().eq('id', scheduleId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
        }
    });

    return {
        schedules,
        isLoadingSchedules,
        refetchSchedules,
        fetchEntries,
        createSchedule,
        deleteSchedule
    };
}
