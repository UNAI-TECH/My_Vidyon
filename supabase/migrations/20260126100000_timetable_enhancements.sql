-- Migration: Timetable Enhancements & Special Classes
-- Description: Adds configuration fields and support for special classes

-- 1. Update timetable_configs with more granular controls
ALTER TABLE public.timetable_configs 
ADD COLUMN IF NOT EXISTS buffer_time_minutes INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS lunch_start_time TIME WITHOUT TIME ZONE DEFAULT '12:30:00',
ADD COLUMN IF NOT EXISTS lunch_duration_minutes INTEGER DEFAULT 45,
ADD COLUMN IF NOT EXISTS days_per_week INTEGER DEFAULT 6;

-- 2. Create Special Timetable Slots table
CREATE TABLE IF NOT EXISTS public.special_timetable_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    event_date DATE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    faculty_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    room_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS for Special Slots
ALTER TABLE public.special_timetable_slots ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Special Slots
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.special_timetable_slots;
CREATE POLICY "Enable all access for authenticated users" ON public.special_timetable_slots 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Enable Realtime for Special Slots
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'special_timetable_slots') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.special_timetable_slots;
    END IF;
END $$;

-- 5. Add index for performance on date/class lookups
CREATE INDEX IF NOT EXISTS idx_special_tt_date_class ON public.special_timetable_slots(event_date, class_id, section);
