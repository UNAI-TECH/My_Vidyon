import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface PromotionRequest {
  id: string;
  institution_id: string;
  from_year: string;
  to_year: string;
  status: 'pending' | 'approved' | 'rejected' | 'partially_applied' | 'applied';
  requested_at: string;
  approved_at?: string | null;
  notes?: string | null;
  request_type: 'institution' | 'class' | 'individual';
  class_name?: string | null;
  section?: string | null;
  items_count?: number;
  approved_count?: number;
  pending_count?: number;
}

export interface PromotionItem {
  id: string;
  request_id: string;
  student_id: string;
  from_class: string;
  from_section?: string | null;
  to_class: string;
  to_section?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  is_eligible: boolean;
  eligibility_reason?: string | null;
  rejection_reason?: string | null;
  approved_at?: string | null;
  applied_at?: string | null;
  student?: {
    id: string;
    name: string;
    roll_number?: string;
    class?: string;
    section?: string;
    attendance_pct?: number;
  };
}

export interface PromotionEligibilityRule {
  id: string;
  institution_id: string;
  class_name?: string | null;
  rule_type: string;
  rule_config: {
    min_attendance_pct?: number;
    min_marks_pct?: number;
    require_fee_clearance?: boolean;
    require_all_passed?: boolean;
  };
  is_active: boolean;
}

export interface PromotionHistoryRecord {
  id: string;
  institution_id: string;
  student_id: string;
  promotion_item_id?: string | null;
  action: string;
  from_class?: string | null;
  to_class?: string | null;
  from_section?: string | null;
  to_section?: string | null;
  academic_year?: string | null;
  reason?: string | null;
  performed_by?: string | null;
  created_at: string;
  student?: {
    name: string;
    roll_number?: string;
  };
}

export const CLASS_PROGRESSION: Record<string, string> = {
  'Pre-KG': 'LKG',
  'LKG': 'UKG',
  'UKG': 'Class 1',
  'Class 1': 'Class 2',
  'Class 2': 'Class 3',
  'Class 3': 'Class 4',
  'Class 4': 'Class 5',
  'Class 5': 'Class 6',
  'Class 6': 'Class 7',
  'Class 7': 'Class 8',
  'Class 8': 'Class 9',
  'Class 9': 'Class 10',
  'Class 10': 'Graduated / Higher Sec',
};

export function getNextClass(currentClass: string): string {
  return CLASS_PROGRESSION[currentClass] || `${currentClass} (Promoted)`;
}

export function usePromotions() {
  const { user, institutionId } = useAuth();
  const [requests, setRequests] = useState<PromotionRequest[]>([]);
  const [rules, setRules] = useState<PromotionEligibilityRule[]>([]);
  const [history, setHistory] = useState<PromotionHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Promotion Requests for the Institution
  const fetchRequests = useCallback(async () => {
    if (!institutionId) return [];
    try {
      setLoading(true);
      const { data, error: err } = await (supabase as any)
        .from('promotion_requests')
        .select('*, promotion_items(id, status, is_eligible)')
        .eq('institution_id', institutionId)
        .order('requested_at', { ascending: false });

      if (err) throw err;

      const mapped = (data || []).map((req: any) => {
        const items = req.promotion_items || [];
        const approvedCount = items.filter((i: any) => i.status === 'approved').length;
        const pendingCount = items.filter((i: any) => i.status === 'pending').length;
        return {
          ...req,
          items_count: items.length,
          approved_count: approvedCount,
          pending_count: pendingCount,
        };
      });

      setRequests(mapped);
      return mapped;
    } catch (e: any) {
      console.warn('Error fetching promotion requests:', e);
      setError(e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  // 2. Fetch Single Request with Student Items
  const getRequestDetails = async (requestId: string) => {
    try {
      const { data: request, error: reqErr } = await (supabase as any)
        .from('promotion_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (reqErr) throw reqErr;

      const { data: items, error: itemErr } = await (supabase as any)
        .from('promotion_items')
        .select('*, student:students(id, name, roll_number, class, section)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (itemErr) throw itemErr;

      return { request, items: items || [] };
    } catch (e: any) {
      console.warn('Error fetching request details:', e);
      throw e;
    }
  };

  // 3. Fetch Eligibility Rules
  const fetchRules = useCallback(async () => {
    if (!institutionId) return [];
    try {
      const { data, error: err } = await (supabase as any)
        .from('promotion_eligibility_rules')
        .select('*')
        .eq('institution_id', institutionId)
        .order('class_name', { ascending: true, nullsFirst: true });

      if (err) throw err;
      setRules(data || []);
      return data || [];
    } catch (e: any) {
      console.warn('Error fetching eligibility rules:', e);
      return [];
    }
  }, [institutionId]);

  // 4. Save Eligibility Rule
  const saveRule = async (rule: {
    id?: string;
    class_name?: string | null;
    rule_type: string;
    rule_config: Record<string, any>;
  }) => {
    if (!institutionId) throw new Error('No institution selected');
    try {
      if (rule.id) {
        const { error: err } = await (supabase as any)
          .from('promotion_eligibility_rules')
          .update({
            class_name: rule.class_name || null,
            rule_type: rule.rule_type,
            rule_config: rule.rule_config,
          })
          .eq('id', rule.id);
        if (err) throw err;
      } else {
        const { error: err } = await (supabase as any)
          .from('promotion_eligibility_rules')
          .insert({
            institution_id: institutionId,
            class_name: rule.class_name || null,
            rule_type: rule.rule_type,
            rule_config: rule.rule_config,
            is_active: true,
          });
        if (err) throw err;
      }
      await fetchRules();
    } catch (e: any) {
      console.warn('Error saving rule:', e);
      throw e;
    }
  };

  // 5. Fetch Promotion Audit History
  const fetchHistory = useCallback(async (studentId?: string) => {
    if (!institutionId) return [];
    try {
      let query = (supabase as any)
        .from('promotion_history')
        .select('*, student:students(name, roll_number)')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setHistory(data || []);
      return data || [];
    } catch (e: any) {
      console.warn('Error fetching promotion history:', e);
      return [];
    }
  }, [institutionId]);

  // 6. Create Promotion Batch Request
  const createPromotionRequest = async (params: {
    requestType: 'institution' | 'class' | 'individual';
    fromYear: string;
    toYear: string;
    className?: string;
    section?: string;
    studentIds?: string[];
    notes?: string;
  }) => {
    if (!institutionId) throw new Error('No institution selected');
    setLoading(true);
    try {
      // 1. Fetch Students to promote
      let studQuery = (supabase as any)
        .from('students')
        .select('id, name, class, section, roll_number')
        .eq('institution_id', institutionId);

      if (params.requestType === 'class' && params.className) {
        studQuery = studQuery.eq('class', params.className);
        if (params.section) studQuery = studQuery.eq('section', params.section);
      } else if (params.requestType === 'individual' && params.studentIds?.length) {
        studQuery = studQuery.in('id', params.studentIds);
      }

      const { data: students, error: sErr } = await studQuery;
      if (sErr) throw sErr;
      if (!students || students.length === 0) {
        throw new Error('No students found matching promotion criteria.');
      }

      // 2. Fetch Active Rules to evaluate eligibility
      const { data: activeRules } = await (supabase as any)
        .from('promotion_eligibility_rules')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('is_active', true);

      // 3. Insert promotion_requests record
      const { data: req, error: rErr } = await (supabase as any)
        .from('promotion_requests')
        .insert({
          institution_id: institutionId,
          from_year: params.fromYear,
          to_year: params.toYear,
          status: 'pending',
          request_type: params.requestType,
          class_name: params.className || null,
          section: params.section || null,
          requested_by: user?.id || null,
          notes: params.notes || null,
        })
        .select()
        .single();

      if (rErr) throw rErr;

      // 4. Map & evaluate each student into promotion_items
      const itemsToInsert = students.map((s: any) => {
        const fromClass = s.class || 'Unknown';
        const toClass = getNextClass(fromClass);
        const fromSection = s.section || null;

        // Check if there are specific rules for this class or general rule
        const applicableRule = (activeRules || []).find((r: any) => r.class_name === fromClass) ||
                               (activeRules || []).find((r: any) => !r.class_name);

        let isEligible = true;
        let eligibilityReason = 'Meets standard academic criteria';

        if (applicableRule) {
          const cfg = applicableRule.rule_config || {};
          if (cfg.min_attendance_pct && (s.attendance_pct ?? 100) < cfg.min_attendance_pct) {
            isEligible = false;
            eligibilityReason = `Attendance (${s.attendance_pct || 0}%) below minimum ${cfg.min_attendance_pct}%`;
          }
        }

        return {
          request_id: req.id,
          student_id: s.id,
          from_class: fromClass,
          from_section: fromSection,
          to_class: toClass,
          to_section: fromSection,
          status: 'pending',
          is_eligible: isEligible,
          eligibility_reason: eligibilityReason,
        };
      });

      const { error: itemErr } = await (supabase as any)
        .from('promotion_items')
        .insert(itemsToInsert);

      if (itemErr) throw itemErr;

      await fetchRequests();
      return req;
    } finally {
      setLoading(false);
    }
  };

  // 7. Update Single Item Status
  const updateItemStatus = async (
    itemId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string
  ) => {
    try {
      const { error: err } = await (supabase as any)
        .from('promotion_items')
        .update({
          status,
          rejection_reason: rejectionReason || null,
          approved_by: status === 'approved' ? user?.id : null,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
        })
        .eq('id', itemId);

      if (err) throw err;
      return true;
    } catch (e: any) {
      console.warn('Error updating promotion item:', e);
      throw e;
    }
  };

  // 8. Bulk Update Items in Request
  const bulkUpdateItems = async (
    requestId: string,
    status: 'approved' | 'rejected',
    onlyEligible = true
  ) => {
    try {
      let query = (supabase as any)
        .from('promotion_items')
        .update({
          status,
          approved_by: status === 'approved' ? user?.id : null,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
        })
        .eq('request_id', requestId)
        .eq('status', 'pending');

      if (onlyEligible && status === 'approved') {
        query = query.eq('is_eligible', true);
      }

      const { error: err } = await query;
      if (err) throw err;
      return true;
    } catch (e: any) {
      console.warn('Error bulk updating promotion items:', e);
      throw e;
    }
  };

  // 9. Apply Approved Promotions (Calls apply_promotion RPC)
  const applyPromotions = async (requestId: string) => {
    setLoading(true);
    try {
      // Fetch all approved items that haven't been applied yet
      const { data: approvedItems, error: fErr } = await (supabase as any)
        .from('promotion_items')
        .select('id')
        .eq('request_id', requestId)
        .eq('status', 'approved')
        .is('applied_at', null);

      if (fErr) throw fErr;
      if (!approvedItems || approvedItems.length === 0) {
        throw new Error('No approved unapplied items found to execute.');
      }

      let appliedCount = 0;
      const errors: string[] = [];

      for (const item of approvedItems) {
        try {
          const { data: rpcRes, error: rpcErr } = await (supabase as any).rpc(
            'apply_promotion',
            { p_promotion_item_id: item.id }
          );
          if (rpcErr) throw rpcErr;
          appliedCount++;
        } catch (err: any) {
          errors.push(`Item ${item.id}: ${err.message}`);
        }
      }

      // Check if all items in request are now applied
      const { data: remaining } = await (supabase as any)
        .from('promotion_items')
        .select('id')
        .eq('request_id', requestId)
        .eq('status', 'pending');

      const isFullyDone = !remaining || remaining.length === 0;

      await (supabase as any)
        .from('promotion_requests')
        .update({
          status: isFullyDone ? 'applied' : 'partially_applied',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      await fetchRequests();
      return { appliedCount, total: approvedItems.length, errors };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (institutionId) {
      fetchRequests();
      fetchRules();
      fetchHistory();
    }
  }, [institutionId, fetchRequests, fetchRules, fetchHistory]);

  return {
    requests,
    rules,
    history,
    loading,
    error,
    fetchRequests,
    getRequestDetails,
    fetchRules,
    saveRule,
    fetchHistory,
    createPromotionRequest,
    updateItemStatus,
    bulkUpdateItems,
    applyPromotions,
  };
}
