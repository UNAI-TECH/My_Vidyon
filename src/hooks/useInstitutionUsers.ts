import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';

export function useInstitutionUsers(institutionId: string | null) {
  const queryClient = useQueryClient();

  const { data: students = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ['institution-students', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('*, parents:parent_id(full_name, email, phone)')
        .eq('institution_id', institutionId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!institutionId,
  });

  const { data: staff = [], isLoading: isStaffLoading } = useQuery({
    queryKey: ['institution-staff', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('institution_id', institutionId)
        .order('full_name');
      if (error) throw error;
      const targetRoles = ['faculty', 'admin', 'teacher', 'accountant', 'canteen_manager', 'driver'];
      return (data || []).filter((p: any) => targetRoles.includes(p.role));
    },
    enabled: !!institutionId,
  });

  const { data: parents = [], isLoading: isParentsLoading } = useQuery({
    queryKey: ['institution-parents', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .eq('institution_id', institutionId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!institutionId,
  });

  useEffect(() => {
    if (!institutionId) return;

    const studentsSub = supabase
      .channel('students-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        queryClient.invalidateQueries({ queryKey: ['institution-students'] });
      })
      .subscribe();

    const profilesSub = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['institution-staff'] });
      })
      .subscribe();

    const parentsSub = supabase
      .channel('parents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parents' }, () => {
        queryClient.invalidateQueries({ queryKey: ['institution-parents'] });
      })
      .subscribe();

    return () => {
      studentsSub.unsubscribe();
      profilesSub.unsubscribe();
      parentsSub.unsubscribe();
    };
  }, [institutionId, queryClient]);

  const toggleUserStatus = async (id: string, type: 'student' | 'staff' | 'parent', currentStatus: boolean) => {
    const action = currentStatus ? 'disable_user_access' : 'enable_user_access';
    try {
      const { data, error } = await (supabase.rpc as any)(action, {
        user_id: id,
        user_type: type
      });
      if (error) throw error;
      
      // Invalidate queries
      if (type === 'student') queryClient.invalidateQueries({ queryKey: ['institution-students'] });
      if (type === 'staff') queryClient.invalidateQueries({ queryKey: ['institution-staff'] });
      if (type === 'parent') queryClient.invalidateQueries({ queryKey: ['institution-parents'] });
      
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err };
    }
  };

  const updateUser = async (id: string, type: 'student' | 'staff' | 'parent', updates: any) => {
    try {
      const table = type === 'student' ? 'students' : (type === 'parent' ? 'parents' : 'profiles');
      // If updating a student and parent fields are provided
      if (type === 'student' && updates.parent_id) {
        // We only update the student's parent_id link in the students table
        // If the user also changed parent_name/phone, we should technically update the parent's profile
        // but for now let's just ensure the link is updated.
        const { parent_name, parent_phone, parent_email, ...studentUpdates } = updates;
        
        const { error: studentError } = await (supabase
          .from('students' as any) as any)
          .update(studentUpdates as any)
          .eq('id', id);
        
        if (studentError) throw studentError;

        // Optionally update the parent's profile if name/phone were manually changed
        if (parent_name || parent_phone) {
          await (supabase
            .from('profiles' as any) as any)
            .update({ 
              full_name: parent_name, 
              phone: parent_phone 
            } as any)
            .eq('id', updates.parent_id);
        }
      } else {
        const { error } = await (supabase
          .from(table as any) as any)
          .update(updates as any)
          .eq('id', id);

        if (error) throw error;
      }

      // Invalidate queries
      if (type === 'student') queryClient.invalidateQueries({ queryKey: ['institution-students'] });
      if (type === 'staff') queryClient.invalidateQueries({ queryKey: ['institution-staff'] });
      if (type === 'parent') queryClient.invalidateQueries({ queryKey: ['institution-parents'] });

      return { success: true };
    } catch (err) {
      console.error('Update user error:', err);
      return { success: false, error: err };
    }
  };

  return {
    students,
    staff,
    parents,
    isLoading: isStudentsLoading || isStaffLoading || isParentsLoading,
    toggleUserStatus,
    updateUser
  };
}
