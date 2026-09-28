-- ============================================
-- Fix event-banners bucket and policies for Admin & Institution
-- ============================================

-- 1. Ensure event-banners bucket exists, is public, and has no restrictive MIME filter
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-banners',
  'event-banners',
  true,
  10485760, -- 10MB
  NULL      -- NULL removes restrictive MIME checks
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = NULL;

-- 2. Drop any legacy restrictive policies
DROP POLICY IF EXISTS "Institution users can upload event banners" ON storage.objects;
DROP POLICY IF EXISTS "Institution users can update their event banners" ON storage.objects;
DROP POLICY IF EXISTS "Institution users can delete their event banners" ON storage.objects;
DROP POLICY IF EXISTS "Public can view event banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update event banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete event banners" ON storage.objects;

-- 3. Public read policy
CREATE POLICY "Public can view event banners"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-banners');

-- 4. Authenticated upload policy (both Admin and Institution)
CREATE POLICY "Authenticated users can upload event banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-banners');

-- 5. Authenticated update policy
CREATE POLICY "Authenticated users can update event banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-banners');

-- 6. Authenticated delete policy
CREATE POLICY "Authenticated users can delete event banners"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-banners');

-- 7. Ensure columns exist on academic_events
ALTER TABLE public.academic_events ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.academic_events ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE public.academic_events ADD COLUMN IF NOT EXISTS is_admin_added BOOLEAN DEFAULT false;
