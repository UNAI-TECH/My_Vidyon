-- ============================================================================
-- PRIORITY DIAGNOSTIC QUERIES - RUN THESE NEXT
-- ============================================================================
-- The trigger exists, now we need to check if the data is populated correctly
-- ============================================================================

-- QUERY 1: Check if assigned_class_teacher_id is populated
-- ============================================================================
-- This is the most critical query - if this is NULL, that's the problem
SELECT 
    COUNT(*) as total_leaves,
    COUNT(assigned_class_teacher_id) as leaves_with_teacher,
    COUNT(*) - COUNT(assigned_class_teacher_id) as leaves_without_teacher
FROM public.leave_requests;

-- QUERY 2: Check actual leave request data
-- ============================================================================
SELECT 
    id,
    student_id,
    assigned_class_teacher_id,
    status,
    from_date,
    to_date,
    created_at
FROM public.leave_requests
ORDER BY created_at DESC
LIMIT 5;

-- QUERY 3: Check if faculty_subjects has assignment_type column
-- ============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'faculty_subjects'
  AND column_name = 'assignment_type';

-- QUERY 4: Check the function definition
-- ============================================================================
SELECT routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_student_class_teacher';

-- QUERY 5: Check class teacher assignments (if assignment_type exists)
-- ============================================================================
SELECT 
    fs.id,
    fs.assignment_type,
    p.full_name as faculty_name,
    c.name as class_name,
    fs.section
FROM public.faculty_subjects fs
LEFT JOIN public.profiles p ON p.id = fs.faculty_profile_id
LEFT JOIN public.classes c ON c.id = fs.class_id
WHERE fs.assignment_type = 'class_teacher'
LIMIT 10;
