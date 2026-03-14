-- INCREASE STORAGE BUCKET SIZE LIMIT
-- Run this in Supabase SQL Editor to increase the file size limit to 10MB

UPDATE storage.buckets
SET file_size_limit = 10485760  -- 10MB in bytes
WHERE id = 'event-banners';

-- Verify the change
SELECT id, name, file_size_limit, 
       ROUND(file_size_limit / 1024.0 / 1024.0, 2) as size_mb
FROM storage.buckets 
WHERE id = 'event-banners';
