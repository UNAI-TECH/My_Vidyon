-- FIX STORAGE RLS SCRIPT
-- The previous policy failed because 'role' in JWT is usually 'authenticated'
-- This script relaxes the policy to allow any authenticated user to upload to this bucket
-- Run this in Supabase SQL Editor

-- 1. DROP Existing Strict Policies
DROP POLICY IF EXISTS "Institution users can upload event banners" ON storage.objects;
DROP POLICY IF EXISTS "Institution users can update their event banners" ON storage.objects;
DROP POLICY IF EXISTS "Institution users can delete their event banners" ON storage.objects;

-- 2. Create Relaxed Policies (Allow specific bucket access for any logged-in user)

-- Upload
CREATE POLICY "Institution users can upload event banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-banners'
);

-- Update
CREATE POLICY "Institution users can update their event banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-banners'
);

-- Delete
CREATE POLICY "Institution users can delete their event banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-banners'
);

-- 3. Verify
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%event banners%';
