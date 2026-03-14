-- Add admin_email to institutions if it doesn't exist
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS admin_email TEXT UNIQUE;

-- Ensure staff_details has a unique constraint on profile_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_details_profile_id_key') THEN
        ALTER TABLE public.staff_details ADD CONSTRAINT staff_details_profile_id_key UNIQUE (profile_id);
    END IF;
END $$;
