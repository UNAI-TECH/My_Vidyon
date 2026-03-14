-- Add missing columns to timetable_slots table
ALTER TABLE public.timetable_slots 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS section TEXT;

-- Update RLS policies if needed (already broad enough in previous migration)
-- Refresh the cache/publication for realtime
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'timetable_slots') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.timetable_slots;
    END IF;
END $$;
