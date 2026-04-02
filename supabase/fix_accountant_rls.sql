-- Fix Accountant RLS Access for Fee Payments Table

DROP POLICY IF EXISTS "Institution manages fees" ON public.fee_payments;

CREATE POLICY "Institution manages fees"
ON public.fee_payments FOR ALL TO authenticated
USING (
  institution_id IN (
    SELECT institution_id FROM public.profiles
    WHERE id = auth.uid() AND role IN ('institution', 'admin', 'accountant')
  )
)
WITH CHECK (
  institution_id IN (
    SELECT institution_id FROM public.profiles
    WHERE id = auth.uid() AND role IN ('institution', 'admin', 'accountant')
  )
);
