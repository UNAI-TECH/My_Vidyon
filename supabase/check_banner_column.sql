-- Quick check and fix for banner_url column
-- Run this in Supabase SQL Editor

-- 1. Check if banner_url column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'academic_events' 
AND column_name = 'banner_url';

-- 2. If the above returns no results, run this to add the column:
ALTER TABLE academic_events ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 3. Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'academic_events' 
AND column_name = 'banner_url';

-- 4. Check existing events to see if they have banner_url
SELECT id, title, banner_url 
FROM academic_events 
LIMIT 5;
