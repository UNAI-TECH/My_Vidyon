-- Check students table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'students'
ORDER BY ordinal_position;
