DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'parent_id') THEN
        ALTER TABLE public.students ADD COLUMN parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'class_id') THEN
        ALTER TABLE public.assignments ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'subject_id') THEN
        ALTER TABLE public.assignments ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'teacher_id') THEN
        ALTER TABLE public.assignments ADD COLUMN teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'grades' AND column_name = 'subject_id') THEN
        ALTER TABLE public.grades ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'grades' AND column_name = 'graded_by') THEN
        ALTER TABLE public.grades ADD COLUMN graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;
