-- Check if 10th class exists
SELECT id, name, institution_id 
FROM classes 
WHERE name = '10th'
LIMIT 5;

-- If no results, let's see what classes exist
SELECT id, name, institution_id 
FROM classes 
ORDER BY name
LIMIT 20;

-- Check timetable_slots for 10th A
SELECT ts.*, s.name as subject_name, p.full_name as faculty_name
FROM timetable_slots ts
LEFT JOIN subjects s ON ts.subject_id = s.id
LEFT JOIN profiles p ON ts.faculty_id = p.id
WHERE ts.section = 'A'
ORDER BY ts.day_of_week, ts.period_index
LIMIT 20;
