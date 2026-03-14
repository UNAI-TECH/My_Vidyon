-- ============================================
-- EXAM SCHEDULES - DATABASE SCHEMA
-- ============================================

-- 1. Create exam_schedules table
CREATE TABLE IF NOT EXISTS exam_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    section TEXT NOT NULL,
    exam_type TEXT NOT NULL, -- 'mid-term-1', 'quarterly', 'mid-term-2', 'half-yearly', 'model', 'annual'
    exam_display_name TEXT NOT NULL, -- 'Mid-Term 1', 'Quarterly', etc.
    academic_year TEXT NOT NULL, -- '2025-2026'
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one schedule per exam type per class per year
    UNIQUE(institution_id, class_id, section, exam_type, academic_year)
);

-- 2. Create exam_schedule_entries table
CREATE TABLE IF NOT EXISTS exam_schedule_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_schedule_id UUID REFERENCES exam_schedules(id) ON DELETE CASCADE,
    exam_date DATE NOT NULL,
    day_of_week TEXT NOT NULL, -- 'Monday', 'Tuesday', etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject TEXT NOT NULL,
    syllabus_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Order by date and time
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- 3. Create exam_schedule_uploads table (for file uploads)
CREATE TABLE IF NOT EXISTS exam_schedule_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_schedule_id UUID REFERENCES exam_schedules(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL, -- Supabase Storage URL
    file_type TEXT NOT NULL, -- 'pdf', 'docx', 'doc'
    file_size INTEGER, -- in bytes
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exam_schedules_institution ON exam_schedules(institution_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_class ON exam_schedules(class_id, section);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_created_by ON exam_schedules(created_by);
CREATE INDEX IF NOT EXISTS idx_exam_schedule_entries_schedule_id ON exam_schedule_entries(exam_schedule_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedule_entries_date ON exam_schedule_entries(exam_date);

-- 5. Enable Row Level Security
ALTER TABLE exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_schedule_uploads ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for exam_schedules

-- Faculty can view schedules for their institution
CREATE POLICY "Faculty can view exam schedules for their institution"
ON exam_schedules FOR SELECT
TO authenticated
USING (
    institution_id = (auth.jwt() -> 'user_metadata' ->> 'institution_id')
);

-- Faculty can create schedules for their institution
CREATE POLICY "Faculty can create exam schedules"
ON exam_schedules FOR INSERT
TO authenticated
WITH CHECK (
    institution_id = (auth.jwt() -> 'user_metadata' ->> 'institution_id') AND
    created_by = auth.uid()
);

-- Faculty can update their own schedules
CREATE POLICY "Faculty can update their own exam schedules"
ON exam_schedules FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Faculty can delete their own schedules
CREATE POLICY "Faculty can delete their own exam schedules"
ON exam_schedules FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Students can view schedules for their class
CREATE POLICY "Students can view exam schedules for their class"
ON exam_schedules FOR SELECT
TO authenticated
USING (
    institution_id = (auth.jwt() -> 'user_metadata' ->> 'institution_id') AND
    class_id = (auth.jwt() -> 'user_metadata' ->> 'class_id') AND
    section = (auth.jwt() -> 'user_metadata' ->> 'section')
);

-- 7. RLS Policies for exam_schedule_entries

-- Anyone who can see the schedule can see its entries
CREATE POLICY "Users can view exam schedule entries"
ON exam_schedule_entries FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM exam_schedules
        WHERE exam_schedules.id = exam_schedule_entries.exam_schedule_id
    )
);

-- Faculty can insert entries for their schedules
CREATE POLICY "Faculty can create exam schedule entries"
ON exam_schedule_entries FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM exam_schedules
        WHERE exam_schedules.id = exam_schedule_entries.exam_schedule_id
        AND exam_schedules.created_by = auth.uid()
    )
);

-- Faculty can update entries for their schedules
CREATE POLICY "Faculty can update exam schedule entries"
ON exam_schedule_entries FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM exam_schedules
        WHERE exam_schedules.id = exam_schedule_entries.exam_schedule_id
        AND exam_schedules.created_by = auth.uid()
    )
);

-- Faculty can delete entries for their schedules
CREATE POLICY "Faculty can delete exam schedule entries"
ON exam_schedule_entries FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM exam_schedules
        WHERE exam_schedules.id = exam_schedule_entries.exam_schedule_id
        AND exam_schedules.created_by = auth.uid()
    )
);

-- 8. RLS Policies for exam_schedule_uploads

-- Anyone who can see the schedule can see uploads
CREATE POLICY "Users can view exam schedule uploads"
ON exam_schedule_uploads FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM exam_schedules
        WHERE exam_schedules.id = exam_schedule_uploads.exam_schedule_id
    )
);

-- Faculty can upload files for their schedules
CREATE POLICY "Faculty can upload exam schedule files"
ON exam_schedule_uploads FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM exam_schedules
        WHERE exam_schedules.id = exam_schedule_uploads.exam_schedule_id
        AND exam_schedules.created_by = auth.uid()
    )
);

-- Faculty can delete uploads for their schedules
CREATE POLICY "Faculty can delete exam schedule uploads"
ON exam_schedule_uploads FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM exam_schedules
        WHERE exam_schedules.id = exam_schedule_uploads.exam_schedule_id
        AND exam_schedules.created_by = auth.uid()
    )
);

-- 9. Create Storage Bucket (run this in Supabase Dashboard or via API)
-- Bucket name: exam-schedules
-- Public: false
-- File size limit: 10485760 (10MB)
-- Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- Storage RLS Policies (to be created in Supabase Dashboard)
-- 1. Faculty can upload: bucket_id = 'exam-schedules' AND auth.role() = 'authenticated'
-- 2. Users can view: bucket_id = 'exam-schedules' AND auth.role() = 'authenticated'

-- 10. Verification queries
SELECT 'exam_schedules table created' as status FROM exam_schedules LIMIT 0;
SELECT 'exam_schedule_entries table created' as status FROM exam_schedule_entries LIMIT 0;
SELECT 'exam_schedule_uploads table created' as status FROM exam_schedule_uploads LIMIT 0;
