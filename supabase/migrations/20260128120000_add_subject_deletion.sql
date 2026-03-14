-- Add soft deletion support to exam_schedule_entries
-- This allows faculty to "delete" subjects without actually removing them from the database
-- Students will not see deleted subjects in their exam schedules

-- Add is_active column (default true for existing records)
ALTER TABLE public.exam_schedule_entries 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Add deleted_at timestamp
ALTER TABLE public.exam_schedule_entries 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_by reference to track who deleted the entry
ALTER TABLE public.exam_schedule_entries 
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for faster filtering of active entries
CREATE INDEX IF NOT EXISTS idx_exam_schedule_entries_is_active 
ON public.exam_schedule_entries(is_active) 
WHERE is_active = true;

-- Add comment for documentation
COMMENT ON COLUMN public.exam_schedule_entries.is_active IS 
'Soft deletion flag. When false, the subject is hidden from students but retained in the database.';

COMMENT ON COLUMN public.exam_schedule_entries.deleted_at IS 
'Timestamp when the entry was soft-deleted by faculty.';

COMMENT ON COLUMN public.exam_schedule_entries.deleted_by IS 
'Profile ID of the faculty member who deleted this entry.';

SELECT 'Soft deletion columns added to exam_schedule_entries successfully' as status;
