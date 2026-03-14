-- ============================================================================
-- TEST THE EXACT QUERY AND CHECK RLS POLICIES
-- ============================================================================
-- Foreign keys are in place, now we need to ensure RLS allows the query
-- ============================================================================

-- 1. Test the exact query structure from the frontend (as Daisy)
-- ============================================================================
-- This simulates what Supabase client is doing
SELECT 
    lr.*,
    s.id as "student_id.id",
    s.name as "student_id.name",
    s.roll_no as "student_id.roll_no",
    s.class_name as "student_id.class_name",
    s.section as "student_id.section"
FROM public.leave_requests lr
LEFT JOIN public.students s ON s.id = lr.student_id
WHERE lr.assigned_class_teacher_id = '3c9d1eea-f883-4c45-822d-3722a6404a77'
ORDER BY lr.created_at DESC;

-- 2. Check current RLS policies on leave_requests
-- ============================================================================
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

-- 3. Check RLS policies on students table (might be blocking the join)
-- ============================================================================
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'students'
ORDER BY policyname;

-- 4. Add RLS policy for faculty to view their assigned leaves
-- ============================================================================
DO $$
BEGIN
    -- Drop and recreate the policy to ensure it's correct
    DROP POLICY IF EXISTS "Faculty can view assigned student leaves" ON public.leave_requests;
    
    CREATE POLICY "Faculty can view assigned student leaves"
    ON public.leave_requests
    FOR SELECT
    TO authenticated
    USING (
        assigned_class_teacher_id = auth.uid()
    );
    
    RAISE NOTICE '✅ Created/Updated RLS policy for faculty to view assigned leaves';
END $$;

-- 5. Add RLS policy for faculty to view students in their class
-- ============================================================================
DO $$
BEGIN
    -- Faculty should be able to see student details for students in their class
    DROP POLICY IF EXISTS "Faculty can view their students" ON public.students;
    
    CREATE POLICY "Faculty can view their students"
    ON public.students
    FOR SELECT
    TO authenticated
    USING (
        -- Faculty can see students from classes they teach
        EXISTS (
            SELECT 1 
            FROM public.faculty_subjects fs
            JOIN public.classes c ON c.id = fs.class_id
            WHERE fs.faculty_profile_id = auth.uid()
              AND c.name = students.class_name
              AND fs.section = students.section
        )
    );
    
    RAISE NOTICE '✅ Created/Updated RLS policy for faculty to view their students';
END $$;

-- 6. Test the query again after adding policies
-- ============================================================================
-- Run this to verify the policies work
SELECT 
    lr.id,
    lr.student_id,
    lr.assigned_class_teacher_id,
    lr.status,
    s.name as student_name,
    s.class_name,
    s.section
FROM public.leave_requests lr
LEFT JOIN public.students s ON s.id = lr.student_id
WHERE lr.assigned_class_teacher_id = '3c9d1eea-f883-4c45-822d-3722a6404a77'
ORDER BY lr.created_at DESC;

-- 7. Verify all policies
-- ============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('leave_requests', 'students')
ORDER BY tablename, policyname;
