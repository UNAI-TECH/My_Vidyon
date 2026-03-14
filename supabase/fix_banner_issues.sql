-- ============================================
-- BANNER FIX SCRIPT - Run this to fix banner display issues
-- ============================================

-- STEP 1: Check if banner_url column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'academic_events' 
AND column_name = 'banner_url';

-- If the above returns NO ROWS, run this:
ALTER TABLE academic_events ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- ============================================
-- STEP 2: Check current events
-- ============================================
SELECT 
    id,
    title,
    event_type,
    banner_url,
    created_at,
    CASE 
        WHEN banner_url IS NULL THEN '❌ No banner'
        WHEN banner_url = '' THEN '❌ Empty banner'
        ELSE '✅ Has banner'
    END as banner_status
FROM academic_events
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- STEP 3: Check storage bucket
-- ============================================
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'event-banners';

-- If the above returns NO ROWS, you need to create the bucket
-- Go to Supabase Dashboard → Storage → New Bucket
-- Name: event-banners
-- Public: YES (checked)
-- File size limit: 5242880

-- ============================================
-- STEP 4: Check storage policies
-- ============================================
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%event%';

-- ============================================
-- STEP 5: If policies are missing, create them
-- ============================================

-- Policy 1: Public read access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Public can view event banners'
    ) THEN
        CREATE POLICY "Public can view event banners"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'event-banners');
    END IF;
END $$;

-- Policy 2: Institution upload access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Institution users can upload event banners'
    ) THEN
        CREATE POLICY "Institution users can upload event banners"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'event-banners' AND
            (auth.jwt() ->> 'role')::text = 'institution'
        );
    END IF;
END $$;

-- Policy 3: Institution update access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Institution users can update their event banners'
    ) THEN
        CREATE POLICY "Institution users can update their event banners"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (
            bucket_id = 'event-banners' AND
            (auth.jwt() ->> 'role')::text = 'institution'
        );
    END IF;
END $$;

-- Policy 4: Institution delete access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Institution users can delete their event banners'
    ) THEN
        CREATE POLICY "Institution users can delete their event banners"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'event-banners' AND
            (auth.jwt() ->> 'role')::text = 'institution'
        );
    END IF;
END $$;

-- ============================================
-- STEP 6: Test by creating a new event
-- ============================================
-- After running this script:
-- 1. Go to Institution Calendar
-- 2. Click "Add Event"
-- 3. Fill in all fields
-- 4. Upload a small image (< 1MB)
-- 5. Click "Save Event"
-- 6. Check if banner displays

-- ============================================
-- VERIFICATION
-- ============================================

-- Check the most recent event
SELECT 
    id,
    title,
    banner_url,
    created_at
FROM academic_events
ORDER BY created_at DESC
LIMIT 1;

-- If banner_url is NULL:
-- → Event was created before banner feature was added
-- → OR upload failed
-- → Edit the event and upload a banner

-- If banner_url has a value:
-- → Copy the URL and paste in browser
-- → If image loads: ✅ Everything is working
-- → If 404 error: ❌ File doesn't exist in storage
-- → If 403 error: ❌ Storage policies are wrong

-- ============================================
-- COMMON ISSUES & SOLUTIONS
-- ============================================

-- Issue 1: "Column banner_url doesn't exist"
-- Solution: Run the ALTER TABLE command above

-- Issue 2: "Bucket not found"
-- Solution: Create bucket in Supabase Dashboard

-- Issue 3: "Policy violation"
-- Solution: Run the policy creation commands above

-- Issue 4: "Old events have no banners"
-- Solution: This is expected. Edit old events to add banners.

-- ============================================
-- SUCCESS INDICATORS
-- ============================================
-- ✅ banner_url column exists
-- ✅ event-banners bucket exists and is public
-- ✅ 4 storage policies exist
-- ✅ New events have banner_url populated
-- ✅ Banner URLs are accessible in browser
-- ✅ Banners display in calendar
