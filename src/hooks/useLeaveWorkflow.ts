import { supabase } from '../lib/supabase';

/**
 * useLeaveWorkflow
 * 
 * Implements the hierarchical approval chain:
 * Parent/Staff Request -> Faculty Review -> Institution Approval
 */
export function useLeaveWorkflow() {
  const requestLeave = async (studentId: string, parentId: string, fromDate: string, toDate: string, reason: string) => {
    return await supabase
      .from('leave_requests')
      // @ts-ignore: bypass 'never' type inference
      .insert({
        student_id: studentId,
        parent_id: parentId,
        from_date: fromDate,
        to_date: toDate,
        reason,
        status: 'pending'
      });
  };

  const recommendLeave = async (requestId: string, comments: string) => {
    return await supabase
      .from('leave_requests')
      // @ts-ignore: bypass 'never' type inference
      // Note: 'recommendation' doesn't exist in schema anymore, so we just update status
      .update({ status: 'recommended' })
      .eq('id', requestId);
  };

  const finalizeLeave = async (requestId: string, approved: boolean, principalComments: string) => {
    return await supabase
      .from('leave_requests')
      // @ts-ignore: bypass 'never' type inference
      .update({ 
        status: approved ? 'approved' : 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);
  };

  return { requestLeave, recommendLeave, finalizeLeave };
}
