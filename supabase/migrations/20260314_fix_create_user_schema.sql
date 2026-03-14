-- Migration to fix schema compatibility with create-user Edge Function
-- Date: 2026-03-14

-- 1. Update profiles table to include image columns expected by edge function
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Update students table to include profile_id mapping
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create index for better performance on student profile links
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON public.students(profile_id);

-- Optional: If students already exist, we might want to backfill profile_id from id/user_id
-- UPDATE public.students SET profile_id = id WHERE profile_id IS NULL;

-- 3. Ensure appropriate comments exist
COMMENT ON COLUMN public.profiles.profile_image_url IS 'Backing column for create-user edge function compatibility';
COMMENT ON COLUMN public.profiles.avatar_url IS 'Backing column for create-user edge function compatibility';
COMMENT ON COLUMN public.students.profile_id IS 'Link to user profile, expected by create-user edge function';
