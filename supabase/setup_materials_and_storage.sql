-- Create Subject Materials Table
CREATE TABLE IF NOT EXISTS public.subject_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    section TEXT,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subject_materials ENABLE ROW LEVEL SECURITY;

-- Policies for Subject Materials
CREATE POLICY "Everyone in institution can view materials" 
ON public.subject_materials FOR SELECT 
USING (true); -- Simplified for now, can be restricted by institution_id

CREATE POLICY "Faculty can manage their own materials" 
ON public.subject_materials FOR ALL 
TO authenticated 
USING (faculty_id = auth.uid()) 
WITH CHECK (faculty_id = auth.uid());

-- Storage Buckets Setup (Run these in SQL Editor if bucket creation via API is not preferred)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('assignments', 'assignments', true) ON CONFLICT DO NOTHING;

-- Storage Policies for Certificates
CREATE POLICY "Public Access for Certificates" ON storage.objects FOR SELECT USING (bucket_id = 'certificates');
CREATE POLICY "Authenticated Upload for Certificates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'certificates');

-- Storage Policies for Materials
CREATE POLICY "Public Access for Materials" ON storage.objects FOR SELECT USING (bucket_id = 'materials');
CREATE POLICY "Authenticated Upload for Materials" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'materials');

-- Storage Policies for Assignments
CREATE POLICY "Public Access for Assignments" ON storage.objects FOR SELECT USING (bucket_id = 'assignments');
CREATE POLICY "Authenticated Upload for Assignments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assignments');
