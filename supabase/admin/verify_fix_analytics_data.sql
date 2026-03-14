-- ============================================
-- VERIFY AND FIX ANALYTICS DATA
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: CHECK CURRENT DATA
-- ============================================

-- 1a. Check all students
SELECT 
  'STUDENTS' as table_name,
  COUNT(*) as total_count,
  COUNT(DISTINCT institution_id) as institutions_count
FROM students;

-- 1b. List all students with their institution
SELECT 
  id,
  name,
  institution_id,
  class_name,
  section,
  email
FROM students
ORDER BY institution_id, name;

-- 1c. Students grouped by institution
SELECT 
  COALESCE(institution_id, 'NULL') as institution_id,
  COUNT(*) as student_count,
  STRING_AGG(name, ', ') as student_names
FROM students
GROUP BY institution_id
ORDER BY student_count DESC;


-- STEP 2: CHECK STAFF DATA
-- ============================================

-- 2a. Check profiles table for faculty
SELECT 
  'PROFILES (FACULTY)' as table_name,
  COUNT(*) as total_count,
  COUNT(DISTINCT institution_id) as institutions_count
FROM profiles
WHERE role = 'faculty';

-- 2b. List all faculty from profiles
SELECT 
  id,
  email,
  full_name,
  role,
  institution_id,
  status
FROM profiles
WHERE role = 'faculty'
ORDER BY institution_id, email;

-- 2c. Faculty grouped by institution
SELECT 
  COALESCE(institution_id, 'NULL') as institution_id,
  COUNT(*) as faculty_count,
  STRING_AGG(email, ', ') as faculty_emails
FROM profiles
WHERE role = 'faculty'
GROUP BY institution_id
ORDER BY faculty_count DESC;

-- 2d. Check staff_details table
SELECT 
  'STAFF_DETAILS' as table_name,
  COUNT(*) as total_count,
  COUNT(DISTINCT institution_id) as institutions_count
FROM staff_details;

-- 2e. List all from staff_details
SELECT 
  id,
  profile_id,
  institution_id,
  staff_id,
  role
FROM staff_details
ORDER BY institution_id;


-- STEP 3: CHECK INSTITUTIONS
-- ============================================

SELECT 
  i.institution_id,
  i.name,
  i.status,
  (SELECT COUNT(*) FROM students WHERE institution_id = i.institution_id) as students_count,
  (SELECT COUNT(*) FROM profiles WHERE institution_id = i.institution_id AND role = 'faculty') as faculty_profiles_count,
  (SELECT COUNT(*) FROM staff_details WHERE institution_id = i.institution_id) as staff_details_count
FROM institutions i
ORDER BY i.name;


-- STEP 4: FIX COMMON ISSUES
-- ============================================

-- 4a. Find students without institution_id
SELECT 
  'Students without institution_id' as issue,
  COUNT(*) as count
FROM students
WHERE institution_id IS NULL OR institution_id = '';

-- 4b. Find faculty without institution_id
SELECT 
  'Faculty without institution_id' as issue,
  COUNT(*) as count
FROM profiles
WHERE role = 'faculty' AND (institution_id IS NULL OR institution_id = '');

-- 4c. Find staff_details without institution_id
SELECT 
  'Staff details without institution_id' as issue,
  COUNT(*) as count
FROM staff_details
WHERE institution_id IS NULL OR institution_id = '';


-- STEP 5: FIX DATA (UNCOMMENT AND MODIFY AS NEEDED)
-- ============================================

-- Replace 'YOUR_INSTITUTION_ID' with your actual institution ID

-- Fix students without institution_id
-- UPDATE students 
-- SET institution_id = 'YOUR_INSTITUTION_ID' 
-- WHERE institution_id IS NULL OR institution_id = '';

-- Fix faculty without institution_id
-- UPDATE profiles 
-- SET institution_id = 'YOUR_INSTITUTION_ID' 
-- WHERE role = 'faculty' AND (institution_id IS NULL OR institution_id = '');

-- Fix staff_details without institution_id
-- UPDATE staff_details 
-- SET institution_id = 'YOUR_INSTITUTION_ID' 
-- WHERE institution_id IS NULL OR institution_id = '';

-- Fix wrong role values (if staff have 'teacher' or 'staff' instead of 'faculty')
-- UPDATE profiles 
-- SET role = 'faculty' 
-- WHERE role IN ('teacher', 'staff', 'instructor');


-- STEP 6: VERIFY FIX
-- ============================================

-- Run this after fixing to verify
SELECT 
  'VERIFICATION' as check_type,
  (SELECT COUNT(*) FROM students) as total_students,
  (SELECT COUNT(*) FROM profiles WHERE role = 'faculty') as total_faculty_profiles,
  (SELECT COUNT(*) FROM staff_details) as total_staff_details,
  (SELECT COUNT(DISTINCT institution_id) FROM students) as institutions_with_students,
  (SELECT COUNT(DISTINCT institution_id) FROM profiles WHERE role = 'faculty') as institutions_with_faculty;
