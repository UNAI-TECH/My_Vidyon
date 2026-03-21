-- Add missing total_marks column to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 100;

-- Update existing assignments if any (optional but good practice)
-- UPDATE assignments SET total_marks = 100 WHERE total_marks IS NULL;
