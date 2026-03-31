-- Add JSONB column to control allowed roles per institution
ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS allowed_roles JSONB 
DEFAULT '["student", "parent", "faculty", "canteen_manager", "accountant", "driver"]'::jsonb;

-- Optional: ensure all existing institutions get the default so nothing breaks
UPDATE public.institutions 
SET allowed_roles = '["student", "parent", "faculty", "canteen_manager", "accountant", "driver"]'::jsonb 
WHERE allowed_roles IS NULL;
