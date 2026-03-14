-- Create exam_schedules and exam_schedule_entries tables if they don't exist
-- These tables will sync exams across institution calendar and student timetables

CREATE TABLE IF NOT EXISTS public.exam_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    section TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_schedule_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_schedule_id UUID NOT NULL REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    syllabus_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exam_schedules_institution ON public.exam_schedules(institution_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_class ON public.exam_schedules(class_name, section);
CREATE INDEX IF NOT EXISTS idx_exam_entries_schedule ON public.exam_schedule_entries(exam_schedule_id);
CREATE INDEX IF NOT EXISTS idx_exam_entries_date ON public.exam_schedule_entries(exam_date);

-- Enable RLS
ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_schedule_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_schedules
DROP POLICY IF EXISTS "Institution manages exam schedules" ON public.exam_schedules;
CREATE POLICY "Institution manages exam schedules" 
ON public.exam_schedules FOR ALL TO authenticated
USING (
    institution_id IN (
        SELECT institution_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('institution', 'admin', 'faculty')
    )
)
WITH CHECK (
    institution_id IN (
        SELECT institution_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('institution', 'admin', 'faculty')
    )
);

DROP POLICY IF EXISTS "Students view own class exams" ON public.exam_schedules;
CREATE POLICY "Students view own class exams"
ON public.exam_schedules FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.students
        WHERE id = auth.uid()
        AND class_name = exam_schedules.class_name
        AND section = exam_schedules.section
    )
);

-- RLS Policies for exam_schedule_entries (allow cascade delete)
DROP POLICY IF EXISTS "Everyone views entries" ON public.exam_schedule_entries;
CREATE POLICY "Everyone views entries"
ON public.exam_schedule_entries FOR SELECT TO authenticated
USING (
    exam_schedule_id IN (
        SELECT id FROM public.exam_schedules
    )
);

DROP POLICY IF EXISTS "Institution manages entries" ON public.exam_schedule_entries;
CREATE POLICY "Institution manages entries"
ON public.exam_schedule_entries FOR ALL TO authenticated
USING (
    exam_schedule_id IN (
        SELECT id FROM public.exam_schedules
        WHERE institution_id IN (
            SELECT institution_id FROM public.profiles
            WHERE id = auth.uid() AND role IN ('institution', 'admin', 'faculty')
        )
    )
)
WITH CHECK (
    exam_schedule_id IN (
        SELECT id FROM public.exam_schedules
        WHERE institution_id IN (
            SELECT institution_id FROM public.profiles
            WHERE id = auth.uid() AND role IN ('institution', 'admin', 'faculty')
        )
    )
);

-- Add to realtime publication
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_schedules;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_schedule_entries;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
