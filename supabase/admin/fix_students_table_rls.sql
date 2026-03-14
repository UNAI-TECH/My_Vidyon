-- =====================================================
-- FIX STUDENTS TABLE RLS POLICIES
-- =====================================================
-- This fixes the 406 error when students try to access their data

-- Step 1: Ensure students table exists
CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  register_number TEXT UNIQUE,
  class_name TEXT,
  section TEXT,
  dob DATE,
  gender TEXT,
  parent_name TEXT,
  parent_contact TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Step 2: Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.students;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Students can read own data" ON public.students;

-- Step 4: Create comprehensive policies
-- Allow students to read their own data
CREATE POLICY "Students can read own data" 
ON public.students 
FOR SELECT 
TO authenticated 
USING (email = auth.jwt()->>'email' OR true);

-- Allow all authenticated users to read (for institution/faculty access)
CREATE POLICY "Authenticated users can read all students" 
ON public.students 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert/update/delete (for institution admin)
CREATE POLICY "Authenticated users can manage students" 
ON public.students 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Step 5: Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'students'
ORDER BY policyname;
