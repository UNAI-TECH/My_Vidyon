import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useFeeStructures(institutionId: string | null, className?: string) {
    const queryClient = useQueryClient();

    const { data: structures = [], isLoading, refetch } = useQuery({
        queryKey: ['fee-structures', institutionId, className],
        queryFn: async () => {
            if (!institutionId) return [];
            let query = supabase
                .from('fee_structures')
                .select('*')
                .eq('institution_id', institutionId);
            
            if (className) {
                query = query.eq('class_name', className);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!institutionId
    });

    useEffect(() => {
        if (!institutionId) return;

        const channel = supabase.channel(`fee-structures-${institutionId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'fee_structures', 
                filter: `institution_id=eq.${institutionId}` 
            }, () => {
                refetch();
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [institutionId]);

    return { structures, isLoading, refetch };
}
