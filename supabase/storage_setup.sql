-- 1. Create the 'reports' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Authenticated users (Institution Admins) to upload reports
CREATE POLICY "Allow Authenticated Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports');

-- 3. Allow Authenticated users to read reports
CREATE POLICY "Allow Authenticated Reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reports');

-- 4. Allow Authenticated users to update/overwrite reports
CREATE POLICY "Allow Authenticated Updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'reports');
