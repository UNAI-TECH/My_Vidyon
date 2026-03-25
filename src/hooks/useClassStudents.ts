import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useClassStudents(institutionId: string | null, className: string | null) {
    return useQuery({
        queryKey: ['class-students', institutionId, className],
        queryFn: async () => {
            if (!institutionId || !className) return [];
            
            const { data, error } = await supabase
                .from('students')
                .select('id, name, register_number, user_id, image_url')
                .eq('institution_id', institutionId)
                .eq('class_name', className)
                .order('name');
            
            if (error) throw error;
            return data || [];
        },
        enabled: !!institutionId && !!className
    });
}
