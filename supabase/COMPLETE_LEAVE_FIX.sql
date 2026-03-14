-- ============================================================
-- COMPLETE FIX: Leave Request Sync Issue
-- ============================================================
-- Run this entire file in Supabase SQL Editor
-- This fixes BOTH the RLS policies AND the class mapping issue

-- ============================================================
-- PART 1: Fix RLS Policies (Fixes 400 errors)
-- ============================================================

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Parents can create leave requests for their children" ON leave_requests;
DROP POLICY IF EXISTS "Parents can view their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Faculty can view leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Faculty can update leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Students cannot directly access leave_requests" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_select_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert_policy" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_update_policy" ON leave_requests;

-- Also drop the new policy names in case they exist from previous runs
DROP POLICY IF EXISTS "parents_insert_leave_requests" ON leave_requests;
DROP POLICY IF EXISTS "parents_select_leave_requests" ON leave_requests;
DROP POLICY IF EXISTS "faculty_select_assigned_leave_requests" ON leave_requests;
DROP POLICY IF EXISTS "faculty_update_assigned_leave_requests" ON leave_requests;

-- Create new minimal RLS policies
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

CREATE POLICY "faculty_select_assigned_leave_requests"
ON leave_requests FOR SELECT
TO authenticated
USING (
    assigned_class_teacher_id = auth.uid()
);

CREATE POLICY "faculty_update_assigned_leave_requests"
ON leave_requests FOR UPDATE
TO authenticated
USING (assigned_class_teacher_id = auth.uid())
WITH CHECK (assigned_class_teacher_id = auth.uid());

-- ============================================================
-- PART 2: Diagnose Class Mapping Issue
-- ============================================================

-- Check what students exist and their class names
SELECT 
    'Students Table' as source,
    class_name,
    COUNT(*) as count
FROM students
GROUP BY class_name
ORDER BY class_name;

-- Check what classes exist in classes table
SELECT 
    'Classes Table' as source,
    name as class_name,
    id
FROM classes
ORDER BY name;

-- ============================================================
-- PART 3: Fix Class Mapping (Choose appropriate solution)
-- ============================================================

-- OPTION A: Add missing classes to classes table
-- Uncomment and run if classes are missing:

/*
INSERT INTO classes (name, institution_id)
SELECT DISTINCT 
    s.class_name,
    (SELECT id FROM institutions LIMIT 1)
FROM students s
WHERE NOT EXISTS (
    SELECT 1 FROM classes c WHERE c.name = s.class_name
)
ON CONFLICT DO NOTHING;
*/

-- ============================================================
-- PART 4: Backfill Teacher IDs for Existing Leave Requests
-- ============================================================

UPDATE leave_requests lr
SET assigned_class_teacher_id = (
    SELECT fs.faculty_profile_id
    FROM students s
    JOIN classes c ON c.name = s.class_name
    JOIN faculty_subjects fs ON fs.class_id = c.id AND fs.section = s.section
    WHERE s.id = lr.student_id
      AND fs.assignment_type = 'class_teacher'
    LIMIT 1
)
WHERE lr.assigned_class_teacher_id IS NULL;

-- ============================================================
-- PART 5: Verification
-- ============================================================

-- Check RLS policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'leave_requests';

-- Check leave requests with teacher assignments
SELECT 
    COUNT(*) as total_leaves,
    COUNT(assigned_class_teacher_id) as leaves_with_teacher,
    COUNT(*) - COUNT(assigned_class_teacher_id) as leaves_without_teacher
FROM leave_requests;

-- Sample data
SELECT 
    lr.id,
    lr.status,
    lr.assigned_class_teacher_id,
    s.name as student_name,
    s.class_name,
    s.section,
    p.email as teacher_email
FROM leave_requests lr
JOIN students s ON s.id = lr.student_id
LEFT JOIN profiles p ON p.id = lr.assigned_class_teacher_id
LIMIT 5;
