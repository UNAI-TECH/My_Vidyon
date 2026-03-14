-- =============================================================
-- FIX MISMATCHED ROLES
-- Run this in Supabase SQL Editor to correct users incorrectly
-- assigned as 'student' by the handle_new_user trigger.
-- =============================================================

-- 1. IDENTIFY MISMATCHES
-- This query shows users where the profile role is 'student'
-- but the metadata role says they should be something else.
SELECT 
    p.id, 
    p.email, 
    p.role as current_profile_role,
    (u.raw_user_meta_data->>'role') as metadata_role
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'student' 
  AND (u.raw_user_meta_data->>'role') IS NOT NULL 
  AND (u.raw_user_meta_data->>'role') != 'student';

-- 2. PERFORM UPDATE
-- This updates profiles based on the role stored in auth metadata.
-- ONLY for those where the current role is 'student'.
UPDATE public.profiles p
SET 
    role = (u.raw_user_meta_data->>'role')::public.user_role,
    updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND p.role = 'student'
  AND (u.raw_user_meta_data->>'role') IS NOT NULL
  AND (u.raw_user_meta_data->>'role') IN (
      'admin', 'institution', 'faculty', 'teacher', 
      'parent', 'accountant', 'canteen_manager', 'driver'
  );

-- Special case: Map 'teacher' to 'faculty' if it exists in metadata
UPDATE public.profiles p
SET 
    role = 'faculty'::public.user_role,
    updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND p.role = 'student'
  AND (u.raw_user_meta_data->>'role') = 'teacher';

-- 3. VERIFY RESULTS
SELECT count(*) as rows_corrected FROM public.profiles WHERE role != 'student';
