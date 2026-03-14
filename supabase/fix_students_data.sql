-- Migration to fix students table data consistency
DO $$ 
BEGIN
    -- 1. Add academic_year column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'academic_year') THEN
        ALTER TABLE public.students ADD COLUMN academic_year TEXT;
        RAISE NOTICE 'Added academic_year column to students table';
    END IF;

    -- 2. Add is_active column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'is_active') THEN
        ALTER TABLE public.students ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to students table';
    END IF;

    -- 2b. Add profile_id column if missing (Required by Edge Function)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'profile_id') THEN
        ALTER TABLE public.students ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added profile_id column to students table';
    END IF;

    -- 3. Backfill academic_year for existing records
    -- Defaulting to 2025-26 as per current app requirement
    UPDATE public.students 
    SET academic_year = '2025-26' 
    WHERE academic_year IS NULL;

    -- 4. Backfill is_active for existing records
    UPDATE public.students 
    SET is_active = true 
    WHERE is_active IS NULL;

    -- 5. Backfill profile_id for existing records
    UPDATE public.students 
    SET profile_id = id 
    WHERE profile_id IS NULL;
END $$;
