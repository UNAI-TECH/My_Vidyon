-- =====================================================
-- OPTIONAL: Add sample subjects with departments
-- =====================================================
-- Run this AFTER fix_profiles_table.sql to populate
-- some sample subjects with departments for testing

-- Note: Replace 'YOUR_INSTITUTION_ID' with your actual institution_id
-- You can find your institution_id by running:
-- SELECT institution_id FROM public.institutions LIMIT 1;

-- Sample subjects for different departments
INSERT INTO public.subjects (institution_id, name, code, department, class_name, group_name)
VALUES
  -- Mathematics Department
  ('YOUR_INSTITUTION_ID', 'Mathematics', 'MATH101', 'Mathematics', '10th', 'Secondary'),
  ('YOUR_INSTITUTION_ID', 'Advanced Mathematics', 'MATH201', 'Mathematics', '12th', 'Senior Secondary'),
  ('YOUR_INSTITUTION_ID', 'Statistics', 'MATH301', 'Mathematics', '11th', 'Senior Secondary'),
  
  -- Science Department
  ('YOUR_INSTITUTION_ID', 'Physics', 'PHY101', 'Science', '10th', 'Secondary'),
  ('YOUR_INSTITUTION_ID', 'Chemistry', 'CHEM101', 'Science', '10th', 'Secondary'),
  ('YOUR_INSTITUTION_ID', 'Biology', 'BIO101', 'Science', '10th', 'Secondary'),
  ('YOUR_INSTITUTION_ID', 'Advanced Physics', 'PHY201', 'Science', '12th', 'Senior Secondary'),
  
  -- English Department
  ('YOUR_INSTITUTION_ID', 'English Literature', 'ENG101', 'English', '10th', 'Secondary'),
  ('YOUR_INSTITUTION_ID', 'English Grammar', 'ENG102', 'English', '9th', 'Secondary'),
  ('YOUR_INSTITUTION_ID', 'Advanced English', 'ENG201', 'English', '12th', 'Senior Secondary'),
  
  -- Social Studies Department
  ('YOUR_INSTITUTION_ID', 'History', 'HIST101', 'Social Studies', '10th', 'Secondary'),
  ('YOUR_INSTITUTION_ID', 'Geography', 'GEO101', 'Social Studies', '10th', 'Secondary'),
  ('YOUR_INSTITUTION_ID', 'Civics', 'CIV101', 'Social Studies', '9th', 'Secondary'),
  
  -- Computer Science Department
  ('YOUR_INSTITUTION_ID', 'Computer Science', 'CS101', 'Computer Science', '10th', 'Secondary'),
  ('YOUR_INSTITUTION_ID', 'Programming', 'CS201', 'Computer Science', '11th', 'Senior Secondary'),
  ('YOUR_INSTITUTION_ID', 'Data Structures', 'CS301', 'Computer Science', '12th', 'Senior Secondary'),
  
  -- Languages Department
  ('YOUR_INSTITUTION_ID', 'Hindi', 'HIN101', 'Languages', '10th', 'Secondary'),
  ('YOUR_INSTITUTION_ID', 'Sanskrit', 'SAN101', 'Languages', '9th', 'Secondary'),
  ('YOUR_INSTITUTION_ID', 'French', 'FRE101', 'Languages', '11th', 'Senior Secondary')
ON CONFLICT DO NOTHING;

-- Verify the subjects were added
SELECT department, COUNT(*) as subject_count
FROM public.subjects
WHERE institution_id = 'YOUR_INSTITUTION_ID'
GROUP BY department
ORDER BY department;
