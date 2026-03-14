-- Add image_url to profiles table for staff face recognition
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS image_url TEXT;
