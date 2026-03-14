-- Migration: Timetable System Schema
-- Description: Adds tables for flexible weekly timetables and faculty-subject assignments

-- 1. Timetable Configurations
-- Stores the structure of the week for a specific class/section (e.g., Mon-Fri, 9am-4pm, 8 periods)
CREATE TABLE IF NOT EXISTS public.timetable_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    section TEXT, -- Optional, if config differs per section
    days_of_week JSONB DEFAULT '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'::jsonb,
    periods_per_day INTEGER DEFAULT 8,
    start_time TIME WITHOUT TIME ZONE DEFAULT '09:00:00',
    period_duration_minutes INTEGER DEFAULT 45,
    break_configs JSONB DEFAULT '[]'::jsonb, -- Array of objects: [{after_period: 4, duration: 30, type: "Lunch"}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(class_id, section)
);

-- 2. Faculty Subject Assignments (Many-to-Many link)
-- Replaces/Augments the rigid 'staff_details' for timetable purposes
CREATE TABLE IF NOT EXISTS public.faculty_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    faculty_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    section TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(faculty_profile_id, subject_id, class_id, section)
);

-- 3. Timetable Slots (The actual schedule)
CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_id UUID REFERENCES public.timetable_configs(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL, -- 'Monday', etc.
    period_index INTEGER NOT NULL, -- 1-indexed (period 1, period 2...)
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    is_break BOOLEAN DEFAULT false,
    break_name TEXT, -- 'Lunch', 'Short Break'
    
    -- For Class Slots
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    faculty_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- snapshot of who takes this slot
    
    room_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    
    UNIQUE(config_id, day_of_week, period_index)
);

-- Enable RLS
ALTER TABLE public.timetable_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

-- Policies
-- Configs: Read all auth, Manage auth (Relaxed for now, strictly should be Admin/ClassTeacher)
-- Policies
-- Configs: Read all auth, Manage auth (Relaxed for now, strictly should be Admin/ClassTeacher)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.timetable_configs;
CREATE POLICY "Enable all access for authenticated users" ON public.timetable_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Faculty Subjects: Read all auth, Manage auth
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.faculty_subjects;
CREATE POLICY "Enable all access for authenticated users" ON public.faculty_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Slots: Read all auth, Manage auth
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.timetable_slots;
CREATE POLICY "Enable all access for authenticated users" ON public.timetable_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable Realtime
-- Enable Realtime
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'timetable_configs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.timetable_configs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'faculty_subjects') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_subjects;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'timetable_slots') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.timetable_slots;
    END IF;
END $$;
