-- FIX STUDENT FEES RLS POLICIES
-- Created: 2026-02-09
-- Purpose: Allow parents and students to view fee records

-- Drop existing restricted policies if they exist
DROP POLICY IF EXISTS "Institution admins can manage student fees" ON student_fees;
DROP POLICY IF EXISTS "Admins and Accountants can manage student fees" ON student_fees;
DROP POLICY IF EXISTS "Students can view their own fees" ON student_fees;
DROP POLICY IF EXISTS "Parents can view their children fees" ON student_fees;

-- 1. Allow Institution Admins & Accountants full access
-- We resolve the institution UUID from the profile's TEXT code via join
CREATE POLICY "Admins and Accountants can manage student fees"
ON public.student_fees
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.institutions i ON i.institution_id = p.institution_id
        WHERE p.id = auth.uid()
        AND (i.id::text = student_fees.institution_id::text OR i.institution_id = student_fees.institution_id::text)
        AND p.role IN ('admin', 'accountant', 'institution')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.institutions i ON i.institution_id = p.institution_id
        WHERE p.id = auth.uid()
        AND (i.id::text = student_fees.institution_id::text OR i.institution_id = student_fees.institution_id::text)
        AND p.role IN ('admin', 'accountant', 'institution')
    )
);

-- 2. Allow Students to view their own fees
-- Students are linked to student_fees via student_id
CREATE POLICY "Students can view their own fees"
ON public.student_fees
FOR SELECT
TO authenticated
USING (
    student_id IN (
        SELECT id FROM public.students
        WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- 3. Allow Parents to view their children's fees
-- Parents can be linked via students.parent_id OR the student_parents join table
CREATE POLICY "Parents can view their children fees"
ON public.student_fees
FOR SELECT
TO authenticated
USING (
    EXISTS (
        -- Option A: Direct parent_id link in students table
        -- This usually stores the profile_id (auth.uid())
        SELECT 1 FROM public.students s
        WHERE s.id = student_fees.student_id
        AND s.parent_id = auth.uid()
    )
    OR
    EXISTS (
        -- Option B: Via student_parents join table
        -- Mapping profile_id -> parents.profile_id -> parents.id -> student_parents.parent_id
        SELECT 1 FROM public.student_parents sp
        JOIN public.parents p ON p.id = sp.parent_id
        WHERE sp.student_id = student_fees.student_id
        AND p.profile_id = auth.uid()
    )
    OR
    EXISTS (
        -- Option C: email fallback
        -- If the parent profile email matches the student's parent_email
        SELECT 1 FROM public.students s
        WHERE s.id = student_fees.student_id
        AND s.parent_email ILIKE (auth.jwt() ->> 'email')
    )
    -- Also allow if the user is the student themselves (redundant but safe)
    OR student_id IN (
        SELECT id FROM public.students
        WHERE email ILIKE (auth.jwt() ->> 'email')
    )
);

-- Ensure Realtime is enabled for the table
ALTER TABLE public.student_fees REPLICA IDENTITY FULL;
