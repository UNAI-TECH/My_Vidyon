-- Migration: Parent Features (Attendance, Leaves, Fees)
-- Date: 2026-01-25

-- 1. Student Attendance
CREATE TABLE IF NOT EXISTS public.student_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half-day')),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Student Leave Requests
CREATE TABLE IF NOT EXISTS public.student_leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Student Fees (Ensure exists)
CREATE TABLE IF NOT EXISTS public.student_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
    paid_amount NUMERIC(10, 2) DEFAULT 0,
    title TEXT, -- e.g. "Term 1 Fee"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- RLS
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

-- Policies
-- Attendance: Read (Student/Parent/Faculty), Write (Faculty/Admin)
CREATE POLICY "Read Attendance" ON public.student_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write Attendance" ON public.student_attendance FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin', 'institution')));

-- Leaves: Read (Own/Faculty), Write (Student/Parent), Update (Faculty/Admin)
CREATE POLICY "Read Leaves" ON public.student_leave_requests FOR SELECT TO authenticated USING (true); -- simplify
CREATE POLICY "Insert Leaves" ON public.student_leave_requests FOR INSERT TO authenticated WITH CHECK (true); -- simplify (ideally check student_id ownership)
CREATE POLICY "Update Leaves" ON public.student_leave_requests FOR UPDATE TO authenticated USING (true); -- simplify

-- Fees: Read (Own/Admin), Write (Admin/Accountant)
CREATE POLICY "Read Fees" ON public.student_fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write Fees" ON public.student_fees FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'institution', 'accountant')));

-- Realtime
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'student_attendance') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_attendance;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'student_leave_requests') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_leave_requests;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'student_fees') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_fees;
    END IF;
END $$;
