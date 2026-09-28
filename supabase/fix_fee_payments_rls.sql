-- ============================================================================
-- FIX FEE PAYMENTS & STUDENT FEES RLS POLICIES
-- ============================================================================
-- Fixes error 42501 ("new row violates row-level security policy for table 'fee_payments'")
-- when parents or students make fee payments.
-- ============================================================================

-- 1. Enable RLS on fee_payments
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing conflicting policies on fee_payments
DROP POLICY IF EXISTS "Institution and admins can manage fee payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Parents and students can view their fee payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Parents and students can record fee payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Allow authenticated insert into fee_payments" ON public.fee_payments;
DROP POLICY IF EXISTS "Allow authenticated select on fee_payments" ON public.fee_payments;

-- 3. Policy: SELECT for fee_payments
CREATE POLICY "Parents and students can view their fee payments"
ON public.fee_payments
FOR SELECT
TO authenticated
USING (
    -- Direct parent link
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = fee_payments.student_id
        AND (s.parent_id = auth.uid() OR s.user_id = auth.uid())
    )
    OR
    -- student_parents join table link
    EXISTS (
        SELECT 1 FROM public.student_parents sp
        JOIN public.parents p ON p.id = sp.parent_id
        WHERE sp.student_id = fee_payments.student_id
        AND p.profile_id = auth.uid()
    )
    OR
    -- Staff / Admin / Accountant in the same institution
    EXISTS (
        SELECT 1 FROM public.profiles prof
        WHERE prof.id = auth.uid()
        AND prof.role IN ('admin', 'institution', 'accountant')
        AND prof.institution_id = fee_payments.institution_id
    )
);

-- 4. Policy: INSERT for fee_payments (Allows parents, students, and accountants)
CREATE POLICY "Parents and students can record fee payments"
ON public.fee_payments
FOR INSERT
TO authenticated
WITH CHECK (
    -- Direct parent or student
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = fee_payments.student_id
        AND (s.parent_id = auth.uid() OR s.user_id = auth.uid())
    )
    OR
    -- student_parents join table link
    EXISTS (
        SELECT 1 FROM public.student_parents sp
        JOIN public.parents p ON p.id = sp.parent_id
        WHERE sp.student_id = fee_payments.student_id
        AND p.profile_id = auth.uid()
    )
    OR
    -- Staff / Admin / Accountant
    EXISTS (
        SELECT 1 FROM public.profiles prof
        WHERE prof.id = auth.uid()
        AND prof.role IN ('admin', 'institution', 'accountant')
    )
);

-- 5. Policy: UPDATE for student_fees (Allows parents and students to mark fees as paid)
DROP POLICY IF EXISTS "Parents and students can update their fees on payment" ON public.student_fees;
CREATE POLICY "Parents and students can update their fees on payment"
ON public.student_fees
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_fees.student_id
        AND (s.parent_id = auth.uid() OR s.user_id = auth.uid())
    )
    OR
    EXISTS (
        SELECT 1 FROM public.profiles prof
        WHERE prof.id = auth.uid()
        AND prof.role IN ('admin', 'institution', 'accountant')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_fees.student_id
        AND (s.parent_id = auth.uid() OR s.user_id = auth.uid())
    )
    OR
    EXISTS (
        SELECT 1 FROM public.profiles prof
        WHERE prof.id = auth.uid()
        AND prof.role IN ('admin', 'institution', 'accountant')
    )
);

-- 6. Ensure Realtime publication includes fee_payments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'fee_payments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_payments;
    END IF;
END $$;
