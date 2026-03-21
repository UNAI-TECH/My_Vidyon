-- SQL Script to clean up bad data causing UUID validation errors
-- The value 'SS1212' was found in subject_id columns which should be UUIDs

-- 1. Identify and clear 'SS1212' from faculty_subjects
UPDATE faculty_subjects 
SET subject_id = NULL 
WHERE subject_id::text = 'SS1212';

-- 2. Identify and clear 'SS1212' from assignments
UPDATE assignments 
SET subject_id = NULL 
WHERE subject_id::text = 'SS1212';

-- 3. Identify and clear 'SS1212' from subject_materials
UPDATE subject_materials 
SET subject_id = NULL 
WHERE subject_id::text = 'SS1212';

-- 4. Identify and clear 'SS1212' from timetable_slots
UPDATE timetable_slots 
SET subject_id = NULL 
WHERE subject_id::text = 'SS1212';

-- Note: After running this, the "Class Teacher" cards without subjects will be filtered out 
-- automatically by the updated application code.
