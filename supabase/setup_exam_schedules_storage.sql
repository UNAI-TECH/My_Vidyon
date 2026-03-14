-- ============================================
-- EXAM SCHEDULES STORAGE BUCKET SETUP
-- ============================================
-- Run this in Supabase SQL Editor

-- Step 1: Create the storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'exam-schedules',
    'exam-schedules',
    false,  -- Private bucket
    10485760,  -- 10MB limit
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Step 2: Drop existing policies (if any)
DROP POLICY IF EXISTS "Authenticated users can upload exam schedules" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view exam schedules" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own exam schedule uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to exam-schedules" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from exam-schedules" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own files in exam-schedules" ON storage.objects;

-- Step 3: Create new RLS policies for exam-schedules bucket

-- Policy 1: Allow authenticated users to INSERT (upload) files
CREATE POLICY "Allow authenticated uploads to exam-schedules"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'exam-schedules'
);

-- Policy 2: Allow authenticated users to SELECT (view/download) files
CREATE POLICY "Allow authenticated reads from exam-schedules"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'exam-schedules'
);

-- Policy 3: Allow users to UPDATE their own files
CREATE POLICY "Allow users to update own files in exam-schedules"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'exam-schedules' AND
    auth.uid() = owner
)
WITH CHECK (
    bucket_id = 'exam-schedules' AND
    auth.uid() = owner
);

-- Policy 4: Allow users to DELETE their own files
CREATE POLICY "Allow users to delete own files in exam-schedules"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'exam-schedules' AND
    auth.uid() = owner
);

-- Step 4: Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%exam-schedules%'
ORDER BY policyname;

-- Step 5: Verify the bucket
SELECT * FROM storage.buckets WHERE id = 'exam-schedules';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if bucket exists
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'exam-schedules';

-- Check all policies for storage.objects
SELECT 
    policyname,
    cmd as operation,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%exam-schedules%'
ORDER BY policyname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Exam schedules storage bucket setup complete!';
    RAISE NOTICE '✅ Bucket: exam-schedules (private, 10MB limit)';
    RAISE NOTICE '✅ RLS Policies: 4 policies created';
    RAISE NOTICE '✅ Authenticated users can now upload/view/delete files';
END $$;
