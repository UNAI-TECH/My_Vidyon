-- Create storage bucket for event banners
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-banners',
  'event-banners',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for event-banners bucket

-- Policy: Allow authenticated users to upload banners (institution role)
CREATE POLICY "Institution users can upload event banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-banners' AND
  (auth.jwt() ->> 'role')::text = 'institution'
);

-- Policy: Allow public read access to event banners
CREATE POLICY "Public can view event banners"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-banners');

-- Policy: Allow institution users to update their own banners
CREATE POLICY "Institution users can update their event banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-banners' AND
  (auth.jwt() ->> 'role')::text = 'institution'
);

-- Policy: Allow institution users to delete their own banners
CREATE POLICY "Institution users can delete their event banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-banners' AND
  (auth.jwt() ->> 'role')::text = 'institution'
);

-- Add banner_url column to academic_events table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'academic_events' 
    AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE academic_events ADD COLUMN banner_url TEXT;
    
    -- Add comment to the column
    COMMENT ON COLUMN academic_events.banner_url IS 'Public URL of the event banner image stored in Supabase Storage';
  END IF;
END $$;

-- Create index on banner_url for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_academic_events_banner_url 
ON academic_events(banner_url) 
WHERE banner_url IS NOT NULL;
