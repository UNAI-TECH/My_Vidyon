-- Create table for storing face embeddings
CREATE TABLE IF NOT EXISTS public.face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    embedding FLOAT8[], -- Using float8[] for cross-platform compatibility without pgvector requirement
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own embeddings" 
ON public.face_embeddings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage embeddings" 
ON public.face_embeddings FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('institution', 'admin')
    )
);

-- Function to handle timestamp update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_face_embeddings_updated_at
    BEFORE UPDATE ON public.face_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
