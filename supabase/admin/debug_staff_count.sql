-- ============================================
-- DEBUG STAFF COUNT ISSUE
-- Run this in Supabase SQL Editor to find the missing staff member
-- ============================================

-- 1. Check ALL profiles (to see total count)
SELECT 
  'Total Profiles' as check_type,
  COUNT(*) as count
FROM public.profiles;

-- 2. Check profiles by role
SELECT 
  role,
  COUNT(*) as count
FROM public.profiles
GROUP BY role
ORDER BY count DESC;

-- 3. Check faculty members with their institution_id
SELECT 
  id,
  email,
  full_name,
  role,
  institution_id,
  status
FROM public.profiles
WHERE role = 'faculty'
ORDER BY email;

-- 4. Check for faculty with NULL or empty institution_id
SELECT 
  id,
  email,
  full_name,
  role,
  institution_id,
  status,
  CASE 
    WHEN institution_id IS NULL THEN 'NULL institution_id'
    WHEN institution_id = '' THEN 'Empty institution_id'
    ELSE 'Has institution_id'
  END as institution_status
FROM public.profiles
WHERE role = 'faculty'
ORDER BY institution_id NULLS FIRST;

-- 5. Count faculty by institution
SELECT 
  COALESCE(institution_id, 'NULL or Empty') as institution_id,
  COUNT(*) as faculty_count,
  STRING_AGG(email, ', ') as faculty_emails
FROM public.profiles
WHERE role = 'faculty'
GROUP BY institution_id
ORDER BY faculty_count DESC;

-- 6. Check for case sensitivity issues in role
SELECT 
  role,
  COUNT(*) as count
FROM public.profiles
WHERE LOWER(role::text) = 'faculty'
GROUP BY role;

-- 7. Find ALL staff-related profiles (only valid enum values)
-- Valid user_role enum values: 'admin', 'institution', 'faculty', 'parent', 'student'
SELECT 
  id,
  email,
  full_name,
  role,
  institution_id
FROM public.profiles
WHERE 
  role = 'faculty'  -- Only 'faculty' is valid for staff in this enum
ORDER BY role, email;

-- 8. Check if there's a staff_details table with additional staff
SELECT 
  'Staff Details Table' as source,
  COUNT(*) as count
FROM public.staff_details;

-- 9. Compare profiles vs staff_details
SELECT 
  'Profiles (faculty)' as source,
  COUNT(*) as count
FROM public.profiles
WHERE role = 'faculty'
UNION ALL
SELECT 
  'Staff Details' as source,
  COUNT(*) as count
FROM public.staff_details;

-- ============================================
-- SOLUTION QUERIES
-- ============================================

-- If you find a staff member with wrong role, fix it:
-- UPDATE public.profiles 
-- SET role = 'faculty' 
-- WHERE email = 'missing-staff@example.com';

-- If you find a staff member with NULL/wrong institution_id, fix it:
-- UPDATE public.profiles 
-- SET institution_id = 'YOUR_INSTITUTION_ID' 
-- WHERE email = 'missing-staff@example.com';

-- If you find a staff member with wrong status, fix it:
-- UPDATE public.profiles 
-- SET status = 'active' 
-- WHERE email = 'missing-staff@example.com';
