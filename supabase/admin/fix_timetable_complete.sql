-- =====================================================
-- COMPLETE TIMETABLE DATABASE FIX
-- =====================================================
-- Run this in Supabase SQL Editor to ensure timetable works

-- 1. Ensure timetable_slots table has all required columns
ALTER TABLE public.timetable_slots 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS section TEXT;

-- 2. Ensure RLS policies allow all operations
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.timetable_slots;
CREATE POLICY "Enable all access for authenticated users" 
ON public.timetable_slots 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. Enable realtime for timetable_slots
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'timetable_slots'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.timetable_slots;
    END IF;
END $$;

-- 4. Verify the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'timetable_slots'
ORDER BY ordinal_position;

-- 5. Check if there's a 10th class
SELECT id, name FROM public.classes WHERE name = '10th';

-- 6. Check existing timetable slots
SELECT 
    ts.id,
    ts.day_of_week,
    ts.period_index,
    ts.start_time,
    ts.end_time,
    c.name as class_name,
    ts.section,
    s.name as subject_name,
    p.full_name as faculty_name
FROM timetable_slots ts
LEFT JOIN classes c ON ts.class_id = c.id
LEFT JOIN subjects s ON ts.subject_id = s.id
LEFT JOIN profiles p ON ts.faculty_id = p.id
WHERE ts.class_id IN (SELECT id FROM classes WHERE name = '10th')
  AND ts.section = 'A'
ORDER BY ts.day_of_week, ts.period_index;

-- 7. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'timetable_slots'
ORDER BY policyname;
