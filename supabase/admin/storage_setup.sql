-- Create the 'logos' bucket for institution logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true) 
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view logos
CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'logos');

-- Allow authenticated users (Admins) to upload logos
CREATE POLICY "Admin Insert Access" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'logos' 
    AND (auth.role() = 'authenticated')
);

-- Allow authenticated users (Admins) to delete/update logos
CREATE POLICY "Admin Update/Delete Access" 
ON storage.objects FOR ALL
USING (
    bucket_id = 'logos' 
    AND (auth.role() = 'authenticated')
);
