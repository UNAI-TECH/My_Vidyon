-- Create table for Staff Attendance
CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'present',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, attendance_date)
);

-- Enable RLS
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff can view their own attendance" 
ON public.staff_attendance FOR SELECT 
USING (auth.uid() = staff_id);

CREATE POLICY "Staff can insert their own attendance" 
ON public.staff_attendance FOR INSERT 
WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Admins can view all attendance for their institution" 
ON public.staff_attendance FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'institution' AND institution_id = staff_attendance.institution_id
    )
);
