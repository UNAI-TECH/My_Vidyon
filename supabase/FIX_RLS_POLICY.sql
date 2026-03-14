-- ============================================================================
-- RLS POLICY DIAGNOSTIC AND FIX
-- ============================================================================
-- The data is correct, but the query might be blocked by RLS policies
-- ============================================================================

-- 1. Check current RLS policies on leave_requests
-- ============================================================================
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'leave_requests'
ORDER BY policyname;

-- 2. Test if Daisy can see the leave request directly (without RLS)
-- ============================================================================
-- This bypasses RLS to see if the data is there
SET ROLE postgres;
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
RESET ROLE;

-- 3. Check if there's a policy that allows faculty to SELECT their assigned leaves
-- ============================================================================
-- We need a policy like this:
DO $$
BEGIN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Faculty can view assigned student leaves" ON public.leave_requests;
    
    -- Create policy for faculty to view leaves assigned to them
    CREATE POLICY "Faculty can view assigned student leaves"
    ON public.leave_requests
    FOR SELECT
    TO authenticated
    USING (
        assigned_class_teacher_id = auth.uid()
        OR
        assigned_class_teacher_id IN (
            SELECT id FROM public.profiles WHERE id = auth.uid() AND role = 'faculty'
        )
    );
    
    RAISE NOTICE '✅ Created RLS policy for faculty to view assigned leaves';
END $$;

-- 4. Verify the policy was created
-- ============================================================================
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'leave_requests'
  AND policyname = 'Faculty can view assigned student leaves';

-- 5. Test the query again (this should now work)
-- ============================================================================
-- Run this as the faculty user (Daisy) to test
SELECT 
    lr.*,
    s.name as student_name,
    s.class_name,
    s.section
FROM public.leave_requests lr
LEFT JOIN public.students s ON s.id = lr.student_id
WHERE lr.assigned_class_teacher_id = '3c9d1eea-f883-4c45-822d-3722a6404a77'
ORDER BY lr.created_at DESC;
