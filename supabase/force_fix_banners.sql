-- FORCE FIX SCRIPT
-- This script will forcefully fix potential issues by recreating policies
-- Run this in Supabase SQL Editor

-- 1. Ensure Column Exists
ALTER TABLE academic_events ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 2. Ensure Bucket Exists (Idempotent insert)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-banners',
  'event-banners',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- 3. DROP Existing Policies to ensure clean slate (in case they are wrong)
DROP POLICY IF EXISTS "Public can view event banners" ON storage.objects;
DROP POLICY IF EXISTS "Institution users can upload event banners" ON storage.objects;
DROP POLICY IF EXISTS "Institution users can update their event banners" ON storage.objects;
DROP POLICY IF EXISTS "Institution users can delete their event banners" ON storage.objects;

-- 4. Recreate Policies Correctly

-- Public Read
CREATE POLICY "Public can view event banners"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-banners');

-- Institution Upload
CREATE POLICY "Institution users can upload event banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-banners' AND
  (auth.jwt() ->> 'role')::text = 'institution'
);

-- Institution Update
CREATE POLICY "Institution users can update their event banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-banners' AND
  (auth.jwt() ->> 'role')::text = 'institution'
);

-- Institution Delete
CREATE POLICY "Institution users can delete their event banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-banners' AND
  (auth.jwt() ->> 'role')::text = 'institution'
);

-- 5. Verification
SELECT id, name, public FROM storage.buckets WHERE id = 'event-banners';
