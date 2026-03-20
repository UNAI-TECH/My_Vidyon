import { supabase } from '../lib/supabase';

export interface LeaveRequest {
  id: string;
  student_id: string;
  parent_id?: string;
  from_date: string;
  to_date: string;
  reason: string;
  leave_type?: string;
  status: 'pending' | 'approved' | 'rejected' | 'recommended';
  assigned_class_teacher_id?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * useLeaveWorkflow
 *
 * Full leave approval lifecycle:
 *  Student → Creates request (pending)
 *  Faculty → Recommends or directly approves/rejects
 *  Institution → Final approval
 *
 * DB trigger `trg_leave_request_notification` auto-creates notifications
 * in the `notifications` table on INSERT and status UPDATE.
 */
export function useLeaveWorkflow() {
  /**
   * Student: create a new leave request.
   * Validates that dates don't overlap with existing approved leaves.
   */
  const createLeave = async (params: {
    studentId: string;
    parentId?: string;
    fromDate: string;
    toDate: string;
    reason: string;
    leaveType?: string;
  }) => {
    const { studentId, parentId, fromDate, toDate, reason, leaveType } = params;

    // 1. Fetch student info to get class_name and section
    const { data: student } = await supabase
      .from('students')
      .select('institution_id, class_name, section')
      .eq('id', studentId)
      .single();

    if (!student) return { error: { message: 'Student not found' } };

    // 2. Find the class teacher for this class/section
    // Query classes first to get class_id
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .eq('institution_id', student.institution_id)
      .eq('name', student.class_name)
      .eq('section', student.section || 'A')
      .single();

    let classTeacherId = null;
    if (classData) {
      const { data: teacherData } = await (supabase
        .from('faculty_subjects') as any)
        .select('faculty_profile_id')
        .eq('class_id', classData.id)
        .eq('assignment_type', 'class_teacher')
        .limit(1)
        .single();
      
      if (teacherData) classTeacherId = teacherData.faculty_profile_id;
    }

    // Check for overlapping approved leaves
    const { data: overlap } = await (supabase
      .from('leave_requests') as any)
      .select('id')
      .eq('student_id', studentId)
      .eq('status', 'approved')
      .filter('from_date', 'lte', toDate)
      .filter('to_date', 'gte', fromDate)
      .limit(1);

    if (overlap && overlap.length > 0) {
      return { error: { message: 'An approved leave already exists for the selected dates.' } };
    }

    return await (supabase
      .from('leave_requests') as any)
      .insert({
        student_id: studentId,
        parent_id: parentId || null,
        from_date: fromDate,
        to_date: toDate,
        reason,
        leave_type: leaveType || 'General',
        status: 'pending',
        assigned_class_teacher_id: classTeacherId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
  };

  /**
   * Faculty: recommend a leave (sets status to 'recommended').
   * The DB trigger will notify the student.
   */
  const recommendLeave = async (requestId: string, _comments?: string) => {
    return await (supabase
      .from('leave_requests') as any)
      .update({ status: 'recommended', updated_at: new Date().toISOString() })
      .eq('id', requestId);
  };

  /**
   * Faculty / Institution: approve or reject a leave.
   * The DB trigger automatically notifies the student and parent.
   */
  const finalizeLeave = async (requestId: string, approved: boolean, _comments?: string) => {
    return await (supabase
      .from('leave_requests') as any)
      .update({
        status: approved ? 'approved' : 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);
  };

  /**
   * Fetch leave history for a specific student.
   */
  const fetchStudentLeaves = async (studentId: string): Promise<LeaveRequest[]> => {
    const { data, error } = await (supabase
      .from('leave_requests') as any)
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching student leaves:', error);
      return [];
    }
    return data || [];
  };

  /**
   * Fetch pending leaves for a faculty's class.
   */
  const fetchPendingLeaves = async (facultyId: string): Promise<LeaveRequest[]> => {
    const { data, error } = await (supabase
      .from('leave_requests') as any)
      .select('*, students:student_id(name, register_number, class_name, section)')
      .eq('assigned_class_teacher_id', facultyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending leaves:', error);
      return [];
    }
    return data || [];
  };

  /**
   * Fetch ALL leave requests institution-wide (for admin view).
   */
  const fetchAllLeaves = async (filters?: {
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<LeaveRequest[]> => {
    let query = (supabase
      .from('leave_requests') as any)
      .select('*, students:student_id(name, register_number, class_name, section)')
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.fromDate) {
      query = query.gte('from_date', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('to_date', filters.toDate);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching all leaves:', error);
      return [];
    }
    return data || [];
  };

  // Keep old API names for backward compatibility
  const requestLeave = createLeave;

  return {
    // Mutations
    createLeave,
    requestLeave,     // backward compat alias
    recommendLeave,
    finalizeLeave,
    // Queries
    fetchStudentLeaves,
    fetchPendingLeaves,
    fetchAllLeaves,
  };
}
