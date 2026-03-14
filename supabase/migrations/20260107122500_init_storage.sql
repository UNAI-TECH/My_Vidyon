-- Initialize the 'logos' storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true) 
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Policies for the 'logos' bucket (Idempotent)
-- 1. Public Read Access: Everyone can view logos
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Read Access') THEN
        CREATE POLICY "Public Read Access" 
        ON storage.objects FOR SELECT 
        USING (bucket_id = 'logos');
    END IF;
END $$;

-- 2. Admin Insert Access: Authenticated users can upload logos
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Admin Insert Access') THEN
        CREATE POLICY "Admin Insert Access" 
        ON storage.objects FOR INSERT 
        WITH CHECK (
            bucket_id = 'logos' 
            AND (auth.role() = 'authenticated')
        );
    END IF;
END $$;

-- 3. Admin Update/Delete Access: Authenticated users can manage logos
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Admin Update/Delete Access') THEN
        CREATE POLICY "Admin Update/Delete Access" 
        ON storage.objects FOR ALL
        USING (
            bucket_id = 'logos' 
            AND (auth.role() = 'authenticated')
        );
    END IF;
END $$;
