import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useInstitutionClasses(institutionId: string | null) {
    return useQuery({
        queryKey: ['institution-classes', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];
            
            // 1. Get groups for this institution
            const { data: groups, error: groupError } = await supabase
                .from('groups')
                .select('id')
                .eq('institution_id', institutionId);

            if (groupError) throw groupError;
            if (!groups || groups.length === 0) return [];

            const groupIds = (groups as any[]).map(g => g.id);

            // 2. Get classes for these groups
            const { data, error } = await supabase
                .from('classes')
                .select('id, name')
                .in('group_id', groupIds);
            
            if (error) throw error;
            return data || [];
        },
        enabled: !!institutionId
    });

}
