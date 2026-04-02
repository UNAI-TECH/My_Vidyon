import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type FeePayment = Database['public']['Tables']['fee_payments']['Row'] & {
    students: { name: string } | null;
};

export function useAccountantTransactions(institutionId?: string) {
    const { data: transactions = [], isLoading, refetch } = useQuery({
        queryKey: ['accountant-transactions-all', institutionId],
        queryFn: async () => {
            if (!institutionId) return [];
            const { data, error } = await supabase
                .from('fee_payments')
                .select('*, students(name)')
                .eq('institution_id', institutionId)
                .order('payment_date', { ascending: false });
            
            if (error) {
                console.error('Error fetching transactions:', error);
                return [];
            }
            return data as unknown as FeePayment[];
        },
        enabled: !!institutionId,
    });

    useEffect(() => {
        if (!institutionId) return;

        const channel = supabase.channel(`transactions-page-${institutionId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'fee_payments', 
                filter: `institution_id=eq.${institutionId}` 
            }, () => {
                refetch();
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [institutionId]);

    return { transactions, isLoading, refetch };
}
