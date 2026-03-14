-- ============================================================================
-- LEAVE REQUESTS - Complete RLS and Query Solution
-- ============================================================================
-- This script provides proper data access for students, parents, and faculty
-- ============================================================================

-- First, ensure we have the necessary helper functions

-- ============================================================================
-- HELPER FUNCTION: Get current user's profile
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  institution_id text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, email, full_name, role, institution_id
  FROM public.profiles
  WHERE id = auth.uid();
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if user is parent of student
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_parent_of_student(parent_uuid uuid, student_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_student_relations
    WHERE parent_id = parent_uuid
    AND student_id = student_uuid
  );
$$;

-- ============================================================================
-- HELPER FUNCTION: Get student's assigned class teacher
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_student_class_teacher(student_uuid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT fs.faculty_profile_id
  FROM public.students s
  JOIN public.classes c ON c.name = s.class_name
  JOIN public.faculty_subjects fs ON fs.class_id = c.id AND fs.section = s.section
  WHERE s.id = student_uuid
    AND fs.assignment_type = 'class_teacher'
  LIMIT 1;
$$;

-- ============================================================================
-- DROP EXISTING RLS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "leave_requests_select_policy" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert_policy" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_update_policy" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_delete_policy" ON public.leave_requests;

-- Enable RLS on leave_requests table
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICY: SELECT (Read) Leave Requests
-- ============================================================================
-- Students can view their own leave requests
-- Parents can view leave requests for their children
-- Faculty can view leave requests assigned to them
-- Admins can view all leave requests

CREATE POLICY "leave_requests_select_policy"
ON public.leave_requests
FOR SELECT
USING (
  -- Students can view their own leave requests
  (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'student'
    )
  )
  OR
  -- Parents can view leave requests for their children
  (
    auth.uid() = parent_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'parent'
    )
    AND public.is_parent_of_student(auth.uid(), student_id)
  )
  OR
  -- Faculty can view leave requests assigned to them as class teacher
  (
    auth.uid() = assigned_class_teacher_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'faculty'
    )
  )
  OR
  -- Admins can view all leave requests
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- RLS POLICY: INSERT (Create) Leave Requests
-- ============================================================================
-- Parents can create leave requests for their children
-- Students can create leave requests for themselves
-- The assigned_class_teacher_id will be auto-populated via trigger

CREATE POLICY "leave_requests_insert_policy"
ON public.leave_requests
FOR INSERT
WITH CHECK (
  -- Parents can create leave requests for their children
  (
    auth.uid() = parent_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'parent'
    )
    AND public.is_parent_of_student(auth.uid(), student_id)
  )
  OR
  -- Students can create leave requests for themselves
  (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'student'
    )
  )
);

-- ============================================================================
-- RLS POLICY: UPDATE Leave Requests
-- ============================================================================
-- Faculty can update (approve/reject) leave requests assigned to them
-- Admins can update any leave request
-- Parents can update their own pending leave requests

CREATE POLICY "leave_requests_update_policy"
ON public.leave_requests
FOR UPDATE
USING (
  -- Faculty can update leave requests assigned to them
  (
    auth.uid() = assigned_class_teacher_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'faculty'
    )
  )
  OR
  -- Admins can update any leave request
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
  OR
  -- Parents can update their own pending leave requests
  (
    auth.uid() = parent_id
    AND status = 'Pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'parent'
    )
  )
);

-- ============================================================================
-- RLS POLICY: DELETE Leave Requests
-- ============================================================================
-- Only admins can delete leave requests

CREATE POLICY "leave_requests_delete_policy"
ON public.leave_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- TRIGGER: Auto-assign class teacher when leave request is created
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_class_teacher_to_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Automatically assign the student's class teacher
  NEW.assigned_class_teacher_id := public.get_student_class_teacher(NEW.student_id);
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_assign_class_teacher ON public.leave_requests;

-- Create trigger
CREATE TRIGGER trigger_assign_class_teacher
BEFORE INSERT ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.assign_class_teacher_to_leave();

-- ============================================================================
-- QUERY FUNCTIONS: Fetch leave requests by role
-- ============================================================================

-- ============================================================================
-- QUERY: Get leave requests for current STUDENT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_leave_requests_as_student()
RETURNS TABLE (
  id uuid,
  student_id uuid,
  parent_id uuid,
  from_date date,
  to_date date,
  reason text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  assigned_class_teacher_id uuid,
  student_name text,
  parent_name text,
  teacher_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    lr.id,
    lr.student_id,
    lr.parent_id,
    lr.from_date,
    lr.to_date,
    lr.reason,
    lr.status,
    lr.created_at,
    lr.updated_at,
    lr.assigned_class_teacher_id,
    sp.full_name AS student_name,
    pp.full_name AS parent_name,
    tp.full_name AS teacher_name
  FROM public.leave_requests lr
  LEFT JOIN public.profiles sp ON lr.student_id = sp.id
  LEFT JOIN public.profiles pp ON lr.parent_id = pp.id
  LEFT JOIN public.profiles tp ON lr.assigned_class_teacher_id = tp.id
  WHERE lr.student_id = auth.uid()
  ORDER BY lr.created_at DESC;
$$;

-- ============================================================================
-- QUERY: Get leave requests for current PARENT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_leave_requests_as_parent()
RETURNS TABLE (
  id uuid,
  student_id uuid,
  parent_id uuid,
  from_date date,
  to_date date,
  reason text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  assigned_class_teacher_id uuid,
  student_name text,
  parent_name text,
  teacher_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    lr.id,
    lr.student_id,
    lr.parent_id,
    lr.from_date,
    lr.to_date,
    lr.reason,
    lr.status,
    lr.created_at,
    lr.updated_at,
    lr.assigned_class_teacher_id,
    sp.full_name AS student_name,
    pp.full_name AS parent_name,
    tp.full_name AS teacher_name
  FROM public.leave_requests lr
  LEFT JOIN public.profiles sp ON lr.student_id = sp.id
  LEFT JOIN public.profiles pp ON lr.parent_id = pp.id
  LEFT JOIN public.profiles tp ON lr.assigned_class_teacher_id = tp.id
  WHERE lr.parent_id = auth.uid()
  ORDER BY lr.created_at DESC;
$$;

-- ============================================================================
-- QUERY: Get leave requests for current FACULTY (assigned to them)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_leave_requests_as_faculty(
  filter_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  parent_id uuid,
  from_date date,
  to_date date,
  reason text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  assigned_class_teacher_id uuid,
  student_name text,
  parent_name text,
  teacher_name text,
  student_image_url text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    lr.id,
    lr.student_id,
    lr.parent_id,
    lr.from_date,
    lr.to_date,
    lr.reason,
    lr.status,
    lr.created_at,
    lr.updated_at,
    lr.assigned_class_teacher_id,
    sp.full_name AS student_name,
    pp.full_name AS parent_name,
    tp.full_name AS teacher_name,
    sp.image_url AS student_image_url
  FROM public.leave_requests lr
  LEFT JOIN public.profiles sp ON lr.student_id = sp.id
  LEFT JOIN public.profiles pp ON lr.parent_id = pp.id
  LEFT JOIN public.profiles tp ON lr.assigned_class_teacher_id = tp.id
  WHERE lr.assigned_class_teacher_id = auth.uid()
    AND (filter_status IS NULL OR lr.status = filter_status)
  ORDER BY 
    CASE lr.status 
      WHEN 'Pending' THEN 1
      WHEN 'Approved' THEN 2
      WHEN 'Rejected' THEN 3
    END,
    lr.created_at DESC;
$$;

-- ============================================================================
-- QUERY: Get pending leave requests count for current FACULTY
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_pending_leave_count_for_faculty()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM public.leave_requests
  WHERE assigned_class_teacher_id = auth.uid()
    AND status = 'Pending';
$$;

-- ============================================================================
-- EXAMPLE USAGE IN APPLICATION
-- ============================================================================

/*
-- FOR STUDENTS (TypeScript/JavaScript):
const { data: myLeaves, error } = await supabase
  .rpc('get_my_leave_requests_as_student');

-- FOR PARENTS (TypeScript/JavaScript):
const { data: myChildrenLeaves, error } = await supabase
  .rpc('get_my_leave_requests_as_parent');

-- FOR FACULTY - All leave requests:
const { data: assignedLeaves, error } = await supabase
  .rpc('get_my_leave_requests_as_faculty');

-- FOR FACULTY - Only pending leave requests:
const { data: pendingLeaves, error } = await supabase
  .rpc('get_my_leave_requests_as_faculty', { filter_status: 'Pending' });

-- FOR FACULTY - Get pending count for badge:
const { data: pendingCount, error } = await supabase
  .rpc('get_pending_leave_count_for_faculty');

-- CREATE LEAVE REQUEST (Parent for their child):
const { data, error } = await supabase
  .from('leave_requests')
  .insert({
    student_id: selectedChildId,
    parent_id: currentUserId, // This should be auth.uid()
    from_date: '2026-02-10',
    to_date: '2026-02-12',
    reason: 'Family emergency',
    status: 'Pending'
    // assigned_class_teacher_id is auto-populated by trigger
  });

-- UPDATE LEAVE REQUEST (Faculty approving/rejecting):
const { data, error } = await supabase
  .from('leave_requests')
  .update({ 
    status: 'Approved',
    updated_at: new Date().toISOString()
  })
  .eq('id', leaveRequestId);
*/
