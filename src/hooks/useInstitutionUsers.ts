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
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        image_url: s.image_url || s.profile_image_url || s.avatar_url || null,
      }));
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
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      const targetRoles = ['faculty', 'admin', 'teacher', 'accountant', 'canteen_manager', 'driver'];
      return (data || []).filter((p: any) => targetRoles.includes(p.role)).map((p: any) => ({
        ...p,
        image_url: p.image_url || p.profile_image_url || p.avatar_url || null,
      }));
    },
    enabled: !!institutionId,
  });

  const { data: parents = [], isLoading: isParentsLoading } = useQuery({
    queryKey: ['institution-parents', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from('parents')
        .select('*, profiles:profile_id(id, image_url, profile_image_url, avatar_url, full_name, email)')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        image_url: p.image_url || p.profiles?.image_url || p.profiles?.profile_image_url || p.profiles?.avatar_url || null,
      }));
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
      
      // Invalidate and refetch queries immediately
      const keys = [];
      if (type === 'student') keys.push(['institution-students']);
      if (type === 'staff') keys.push(['institution-staff']);
      if (type === 'parent') keys.push(['institution-parents']);
      
      for (const key of keys) {
        await queryClient.refetchQueries({ queryKey: key, exact: false });
      }
      
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err };
    }
  };

  const deleteUser = async (id: string, type: 'student' | 'staff' | 'parent') => {
    try {
      console.log(`[DELETE_ATTEMPT] Starting for ID: ${id}, Type: ${type}`);
      const { data, error } = await (supabase.rpc as any)('delete_user_completely', {
        user_id: id,
        user_type: type
      });
      
      console.log(`[DELETE_RESPONSE] Data:`, data);
      if (error) {
        console.error(`[DELETE_RPC_ERROR]`, error);
        throw error;
      }
      
      if (data && data.success === false) {
        console.error(`[DELETE_BUSINESS_ERROR]`, data.message, data.detail);
        throw new Error(data.message + (data.detail ? ': ' + data.detail : ''));
      }
      
      console.log(`[DELETE_SUCCESS] User removed. Invalidating queries...`);
      
      // Invalidate queries
      if (type === 'student') queryClient.invalidateQueries({ queryKey: ['institution-students'] });
      if (type === 'staff') queryClient.invalidateQueries({ queryKey: ['institution-staff'] });
      if (type === 'parent') queryClient.invalidateQueries({ queryKey: ['institution-parents'] });
      
      return { success: true };
    } catch (err) {
      console.error('Delete user error:', err);
      return { success: false, error: err };
    }
  };

  const updateUser = async (id: string, type: 'student' | 'staff' | 'parent', updates: any) => {
    try {
      // 1. If an avatar/image is being updated, call update_user_avatar RPC (SECURITY DEFINER)
      if (updates.image_url) {
        try {
          const { error: rpcErr } = await (supabase.rpc as any)('update_user_avatar', {
            p_user_id: id,
            p_user_type: type,
            p_image_url: updates.image_url,
          });
          if (rpcErr) {
            console.log('[update_user_avatar RPC note]:', rpcErr.message);
          }
        } catch (rpcEx) {
          console.log('[update_user_avatar RPC exception]:', rpcEx);
        }
      }

      // 2. Direct table updates (for all fields: name, phone, dob, dept, etc. plus fallback for image)
      if (type === 'parent') {
        const parentName = updates.name || updates.full_name;
        const parentPhone = updates.phone;
        const imageUrl = updates.image_url;

        // Update parents table
        const parentUpdates: any = {};
        if (parentName) parentUpdates.name = parentName;
        if (parentPhone !== undefined) parentUpdates.phone = parentPhone;
        if (imageUrl) parentUpdates.image_url = imageUrl;

        let profileId = updates.profile_id;

        if (Object.keys(parentUpdates).length > 0) {
          const { data: parentData, error: parentError } = await (supabase
            .from('parents' as any) as any)
            .update(parentUpdates)
            .eq('id', id)
            .select('profile_id')
            .maybeSingle();

          if (parentError) throw parentError;
          if (parentData?.profile_id) {
            profileId = parentData.profile_id;
          }
        }

        // Also update parent's profile record in profiles table
        if (profileId) {
          const profileUpdates: any = {};
          if (parentName) profileUpdates.full_name = parentName;
          if (parentPhone !== undefined) profileUpdates.phone = parentPhone;
          if (imageUrl) {
            profileUpdates.image_url = imageUrl;
            profileUpdates.profile_image_url = imageUrl;
            profileUpdates.avatar_url = imageUrl;
          }

          if (Object.keys(profileUpdates).length > 0) {
            const { error: profError } = await (supabase
              .from('profiles' as any) as any)
              .update(profileUpdates)
              .eq('id', profileId);

            if (profError) console.error('[Parent Profile Update Error]:', profError);
          }
        }
      } else if (type === 'student') {
        const { parent_name, parent_phone, parent_email, ...studentUpdates } = updates;
        const studentPayload: any = {};
        if (studentUpdates.name) studentPayload.name = studentUpdates.name;
        if (studentUpdates.phone !== undefined) studentPayload.phone = studentUpdates.phone;
        if (studentUpdates.dob) studentPayload.dob = studentUpdates.dob;
        if (studentUpdates.parent_id !== undefined) studentPayload.parent_id = studentUpdates.parent_id;
        if (studentUpdates.image_url) studentPayload.image_url = studentUpdates.image_url;

        const { data: studentData, error: studentError } = await (supabase
          .from('students' as any) as any)
          .update(studentPayload)
          .eq('id', id)
          .select('user_id, profile_id')
          .maybeSingle();

        if (studentError) throw studentError;

        // If student has a profile and image_url or name changed, sync profile too
        const studentProfileId = studentData?.profile_id || studentData?.user_id;
        if (studentProfileId) {
          const profUpdates: any = {};
          if (studentPayload.name) profUpdates.full_name = studentPayload.name;
          if (studentPayload.phone !== undefined) profUpdates.phone = studentPayload.phone;
          if (studentPayload.image_url) {
            profUpdates.image_url = studentPayload.image_url;
            profUpdates.profile_image_url = studentPayload.image_url;
            profUpdates.avatar_url = studentPayload.image_url;
          }
          if (Object.keys(profUpdates).length > 0) {
            await (supabase.from('profiles' as any) as any).update(profUpdates).eq('id', studentProfileId);
          }
        }

        // Optionally update the parent's profile if name/phone were manually changed
        if (updates.parent_id && (parent_name || parent_phone)) {
          await (supabase
            .from('profiles' as any) as any)
            .update({ 
              full_name: parent_name, 
              phone: parent_phone 
            } as any)
            .eq('id', updates.parent_id);
        }
      } else {
        // Staff
        const profileUpdates: any = {};
        if (updates.full_name) profileUpdates.full_name = updates.full_name;
        if (updates.name && !profileUpdates.full_name) profileUpdates.full_name = updates.name;
        if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
        if (updates.department !== undefined) profileUpdates.department = updates.department;
        if (updates.image_url) {
          profileUpdates.image_url = updates.image_url;
          profileUpdates.profile_image_url = updates.image_url;
          profileUpdates.avatar_url = updates.image_url;
        }

        const { error } = await (supabase
          .from('profiles' as any) as any)
          .update(profileUpdates)
          .eq('id', id);

        if (error) throw error;
      }

      // Actively refetch queries so UI updates immediately
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['institution-students'], exact: false }),
        queryClient.refetchQueries({ queryKey: ['institution-staff'], exact: false }),
        queryClient.refetchQueries({ queryKey: ['institution-parents'], exact: false }),
      ]);

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
    deleteUser,
    updateUser
  };
}
