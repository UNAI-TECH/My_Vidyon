-- 1. Ensure the bucket exists (this part usually needs to be done via UI, but this SQL adds RLS)
-- Run this in your Supabase SQL Editor

-- Allow anyone to upload photos to 'student-photos'
CREATE POLICY "Allow public upload to student-photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'student-photos');

-- Allow anyone to view photos
CREATE POLICY "Allow public view to student-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'student-photos');

-- Allow anyone to delete/update their own if needed (optional)
CREATE POLICY "Allow public update/delete student-photos"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'student-photos');
