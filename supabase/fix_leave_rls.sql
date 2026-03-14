-- Fix RLS policies for leave_requests to allow assigned_class_teacher_id column

-- Drop all existing policies
DROP POLICY IF EXISTS "Parents can create leave requests for their children" ON leave_requests;
DROP POLICY IF EXISTS "Parents can view their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Faculty can view leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Faculty can update leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Students cannot directly access leave_requests" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_select_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_update_policy" ON leave_requests;

-- Re-create policies with proper permissions

-- 1. Parents can INSERT leave requests for their children (including assigned_class_teacher_id)
CREATE POLICY "parents_insert_leave_requests"
ON leave_requests FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM parents p
        WHERE p.profile_id = auth.uid()
        AND p.id = parent_id
    )
);

-- 2. Parents can SELECT their own leave requests
CREATE POLICY "parents_select_leave_requests"
ON leave_requests FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM parents p
        WHERE p.profile_id = auth.uid()
        AND p.id = parent_id
    )
);

-- 3. Faculty can SELECT leave requests assigned to them
CREATE POLICY "faculty_select_assigned_leave_requests"
ON leave_requests FOR SELECT
TO authenticated
USING (
    assigned_class_teacher_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM faculty_subjects fs
        JOIN students s ON s.class_name = (SELECT name FROM classes WHERE id = fs.class_id)
            AND s.section = fs.section
        WHERE fs.faculty_profile_id = auth.uid()
        AND fs.assignment_type = 'class_teacher'
        AND s.id = leave_requests.student_id
    )
);

-- 4. Faculty can UPDATE leave requests (approve/reject)
CREATE POLICY "faculty_update_assigned_leave_requests"
ON leave_requests FOR UPDATE
TO authenticated
USING (
    assigned_class_teacher_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM faculty_subjects fs
        JOIN students s ON s.class_name = (SELECT name FROM classes WHERE id = fs.class_id)
            AND s.section = fs.section
        WHERE fs.faculty_profile_id = auth.uid()
        AND fs.assignment_type = 'class_teacher'
        AND s.id = leave_requests.student_id
    )
)
WITH CHECK (
    assigned_class_teacher_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM faculty_subjects fs
        JOIN students s ON s.class_name = (SELECT name FROM classes WHERE id = fs.class_id)
            AND s.section = fs.section
        WHERE fs.faculty_profile_id = auth.uid()
        AND fs.assignment_type = 'class_teacher'
        AND s.id = leave_requests.student_id
    )
);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'leave_requests';
