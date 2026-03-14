-- Fix timetable unique constraint
-- The original constraint UNIQUE(config_id, day_of_week, period_index) is too restrictive
-- It prevents multiple faculty from teaching different classes at the same time

-- Drop the old constraint
ALTER TABLE public.timetable_slots 
DROP CONSTRAINT IF EXISTS timetable_slots_config_id_day_of_week_period_index_key;

-- Add a better constraint: one slot per faculty per day/period
-- This allows multiple faculty to teach at the same time (different classes)
-- but prevents one faculty from having duplicate slots
ALTER TABLE public.timetable_slots 
ADD CONSTRAINT timetable_slots_unique_faculty_day_period 
UNIQUE (faculty_id, day_of_week, period_index);
