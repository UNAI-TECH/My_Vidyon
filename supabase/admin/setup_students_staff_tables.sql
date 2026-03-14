-- ============================================
-- STUDENTS AND STAFF TABLES SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT NOT NULL,
  name TEXT NOT NULL,
  register_number TEXT UNIQUE,
  class_name TEXT,
  section TEXT,
  dob DATE,
  gender TEXT,
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  parent_contact TEXT,
  email TEXT,
  address TEXT,
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.students;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.students;

CREATE POLICY "Allow read for all auth users" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.students FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated users" ON public.students FOR DELETE TO authenticated USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_students_institution_id ON public.students(institution_id);


-- 2. STAFF_DETAILS TABLE (Optional - if you want separate staff table)
-- ============================================
CREATE TABLE IF NOT EXISTS public.staff_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID UNIQUE,
  institution_id TEXT NOT NULL,
  staff_id TEXT,
  role TEXT,
  subject_assigned TEXT,
  subjects TEXT[],
  class_assigned TEXT,
  section_assigned TEXT,
  department TEXT,
  designation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE public.staff_details ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.staff_details;

CREATE POLICY "Allow read for all auth users" ON public.staff_details FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.staff_details FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.staff_details FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete for authenticated users" ON public.staff_details FOR DELETE TO authenticated USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_staff_details_institution_id ON public.staff_details(institution_id);
CREATE INDEX IF NOT EXISTS idx_staff_details_profile_id ON public.staff_details(profile_id);


-- 3. VERIFY TABLES EXIST
-- ============================================
-- Run these queries to check if tables exist and see their structure:

-- Check students table
SELECT COUNT(*) as student_count FROM public.students;

-- Check staff via profiles table (faculty role)
SELECT COUNT(*) as staff_count FROM public.profiles WHERE role = 'faculty';

-- Check staff_details table
SELECT COUNT(*) as staff_details_count FROM public.staff_details;

-- See sample data grouped by institution
SELECT 
  institution_id,
  COUNT(*) as student_count
FROM public.students
GROUP BY institution_id;

SELECT 
  institution_id,
  COUNT(*) as faculty_count
FROM public.profiles
WHERE role = 'faculty'
GROUP BY institution_id;
