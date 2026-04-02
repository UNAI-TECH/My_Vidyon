import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useClassFeeStatus(institutionId?: string) {
    const { data: feeStatuses = [], isLoading, refetch } = useQuery({
        queryKey: ['institution-fee-status', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];
            
            const { data, error } = await supabase
                .from('student_fees')
                .select('*')
                .eq('institution_id', institutionId);
            
            if (error) {
                console.error('Error fetching fee status:', error);
                return [];
            }
            return data;
        },
        enabled: !!institutionId,
    });

    useEffect(() => {
        if (!institutionId) return;

        const channel = supabase.channel(`fee-status-${institutionId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'student_fees', 
                filter: `institution_id=eq.${institutionId}` 
            }, () => {
                refetch();
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [institutionId]);

    return { feeStatuses, isLoading, refetch };
}
