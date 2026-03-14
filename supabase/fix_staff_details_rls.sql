-- Fix staff_details RLS policies to allow faculty to read their own class assignments

-- Enable RLS on staff_details if not already enabled
ALTER TABLE public.staff_details ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Allow users to view their own staff details" ON public.staff_details;
DROP POLICY IF EXISTS "Allow faculty to view their own staff details" ON public.staff_details;
DROP POLICY IF EXISTS "Staff can view own details" ON public.staff_details;

-- Create a policy that allows authenticated users to read their own staff details
CREATE POLICY "Staff can view own details" 
ON public.staff_details
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Also allow institution admins to view all staff in their institution
CREATE POLICY "Institution admin can view all staff"
ON public.staff_details
FOR SELECT
TO authenticated
USING (
  institution_id IN (
    SELECT institution_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'institution'
  )
);

-- Allow super admins to view all staff
CREATE POLICY "Admin can view all staff"
ON public.staff_details
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);
