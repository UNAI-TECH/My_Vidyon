-- Create Storage Buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('certificates', 'certificates', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('materials', 'materials', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('assignments', 'assignments', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure public access for all buckets
DROP POLICY IF EXISTS "Public Access for Certificates" ON storage.objects;
CREATE POLICY "Public Access for Certificates" ON storage.objects FOR SELECT USING (bucket_id = 'certificates');

DROP POLICY IF EXISTS "Public Access for Materials" ON storage.objects;
CREATE POLICY "Public Access for Materials" ON storage.objects FOR SELECT USING (bucket_id = 'materials');

DROP POLICY IF EXISTS "Public Access for Assignments" ON storage.objects;
CREATE POLICY "Public Access for Assignments" ON storage.objects FOR SELECT USING (bucket_id = 'assignments');

-- Ensure authenticated uploads for all buckets
DROP POLICY IF EXISTS "Authenticated Upload for Certificates" ON storage.objects;
CREATE POLICY "Authenticated Upload for Certificates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'certificates');

DROP POLICY IF EXISTS "Authenticated Upload for Materials" ON storage.objects;
CREATE POLICY "Authenticated Upload for Materials" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'materials');

DROP POLICY IF EXISTS "Authenticated Upload for Assignments" ON storage.objects;
CREATE POLICY "Authenticated Upload for Assignments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assignments');

-- Allow users to delete their own uploads (optional but recommended)
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE TO authenticated USING (auth.uid() = owner);
