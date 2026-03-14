-- Create table for Assignments
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    class_name TEXT NOT NULL, -- Target class, e.g. 'Grade 10-A'
    section TEXT, -- Optional
    due_date DATE,
    created_by UUID NOT NULL, -- Faculty ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for Submissions
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id TEXT NOT NULL, -- Can be UUID or string title for flexibility with mocks
    student_id UUID NOT NULL,
    student_name TEXT,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    status TEXT DEFAULT 'submitted',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    grade TEXT,
    feedback TEXT
);

-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for demo)
CREATE POLICY "Enable read access for all" ON assignments FOR SELECT USING (true);
CREATE POLICY "Enable insert for faculty" ON assignments FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all" ON submissions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON submissions FOR INSERT WITH CHECK (true);
