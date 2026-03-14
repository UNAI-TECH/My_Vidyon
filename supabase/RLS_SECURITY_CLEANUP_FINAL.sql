-- ============================================================================
-- SECURITY HARDENING: COMPREHENSIVE RLS CLEANUP
-- ============================================================================

-- 1. CLEANUP: Drop ALL legacy policies for Students and Staff
-- ============================================================================

-- Drop legacy policies from students table
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.students;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Faculty can view their students" ON public.students;
DROP POLICY IF EXISTS "Faculty view assigned students" ON public.students;
DROP POLICY IF EXISTS "Faculty view students" ON public.students;
DROP POLICY IF EXISTS "Parents view children via link" ON public.students;
DROP POLICY IF EXISTS "Strict Student Select" ON public.students; -- Drop my previous one to recreate it cleanly

-- Drop legacy policies from staff_details table
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.staff_details;
DROP POLICY IF EXISTS "Admin can view all staff" ON public.staff_details;
DROP POLICY IF EXISTS "Institution admin can view all staff" ON public.staff_details;
DROP POLICY IF EXISTS "Staff can view own details" ON public.staff_details;
DROP POLICY IF EXISTS "Strict Staff Select" ON public.staff_details; -- Drop my previous one to recreate it cleanly


-- 2. IMPLEMENTATION: Re-create Strict "Single Source of Truth" Policies
-- ============================================================================

-- A. Students Table
CREATE POLICY "Strict Student Select" ON public.students
FOR SELECT TO authenticated
USING (
    (auth.uid() = id) OR -- Own profile
    (auth.jwt()->>'role' = 'admin') OR -- Super Admins
    (auth.jwt()->>'role' = 'institution' AND institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid())) OR -- Institution Admins
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

-- Management policies (Only Admin and Institution Admins)
CREATE POLICY "Strict Student Management" ON public.students
FOR ALL TO authenticated
USING (
    (auth.jwt()->>'role' = 'admin') OR
    (auth.jwt()->>'role' = 'institution' AND institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid()))
);


-- B. Staff Details Table
CREATE POLICY "Strict Staff Select" ON public.staff_details
FOR SELECT TO authenticated
USING (
    (profile_id = auth.uid()) OR -- Own profile
    (auth.jwt()->>'role' = 'admin') OR -- Super Admins
    (institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid())) -- Same institution visibility
);

-- Management policies (Only Admin and Institution Admins)
CREATE POLICY "Strict Staff Management" ON public.staff_details
FOR ALL TO authenticated
USING (
    (auth.jwt()->>'role' = 'admin') OR
    (auth.jwt()->>'role' = 'institution' AND institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid()))
);


-- 3. FINAL VERIFICATION
-- ============================================================================
SELECT tablename, policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename IN ('students', 'staff_details')
ORDER BY tablename, policyname;
