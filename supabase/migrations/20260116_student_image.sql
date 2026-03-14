-- Update students table to include image_url
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Ensure face_embeddings can link to students if needed
-- (The current logic uses user_id, which usually maps to auth.users. 
-- For students without auth accounts, we might need a separate field or use their UUID)
