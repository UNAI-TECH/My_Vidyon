-- =====================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX STAFF CREATION
-- =====================================================
-- This adds the missing columns to the profiles table
-- that are needed for staff member creation with DOB
-- AND adds department column to subjects table for dropdown
-- AND fixes RLS policies to allow profile creation

-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS staff_id TEXT,
ADD COLUMN IF NOT EXISTS department TEXT;

-- Add department column to subjects table (needed for department dropdown)
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS department TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_staff_id ON public.profiles(staff_id);
CREATE INDEX IF NOT EXISTS idx_profiles_institution_id ON public.profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON public.subjects(department);

-- Fix RLS policies - Add INSERT policy for profiles table
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;
CREATE POLICY "Authenticated users can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.date_of_birth IS 'Date of birth for staff and other users';
COMMENT ON COLUMN public.profiles.phone IS 'Contact phone number';
COMMENT ON COLUMN public.profiles.staff_id IS 'Staff identifier for faculty members';
COMMENT ON COLUMN public.profiles.department IS 'Department for faculty members';
COMMENT ON COLUMN public.subjects.department IS 'Department categorization for subjects';

-- Verify the changes for profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Verify the changes for subjects table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'subjects'
ORDER BY ordinal_position;

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
