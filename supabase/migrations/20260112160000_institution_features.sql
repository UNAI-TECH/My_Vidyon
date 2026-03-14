-- Migration: Institution Features (Calendar, Fees, Leaves)
-- Date: 2026-01-12 16:30:00

-- 1. Ensure columns in subjects (department, code)
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS code TEXT;

-- 1b. Ensure 'class_teacher_id' in classes
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS class_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Academic Calendar
CREATE TABLE IF NOT EXISTS public.academic_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL, -- 'exam', 'holiday', 'event', 'deadline'
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Fee Structure
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "Grade 10 Annual Fee"
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    due_date TIMESTAMP WITH TIME ZONE,
    description JSONB, -- Breakdown: { "Tuition": 5000, "Transport": 1000 }
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL, -- Optional link to class
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3b. Student Fees (Payments)
CREATE TABLE IF NOT EXISTS public.student_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
    amount_paid NUMERIC(10, 2) DEFAULT 0,
    amount_due NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending', -- 'paid', 'partial', 'pending', 'overdue'
    last_payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Staff Leaves
CREATE TABLE IF NOT EXISTS public.staff_leaves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL, -- 'sick', 'casual', 'earned', etc.
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- 'approved', 'rejected', 'pending'
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_leaves ENABLE ROW LEVEL SECURITY;

-- Policies
-- Policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.academic_events;
CREATE POLICY "Enable all access for authenticated users" ON public.academic_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.fee_structures;
CREATE POLICY "Enable all access for authenticated users" ON public.fee_structures FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.student_fees;
CREATE POLICY "Enable all access for authenticated users" ON public.student_fees FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.staff_leaves;
CREATE POLICY "Enable all access for authenticated users" ON public.staff_leaves FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime
-- Realtime
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'academic_events') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.academic_events;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fee_structures') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_structures;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'student_fees') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_fees;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'staff_leaves') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_leaves;
    END IF;
END $$;
