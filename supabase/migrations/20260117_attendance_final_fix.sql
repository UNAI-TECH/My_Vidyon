-- 1. Create Staff Attendance Table if missing
CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL, -- Use TEXT to match app logic (e.g. MYVID2026)
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'present',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, attendance_date)
);

-- Enable RLS for staff_attendance
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- Policies for staff_attendance
CREATE POLICY "Public view staff attendance" ON public.staff_attendance FOR SELECT USING (true);
CREATE POLICY "Admin manage staff attendance" ON public.staff_attendance FOR ALL USING (true);

-- 2. Fix Student Attendance institution_id type
-- If student_attendance was already created with UUID, convert it:
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_attendance' AND column_name = 'institution_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.student_attendance ALTER COLUMN institution_id TYPE TEXT;
    END IF;
END $$;
