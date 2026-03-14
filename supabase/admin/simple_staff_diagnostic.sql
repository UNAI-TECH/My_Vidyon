-- ============================================
-- SIMPLE STAFF COUNT DIAGNOSTIC
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Count all faculty members
SELECT 
  COUNT(*) as total_faculty
FROM public.profiles
WHERE role = 'faculty';

-- 2. Show all faculty members with details
SELECT 
  id,
  email,
  full_name,
  institution_id,
  status
FROM public.profiles
WHERE role = 'faculty'
ORDER BY institution_id, email;

-- 3. Count faculty by institution
SELECT 
  COALESCE(institution_id, 'NO INSTITUTION ID') as institution_id,
  COUNT(*) as faculty_count,
  STRING_AGG(email, ', ') as emails
FROM public.profiles
WHERE role = 'faculty'
GROUP BY institution_id
ORDER BY faculty_count DESC;

-- 4. Check staff_details table
SELECT 
  COUNT(*) as total_in_staff_details
FROM public.staff_details;

-- 5. Show all staff_details records
SELECT 
  id,
  profile_id,
  institution_id,
  staff_id,
  role as staff_role
FROM public.staff_details
ORDER BY institution_id;

-- 6. Count staff_details by institution
SELECT 
  COALESCE(institution_id, 'NO INSTITUTION ID') as institution_id,
  COUNT(*) as staff_count
FROM public.staff_details
GROUP BY institution_id
ORDER BY staff_count DESC;

-- 7. Find faculty NOT in staff_details
SELECT 
  p.email,
  p.full_name,
  p.institution_id,
  CASE 
    WHEN sd.id IS NULL THEN 'NOT in staff_details'
    ELSE 'IN staff_details'
  END as status
FROM public.profiles p
LEFT JOIN public.staff_details sd ON p.id = sd.profile_id
WHERE p.role = 'faculty'
ORDER BY status, p.email;

-- 8. Compare counts for YOUR institution (replace with your actual institution_id)
-- REPLACE 'YOUR_INSTITUTION_ID' with your actual institution ID
SELECT 
  'profiles (faculty)' as source,
  COUNT(*) as count
FROM public.profiles
WHERE role = 'faculty' 
  AND institution_id = 'YOUR_INSTITUTION_ID'
UNION ALL
SELECT 
  'staff_details' as source,
  COUNT(*) as count
FROM public.staff_details
WHERE institution_id = 'YOUR_INSTITUTION_ID';
