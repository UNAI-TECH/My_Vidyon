-- Migration: Add department column to staff_details
-- Date: 2026-01-12 18:00:00

ALTER TABLE public.staff_details ADD COLUMN IF NOT EXISTS department TEXT;

-- Helper to make this available to realtime if not already
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'staff_details') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_details;
    END IF;
END $$;
