-- =====================================================
-- FIX TIMETABLE UNIQUE CONSTRAINT
-- =====================================================
-- Problem: The unique constraint prevents multiple faculty from teaching
-- different classes at the same time (e.g., Monday Period 2)
--
-- Current constraint: UNIQUE(config_id, day_of_week, period_index)
-- This only allows ONE slot per day/period across the entire institution!
--
-- Solution: Remove this constraint and add a better one

-- Step 1: Drop the problematic constraint
ALTER TABLE public.timetable_slots 
DROP CONSTRAINT IF EXISTS timetable_slots_config_id_day_of_week_period_index_key;

-- Step 2: Add a better constraint that allows multiple faculty
-- but prevents duplicate slots for the same faculty/class/section
ALTER TABLE public.timetable_slots 
ADD CONSTRAINT timetable_slots_unique_faculty_day_period 
UNIQUE (faculty_id, day_of_week, period_index);

-- This new constraint means:
-- ✅ Maddy can teach 9th B at Monday Period 2
-- ✅ Another teacher can teach 10th A at Monday Period 2 (different faculty)
-- ❌ Maddy can't have TWO slots at Monday Period 2 (same faculty)

-- Step 3: Verify the constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'timetable_slots'::regclass
ORDER BY conname;
