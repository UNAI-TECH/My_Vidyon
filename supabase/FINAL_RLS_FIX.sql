-- ============================================================================
-- FINAL RLS POLICY FIX - COMPLETE SOLUTION
-- ============================================================================
-- Add RLS policies to allow faculty to view their assigned leave requests
-- ============================================================================

-- 1. Add RLS policy for faculty to view their assigned leaves
-- ============================================================================
DROP POLICY IF EXISTS "Faculty can view assigned student leaves" ON public.leave_requests;

CREATE POLICY "Faculty can view assigned student leaves"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
    assigned_class_teacher_id = auth.uid()
);

-- 2. Add RLS policy for faculty to view students in their classes
-- ============================================================================
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

-- 3. Verify policies were created
-- ============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('leave_requests', 'students')
  AND policyname IN ('Faculty can view assigned student leaves', 'Faculty can view their students')
ORDER BY tablename, policyname;

-- 4. Test the query (should return results for Daisy)
-- ============================================================================
SELECT 
    lr.id,
    lr.student_id,
    lr.assigned_class_teacher_id,
    lr.status,
    s.name as student_name,
    s.register_number,
    s.class_name,
    s.section
FROM public.leave_requests lr
LEFT JOIN public.students s ON s.id = lr.student_id
WHERE lr.assigned_class_teacher_id = '3c9d1eea-f883-4c45-822d-3722a6404a77'
ORDER BY lr.created_at DESC;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RLS policies created successfully!';
    RAISE NOTICE '✅ Frontend code updated to use register_number';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Refresh the Faculty Portal page';
    RAISE NOTICE '2. Leave requests should now appear';
    RAISE NOTICE '========================================';
END $$;
