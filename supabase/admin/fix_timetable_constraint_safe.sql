-- =====================================================
-- FIX TIMETABLE UNIQUE CONSTRAINT - IDEMPOTENT VERSION
-- =====================================================
-- This script can be run multiple times safely

-- Step 1: Drop the old problematic constraint (if it exists)
ALTER TABLE public.timetable_slots 
DROP CONSTRAINT IF EXISTS timetable_slots_config_id_day_of_week_period_index_key;

-- Step 2: Drop the new constraint if it exists (to recreate it)
ALTER TABLE public.timetable_slots 
DROP CONSTRAINT IF EXISTS timetable_slots_unique_faculty_day_period;

-- Step 3: Add the correct constraint
ALTER TABLE public.timetable_slots 
ADD CONSTRAINT timetable_slots_unique_faculty_day_period 
UNIQUE (faculty_id, day_of_week, period_index);

-- Step 4: Verify the constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'timetable_slots'::regclass
  AND contype = 'u'  -- Only unique constraints
ORDER BY conname;
