-- =====================================================
-- CHECK TIMETABLE CONSTRAINTS
-- =====================================================
-- Run this to see what constraints currently exist

-- Check all unique constraints on timetable_slots
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'timetable_slots'::regclass
  AND contype = 'u'  -- Only unique constraints
ORDER BY conname;

-- Expected result:
-- constraint_name: timetable_slots_unique_faculty_day_period
-- definition: UNIQUE (faculty_id, day_of_week, period_index)

-- If you see "timetable_slots_config_id_day_of_week_period_index_key", 
-- that's the OLD constraint that needs to be removed!
