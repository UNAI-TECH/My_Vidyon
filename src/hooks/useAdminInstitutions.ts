import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Institution {
    id: string;
    institution_id: string;
    name: string;
    type: string;
    status: string;
    city: string | null;
    state: string | null;
    logo_url: string | null;
    studentsCount: number;
    staffCount: number;
}

export function useAdminInstitutions() {
    const queryClient = useQueryClient();

    const { data: institutions = [], isLoading } = useQuery({
        queryKey: ['admin-institutions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('institutions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch counts for each institution
            const institutionsWithCounts = await Promise.all(
                (data || []).map(async (inst: any) => {
                    // Get students count
                    const { count: studentsCount } = await supabase
                        .from('students')
                        .select('id', { count: 'exact', head: true })
                        .eq('institution_id', inst.institution_id);

                    // Get staff count from profiles
                    const { count: staffCount } = await supabase
                        .from('profiles')
                        .select('id', { count: 'exact', head: true })
                        .eq('institution_id', inst.institution_id)
                        .eq('role', 'faculty');

                    return {
                        ...inst,
                        studentsCount: studentsCount || 0,
                        staffCount: staffCount || 0,
                    };
                })
            );

            return institutionsWithCounts as Institution[];
        },
    });

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const { error } = await (supabase
            .from('institutions') as any)
            .update({ status: newStatus })
            .eq('id', id);

        if (!error) {
            queryClient.invalidateQueries({ queryKey: ['admin-institutions'] });
        }
        return { error };
    };

    const deleteInstitution = async (id: string) => {
        const { error } = await (supabase
            .from('institutions') as any)
            .update({ status: 'deleted' })
            .eq('id', id);

        if (!error) {
            queryClient.invalidateQueries({ queryKey: ['admin-institutions'] });
        }
        return { error };
    };

    return {
        institutions,
        isLoading,
        toggleStatus,
        deleteInstitution,
    };
}
