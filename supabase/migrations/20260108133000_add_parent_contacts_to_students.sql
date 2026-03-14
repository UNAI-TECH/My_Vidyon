-- Add parent contact fields to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_phone TEXT;

-- Update profiles trigger logic to be more robust if needed
-- (The existing handle_new_user trigger in schema.sql already handles metadata role sync)
