-- Verify Daisy's assignment in staff_details table
-- Run this in Supabase SQL Editor to check if the data exists

-- 1. Check if Daisy exists in profiles
SELECT 
  id,
  email,
  full_name,
  role,
  institution_id
FROM profiles
WHERE email = 'daisy@gmail.com';

-- 2. Check if Daisy has a staff_details record
SELECT 
  sd.id,
  sd.profile_id,
  sd.institution_id,
  sd.staff_id,
  sd.role,
  sd.class_assigned,
  sd.section_assigned,
  sd.subject_assigned,
  sd.department
FROM staff_details sd
JOIN profiles p ON sd.profile_id = p.id
WHERE p.email = 'daisy@gmail.com';

-- 3. If the above returns NULL for class_assigned, we need to INSERT/UPDATE it
-- Uncomment and modify this if needed:
/*
UPDATE staff_details
SET 
  class_assigned = '9th',
  section_assigned = 'A'
WHERE profile_id = (SELECT id FROM profiles WHERE email = 'daisy@gmail.com');
*/
