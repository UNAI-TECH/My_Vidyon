-- ============================================
-- Event Banners Storage Setup
-- ============================================
-- Run this script in Supabase SQL Editor to set up event banner storage
-- This will create the bucket and necessary policies

-- Step 1: Create the storage bucket for event banners
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-banners',
  'event-banners',
  true,
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;


-- Step 2: Set up Row Level Security (RLS) policies
-- ============================================

-- Policy 1: Allow authenticated institution users to upload banners
CREATE POLICY "Institution users can upload event banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-banners' AND
  (auth.jwt() ->> 'role')::text = 'institution'
);

-- Policy 2: Allow public read access (so everyone can view banners)
CREATE POLICY "Public can view event banners"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-banners');

-- Policy 3: Allow institution users to update their banners
CREATE POLICY "Institution users can update their event banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-banners' AND
  (auth.jwt() ->> 'role')::text = 'institution'
);

-- Policy 4: Allow institution users to delete their banners
CREATE POLICY "Institution users can delete their event banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-banners' AND
  (auth.jwt() ->> 'role')::text = 'institution'
);


-- Step 3: Add banner_url column to academic_events table
-- ============================================
DO $$ 
BEGIN
  -- Check if column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'academic_events' 
    AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE academic_events ADD COLUMN banner_url TEXT;
    
    -- Add helpful comment
    COMMENT ON COLUMN academic_events.banner_url IS 'Public URL of the event banner image from Supabase Storage';
    
    RAISE NOTICE 'Column banner_url added to academic_events table';
  ELSE
    RAISE NOTICE 'Column banner_url already exists in academic_events table';
  END IF;
END $$;


-- Step 4: Create index for better performance (optional)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_academic_events_banner_url 
ON academic_events(banner_url) 
WHERE banner_url IS NOT NULL;


-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify the setup

-- Check if bucket was created
SELECT * FROM storage.buckets WHERE id = 'event-banners';

-- Check if column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'academic_events' AND column_name = 'banner_url';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%event banner%';
