-- Check existing constraints on timetable_slots
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'timetable_slots'::regclass;

-- Check for unique indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'timetable_slots';

-- If there's a unique constraint causing 409 errors, we might need to drop it
-- Example (DO NOT RUN unless confirmed):
-- ALTER TABLE timetable_slots DROP CONSTRAINT IF EXISTS <constraint_name>;

-- Check current data to see if there are duplicates
SELECT 
    class_id, 
    section, 
    day_of_week, 
    period_index, 
    COUNT(*) as count
FROM timetable_slots
WHERE section = 'A'
GROUP BY class_id, section, day_of_week, period_index
HAVING COUNT(*) > 1;
