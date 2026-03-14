-- ============================================================================
-- PRODUCTION DATABASE DIAGNOSTIC QUERIES
-- ============================================================================
-- Run these queries in your Supabase SQL Editor to diagnose the issue
-- URL: https://supabase.com/dashboard/project/ccyqzcaghwaggtmkmigi/sql
-- ============================================================================

-- Faculty ID from the logs: 3c9d1eea-f883-4c45-822d-3722a6404a77

-- 1. Check all leave requests in the database
-- ============================================================================
SELECT 
    id,
    student_id,
    parent_id,
    assigned_class_teacher_id,
    status,
    from_date,
    to_date,
    created_at
FROM public.leave_requests
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if assigned_class_teacher_id is populated
-- ============================================================================
SELECT 
    COUNT(*) as total_leaves,
    COUNT(assigned_class_teacher_id) as leaves_with_teacher,
    COUNT(*) - COUNT(assigned_class_teacher_id) as leaves_without_teacher
FROM public.leave_requests;

-- 3. Check leaves for Daisy (the faculty from the logs)
-- ============================================================================
SELECT 
    lr.*,
    s.name as student_name,
    s.class_name,
    s.section
FROM public.leave_requests lr
LEFT JOIN public.students s ON s.id = lr.student_id
WHERE lr.assigned_class_teacher_id = '3c9d1eea-f883-4c45-822d-3722a6404a77'
ORDER BY lr.created_at DESC;

-- 4. Check if the get_student_class_teacher function exists
-- ============================================================================
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_student_class_teacher';

-- 5. Check if faculty_subjects table has assignment_type column
-- ============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'faculty_subjects'
ORDER BY ordinal_position;

-- 6. Check class teacher assignments
-- ============================================================================
SELECT 
    fs.id,
    fs.assignment_type,
    p.full_name as faculty_name,
    p.email as faculty_email,
    c.name as class_name,
    fs.section
FROM public.faculty_subjects fs
LEFT JOIN public.profiles p ON p.id = fs.faculty_profile_id
LEFT JOIN public.classes c ON c.id = fs.class_id
WHERE fs.assignment_type = 'class_teacher'
ORDER BY c.name, fs.section;

-- 7. Check Daisy's profile and assignments
-- ============================================================================
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.role,
    fs.assignment_type,
    c.name as class_name,
    fs.section
FROM public.profiles p
LEFT JOIN public.faculty_subjects fs ON fs.faculty_profile_id = p.id
LEFT JOIN public.classes c ON c.id = fs.class_id
WHERE p.id = '3c9d1eea-f883-4c45-822d-3722a6404a77';

-- 8. Check RLS policies on leave_requests
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'leave_requests';

-- 9. Test the trigger function manually
-- ============================================================================
-- Get a student ID to test with
SELECT id, name, class_name, section 
FROM public.students 
LIMIT 1;

-- Then test the function (replace with actual student ID)
-- SELECT public.get_student_class_teacher('STUDENT_ID_HERE');

-- 10. Check if trigger exists
-- ============================================================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'leave_requests';

-- ============================================================================
-- RECOMMENDED FIXES TO RUN
-- ============================================================================

-- If assignment_type column is missing, add it:
/*
ALTER TABLE public.faculty_subjects
ADD COLUMN IF NOT EXISTS assignment_type TEXT 
CHECK (assignment_type IN ('class_teacher', 'subject_staff'));

CREATE INDEX IF NOT EXISTS idx_faculty_subjects_assignment_type
ON public.faculty_subjects(assignment_type, class_id, section);
*/

-- If the function is missing or incorrect, create it:
/*
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
*/

-- Backfill existing leave requests:
/*
UPDATE public.leave_requests lr
SET assigned_class_teacher_id = public.get_student_class_teacher(lr.student_id)
WHERE lr.assigned_class_teacher_id IS NULL;
*/
