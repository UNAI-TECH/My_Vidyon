-- ============================================================================
-- INSPECTION SCRIPT: Check Current Database State
-- ============================================================================
-- Run this script to inspect the current state of your database
-- and identify any issues with the leave request routing
-- ============================================================================

-- 1. Check if faculty_subjects table has assignment_type column
-- ============================================================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'faculty_subjects'
ORDER BY ordinal_position;

-- 2. Check current faculty_subjects data
-- ============================================================================
SELECT 
    fs.id,
    fs.assignment_type,
    p.full_name as faculty_name,
    p.role as faculty_role,
    c.name as class_name,
    fs.section,
    s.name as subject_name
FROM public.faculty_subjects fs
LEFT JOIN public.profiles p ON p.id = fs.faculty_profile_id
LEFT JOIN public.classes c ON c.id = fs.class_id
LEFT JOIN public.subjects s ON s.id = fs.subject_id
ORDER BY c.name, fs.section, fs.assignment_type;

-- 3. Check students and their classes
-- ============================================================================
SELECT 
    s.id,
    s.name,
    s.class_name,
    s.section,
    c.id as class_id
FROM public.students s
LEFT JOIN public.classes c ON c.name = s.class_name
ORDER BY s.class_name, s.section, s.name
LIMIT 20;

-- 4. Check leave_requests table structure
-- ============================================================================
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'leave_requests'
ORDER BY ordinal_position;

-- 5. Check existing leave requests
-- ============================================================================
SELECT 
    lr.id,
    lr.student_id,
    s.name as student_name,
    s.class_name,
    s.section,
    lr.assigned_class_teacher_id,
    p.full_name as assigned_teacher_name,
    lr.status,
    lr.from_date,
    lr.to_date,
    lr.created_at
FROM public.leave_requests lr
LEFT JOIN public.students s ON s.id = lr.student_id
LEFT JOIN public.profiles p ON p.id = lr.assigned_class_teacher_id
ORDER BY lr.created_at DESC
LIMIT 20;

-- 6. Check if trigger exists
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

-- 7. Check if helper function exists
-- ============================================================================
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_student_class_teacher', 'assign_class_teacher_to_leave');

-- 8. Test the function with actual data (if students exist)
-- ============================================================================
-- This will show what class teacher would be assigned for each student
SELECT 
    s.id as student_id,
    s.name as student_name,
    s.class_name,
    s.section,
    public.get_student_class_teacher(s.id) as resolved_teacher_id,
    p.full_name as resolved_teacher_name
FROM public.students s
LEFT JOIN public.profiles p ON p.id = public.get_student_class_teacher(s.id)
LIMIT 10;

-- 9. Identify students without class teachers
-- ============================================================================
SELECT 
    s.id,
    s.name,
    s.class_name,
    s.section,
    'No class teacher assigned' as issue
FROM public.students s
WHERE public.get_student_class_teacher(s.id) IS NULL
LIMIT 20;

-- 10. Check RLS policies on leave_requests
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'leave_requests';
