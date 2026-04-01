-- Migration Script to fix the 'classes' table schema
-- Run this in your Supabase SQL Editor

DO $$ 
BEGIN
    -- Add institution_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'classes' AND column_name = 'institution_id') THEN
        ALTER TABLE public.classes ADD COLUMN institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE;
    END IF;

    -- Add academic_year if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'classes' AND column_name = 'academic_year') THEN
        ALTER TABLE public.classes ADD COLUMN academic_year TEXT;
    END IF;

    -- Add class_order if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'classes' AND column_name = 'class_order') THEN
        ALTER TABLE public.classes ADD COLUMN class_order INTEGER DEFAULT 0;
    END IF;

    -- Add is_final_class if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'classes' AND column_name = 'is_final_class') THEN
        ALTER TABLE public.classes ADD COLUMN is_final_class BOOLEAN DEFAULT false;
    END IF;

END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
