-- 1. Enable Supabase Realtime for missing core tables (Idempotent)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'staff_details') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_details;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'classes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'groups') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'subjects') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.subjects;
    END IF;
END $$;

-- 2. Ensure IDs and constraints are consistent
-- Ensure staff_details has a unique constraint on profile_id (idempotent check)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_details_profile_id_key') THEN
        ALTER TABLE public.staff_details ADD CONSTRAINT staff_details_profile_id_key UNIQUE (profile_id);
    END IF;
END $$;

-- Ensure students has a unique constraint on register_number (already in schema.sql, but ensuring here)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_register_number_key') THEN
        ALTER TABLE public.students ADD CONSTRAINT students_register_number_key UNIQUE (register_number);
    END IF;
END $$;
