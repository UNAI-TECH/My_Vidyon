-- Add remarks column to exam_results table
-- This column will store faculty remarks/comments for each student's exam result

ALTER TABLE public.exam_results 
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.exam_results.remarks IS 
'Faculty remarks or comments about the student performance in this exam';

SELECT 'Remarks column added to exam_results successfully' as status;
