import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface AdmissionRecord {
  id: string;
  institution_id: string;
  admission_number?: string | null;
  academic_year?: string | null;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'enrolled' | 'cancelled';
  student_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  nationality?: string | null;
  religion?: string | null;
  caste?: string | null;
  mother_tongue?: string | null;
  aadhar_number?: string | null;
  image_url?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  applying_for_class?: string | null;
  applying_for_section?: string | null;
  previous_school_name?: string | null;
  previous_school_board?: string | null;
  previous_class?: string | null;
  previous_percentage?: number | null;
  transfer_certificate_url?: string | null;
  guardian_name?: string | null;
  guardian_relation?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  guardian_occupation?: string | null;
  guardian_address?: string | null;
  guardian2_name?: string | null;
  guardian2_relation?: string | null;
  guardian2_phone?: string | null;
  guardian2_email?: string | null;
  student_id?: string | null;
  parent_profile_id?: string | null;
  created_by?: string | null;
  reviewed_by?: string | null;
  review_notes?: string | null;
  rejection_reason?: string | null;
  enrolled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdmissionHistoryRecord {
  id: string;
  admission_id: string;
  action: string;
  old_status?: string | null;
  new_status?: string | null;
  notes?: string | null;
  changed_by?: string | null;
  created_at: string;
  changed_by_profile?: { full_name?: string; email?: string } | null;
}

export function useAdmissions(instId?: string | null) {
  const { user, institutionId: authInstId } = useAuth();
  const institutionId = instId || authInstId;

  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdmissions = useCallback(
    async (statusFilter?: string, searchQuery?: string) => {
      if (!institutionId) return [];
      try {
        setLoading(true);
        setError(null);
        let query = (supabase as any)
          .from('admissions')
          .select('*')
          .eq('institution_id', institutionId)
          .order('created_at', { ascending: false });

        if (statusFilter && statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        if (searchQuery && searchQuery.trim()) {
          const s = `%${searchQuery.trim()}%`;
          query = query.or(`student_name.ilike.${s},admission_number.ilike.${s},guardian_phone.ilike.${s}`);
        }

        const { data, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;
        setAdmissions(data || []);
        return data || [];
      } catch (err: any) {
        console.error('Error fetching admissions:', err);
        setError(err.message || 'Failed to fetch admissions');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [institutionId]
  );

  const getAdmissionById = useCallback(async (id: string) => {
    try {
      const { data: adm, error: admErr } = await (supabase as any)
        .from('admissions')
        .select('*')
        .eq('id', id)
        .single();
      if (admErr) throw admErr;

      const { data: rawHist } = await (supabase as any)
        .from('admission_history')
        .select('*')
        .eq('admission_id', id)
        .order('created_at', { ascending: false });

      return {
        admission: adm as AdmissionRecord,
        history: (rawHist || []) as AdmissionHistoryRecord[],
      };
    } catch (err: any) {
      console.error('Error fetching admission by id:', err);
      throw err;
    }
  }, []);

  const createAdmission = useCallback(
    async (payload: Partial<AdmissionRecord>) => {
      if (!institutionId) throw new Error('No institution context');
      const { data, error: insertErr } = await (supabase as any)
        .from('admissions')
        .insert({
          ...payload,
          institution_id: institutionId,
          status: payload.status || 'submitted',
          created_by: user?.id,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      return data as AdmissionRecord;
    },
    [institutionId, user?.id]
  );

  const updateAdmissionStatus = useCallback(
    async (id: string, newStatus: string, notes?: string) => {
      const { data: current, error: getErr } = await (supabase as any)
        .from('admissions')
        .select('status')
        .eq('id', id)
        .single();
      if (getErr) throw getErr;

      const updatePayload: Record<string, any> = {
        status: newStatus,
        reviewed_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (notes) {
        if (newStatus === 'rejected') {
          updatePayload.rejection_reason = notes;
        } else {
          updatePayload.review_notes = notes;
        }
      }

      const { data, error: updateErr } = await (supabase as any)
        .from('admissions')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      await (supabase as any).from('admission_history').insert({
        admission_id: id,
        action: 'status_change',
        old_status: current?.status,
        new_status: newStatus,
        notes: notes || null,
        changed_by: user?.id,
      });

      return data as AdmissionRecord;
    },
    [user?.id]
  );

  const checkDuplicates = useCallback(
    async (name: string, dob: string, phone: string) => {
      if (!institutionId || !name) return [];
      try {
        const { data, error: rpcErr } = await (supabase as any).rpc('check_admission_duplicates', {
          p_institution_id: institutionId,
          p_student_name: name.trim(),
          p_dob: dob || null,
          p_guardian_phone: phone ? phone.trim() : null,
        });
        if (rpcErr) {
          console.warn('Duplicate check RPC warning:', rpcErr);
          return [];
        }
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.warn('Duplicate check error:', err);
        return [];
      }
    },
    [institutionId]
  );

  const enrollAdmission = useCallback(
    async (admissionId: string, dryRun: boolean = false) => {
      const { data, error: rpcErr } = await (supabase as any).rpc('process_admission_enrollment', {
        p_admission_id: admissionId,
        p_dry_run: dryRun,
      });
      if (rpcErr) throw rpcErr;
      return data;
    },
    []
  );

  useEffect(() => {
    if (institutionId) {
      fetchAdmissions();
    }
  }, [institutionId, fetchAdmissions]);

  return {
    admissions,
    loading,
    error,
    refetch: fetchAdmissions,
    fetchAdmissions,
    getAdmissionById,
    createAdmission,
    updateAdmissionStatus,
    checkDuplicates,
    enrollAdmission,
  };
}
