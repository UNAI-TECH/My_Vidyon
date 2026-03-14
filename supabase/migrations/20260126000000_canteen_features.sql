
-- Create Canteen Attendance Table
CREATE TABLE IF NOT EXISTS public.canteen_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL,
    canteen_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'absent', -- 'present' means permitted/entered
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, canteen_date)
);

-- Enable RLS
ALTER TABLE public.canteen_attendance ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public view canteen attendance" ON public.canteen_attendance FOR SELECT USING (true);
CREATE POLICY "Admin manage canteen attendance" ON public.canteen_attendance FOR ALL USING (true);
