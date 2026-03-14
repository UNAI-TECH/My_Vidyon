-- ============================================================================
-- VERIFY STUDENT AND FACULTY MATCH
-- ============================================================================
-- Check if the student is actually in Daisy's class (9th A)
-- ============================================================================

-- Check the student details
SELECT 
    s.id,
    s.name,
    s.class_name,
    s.section,
    s.roll_no
FROM public.students s
WHERE s.id = '9e24ea75-4594-410b-9524-3927394bc7c2';

-- Check Daisy's profile ID
SELECT 
    id,
    full_name,
    email,
    role
FROM public.profiles
WHERE id = '3c9d1eea-f883-4c45-822d-3722a6404a77';

-- Check what class teacher is assigned to this student's class
SELECT 
    fs.id,
    fs.assignment_type,
    p.full_name as faculty_name,
    p.id as faculty_id,
    c.name as class_name,
    fs.section
FROM public.students s
JOIN public.classes c ON c.name = s.class_name
JOIN public.faculty_subjects fs ON fs.class_id = c.id AND fs.section = s.section
LEFT JOIN public.profiles p ON p.id = fs.faculty_profile_id
WHERE s.id = '9e24ea75-4594-410b-9524-3927394bc7c2'
  AND fs.assignment_type = 'class_teacher';

-- Check RLS policies on leave_requests
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'leave_requests'
ORDER BY policyname;
