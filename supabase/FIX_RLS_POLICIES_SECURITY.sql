-- ============================================================================
-- SECURITY HARDENING: STRICT RLS POLICIES
-- ============================================================================

-- 1. Hardening Students Table
-- ============================================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for all auth users" ON public.students;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.students;

-- Only Allow:
-- 1. Admins to see everyone
-- 2. Faculty to see students in their assigned classes
-- 3. Parents to see their own children
-- 4. Students to see their own profile
CREATE POLICY "Strict Student Select" ON public.students
FOR SELECT TO authenticated
USING (
    (auth.uid() = id) OR -- Own profile
    (auth.jwt()->>'role' = 'admin') OR -- Admins
    EXISTS ( -- Faculty assigned to this class
        SELECT 1 FROM public.faculty_subjects fs
        WHERE fs.faculty_profile_id = auth.uid()
          AND fs.class_id IN (SELECT id FROM public.classes WHERE name = students.class_name)
    ) OR
    EXISTS ( -- Parents of this student
        SELECT 1 FROM public.student_parents sp
        JOIN public.parents p ON p.id = sp.parent_id
        WHERE p.profile_id = auth.uid() AND sp.student_id = students.id
    )
);

-- 2. Hardening Staff Details Table
-- ============================================================================
ALTER TABLE public.staff_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for all auth users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.staff_details;

-- Only Allow:
-- 1. Admins to see everyone
-- 2. Staff to see their own details
-- 3. Students/Parents to see faculty ONLY from their own institution
CREATE POLICY "Strict Staff Select" ON public.staff_details
FOR SELECT TO authenticated
USING (
    (profile_id = auth.uid()) OR -- Own profile
    (auth.jwt()->>'role' = 'admin') OR -- Admins
    (institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid())) -- Same institution
);

-- 3. Verify Changes
-- ============================================================================
SELECT tablename, policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename IN ('students', 'staff_details');
