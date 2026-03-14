-- Create table for Student Attendance
CREATE TABLE IF NOT EXISTS public.student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'present',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, attendance_date)
);

-- Enable RLS
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view student attendance" 
ON public.student_attendance FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage attendance" 
ON public.student_attendance FOR ALL
USING (true); -- Simplified for now, should be restricted to institution_id in production
