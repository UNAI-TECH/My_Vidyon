-- Create table for Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL, -- References institutions(id)
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL, -- References profiles(id)
    target_audience TEXT NOT NULL, -- 'All Students', 'Class 10-A', etc.
    type TEXT DEFAULT 'info', -- 'info', 'important', 'warning'
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone in the institution can view announcements
CREATE POLICY "Enable read access for all users in institution" ON announcements
    FOR SELECT USING (institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid()));

-- Policy: Only admins and faculty (and institution role) can create announcements
-- We removed 'staff' because it is not a valid enum value in user_role.
-- Assuming 'institution' role corresponds to admin privileges or similar.
CREATE POLICY "Enable insert access for admins/faculty" ON announcements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'faculty', 'institution')
        )
    );
