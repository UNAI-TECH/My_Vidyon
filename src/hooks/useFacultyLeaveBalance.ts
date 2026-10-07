import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface LeaveType {
  id: string;
  institution_id: string;
  name: string;
  code?: string | null;
  annual_quota: number;
  carry_forward: boolean;
  max_carry_forward: number;
  is_active: boolean;
  created_at?: string;
}

export interface FacultyLeaveBalance {
  id: string;
  faculty_profile_id: string;
  institution_id: string;
  leave_type_id: string;
  academic_year: string;
  total_allowed: number;
  used: number;
  carried_forward: number;
  remaining?: number;
  leave_type?: LeaveType;
}

export function useFacultyLeaveBalance(facultyProfileId?: string, academicYear?: string) {
  const { institutionId: currentInstId } = useAuth();
  const currentYear = academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  const [balances, setBalances] = useState<FacultyLeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaveTypes = useCallback(async () => {
    if (!currentInstId) return [];
    try {
      const { data, error: err } = await (supabase as any)
        .from('leave_types')
        .select('*')
        .eq('institution_id', currentInstId)
        .order('name', { ascending: true });

      if (err) throw err;
      setLeaveTypes(data || []);
      return data || [];
    } catch (e: any) {
      console.warn('Error fetching leave types:', e);
      return [];
    }
  }, [currentInstId]);

  const fetchBalances = useCallback(async () => {
    if (!facultyProfileId || !currentInstId) return [];
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await (supabase as any)
        .from('faculty_leave_balances')
        .select('*, leave_type:leave_types(*)')
        .eq('faculty_profile_id', facultyProfileId)
        .eq('academic_year', currentYear);

      if (err) throw err;

      const computed: FacultyLeaveBalance[] = (data || []).map((b: any) => ({
        ...b,
        remaining: Math.max(0, (b.total_allowed || 0) + (b.carried_forward || 0) - (b.used || 0)),
      }));

      setBalances(computed);
      return computed;
    } catch (e: any) {
      console.warn('Error fetching faculty leave balances:', e);
      setError(e.message || 'Failed to fetch balances');
      return [];
    } finally {
      setLoading(false);
    }
  }, [facultyProfileId, currentInstId, currentYear]);

  const updateFacultyStatus = useCallback(
    async (profileId: string, status: 'active' | 'on_leave' | 'inactive') => {
      const { data, error: err } = await (supabase as any)
        .from('profiles')
        .update({ faculty_status: status })
        .eq('id', profileId)
        .select()
        .single();

      if (err) throw err;
      return data;
    },
    []
  );

  const saveLeaveType = useCallback(
    async (type: Partial<LeaveType>) => {
      if (!currentInstId) throw new Error('No institution context');

      if (type.id) {
        const { data, error: err } = await (supabase as any)
          .from('leave_types')
          .update({
            name: type.name,
            code: type.code,
            annual_quota: type.annual_quota,
            carry_forward: type.carry_forward,
            max_carry_forward: type.max_carry_forward,
            is_active: type.is_active,
          })
          .eq('id', type.id)
          .select()
          .single();
        if (err) throw err;
        await fetchLeaveTypes();
        return data;
      } else {
        const { data, error: err } = await (supabase as any)
          .from('leave_types')
          .insert({
            ...type,
            institution_id: currentInstId,
          })
          .select()
          .single();
        if (err) throw err;
        await fetchLeaveTypes();
        return data;
      }
    },
    [currentInstId, fetchLeaveTypes]
  );

  const deleteLeaveType = useCallback(
    async (typeId: string) => {
      const { error: err } = await (supabase as any).from('leave_types').delete().eq('id', typeId);
      if (err) throw err;
      await fetchLeaveTypes();
    },
    [fetchLeaveTypes]
  );

  useEffect(() => {
    fetchLeaveTypes();
    if (facultyProfileId) {
      fetchBalances();
    }
  }, [fetchLeaveTypes, fetchBalances, facultyProfileId]);

  return {
    balances,
    leaveTypes,
    loading,
    error,
    refetchBalances: fetchBalances,
    refetchLeaveTypes: fetchLeaveTypes,
    updateFacultyStatus,
    saveLeaveType,
    deleteLeaveType,
  };
}
