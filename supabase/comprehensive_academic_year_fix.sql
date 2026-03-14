-- COMPREHENSIVE FIX FOR ACADEMIC YEAR TRANSITION
-- This script adds missing columns to all relevant tables to prevent '400 Bad Request' errors.

DO $$ 
DECLARE
    v_inst_uuid UUID;
BEGIN
    -- Try to find the UUID for KTC if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'institutions') THEN
        SELECT id INTO v_inst_uuid FROM public.institutions WHERE institution_id = 'KTC' LIMIT 1;
    END IF;

    -- 1. FIX PROFILES TABLE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'academic_year') THEN
        ALTER TABLE public.profiles ADD COLUMN academic_year TEXT DEFAULT '2025-26';
        RAISE NOTICE 'Added academic_year to profiles';
    END IF;

    -- 2. FIX INSTITUTIONS TABLE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'current_academic_year') THEN
        ALTER TABLE public.institutions ADD COLUMN current_academic_year TEXT DEFAULT '2025-26';
        RAISE NOTICE 'Added current_academic_year to institutions';
    END IF;

    -- 3. FIX CLASSES TABLE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'classes' AND column_name = 'academic_year') THEN
        ALTER TABLE public.classes ADD COLUMN academic_year TEXT DEFAULT '2025-26';
        RAISE NOTICE 'Added academic_year to classes';
    END IF;

    -- 4. FIX GROUPS TABLE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'groups' AND column_name = 'academic_year') THEN
        ALTER TABLE public.groups ADD COLUMN academic_year TEXT DEFAULT '2025-26';
        RAISE NOTICE 'Added academic_year to groups';
    END IF;

    -- 5. FIX STUDENTS TABLE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'academic_year') THEN
        ALTER TABLE public.students ADD COLUMN academic_year TEXT;
        RAISE NOTICE 'Added academic_year to students';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'is_active') THEN
        ALTER TABLE public.students ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active to students';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'profile_id') THEN
        ALTER TABLE public.students ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added profile_id to students';
    END IF;

    -- 6. FIX TIMETABLE_CONFIGS TABLE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'timetable_configs' AND column_name = 'academic_year') THEN
        ALTER TABLE public.timetable_configs ADD COLUMN academic_year TEXT DEFAULT '2025-26';
        RAISE NOTICE 'Added academic_year to timetable_configs';
    END IF;

    -- 7. FIX FACULTY_SUBJECTS TABLE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'faculty_subjects' AND column_name = 'academic_year') THEN
        ALTER TABLE public.faculty_subjects ADD COLUMN academic_year TEXT DEFAULT '2025-26';
        RAISE NOTICE 'Added academic_year to faculty_subjects';
    END IF;

    -- 8. FIX ANNOUNCEMENTS TABLE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'target_class_id') THEN
        ALTER TABLE public.announcements ADD COLUMN target_class_id UUID REFERENCES public.classes(id);
        RAISE NOTICE 'Added target_class_id to announcements';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'target_subject_id') THEN
        ALTER TABLE public.announcements ADD COLUMN target_subject_id UUID REFERENCES public.subjects(id);
        RAISE NOTICE 'Added target_subject_id to announcements';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'target_section') THEN
        ALTER TABLE public.announcements ADD COLUMN target_section TEXT;
        RAISE NOTICE 'Added target_section to announcements';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'academic_year') THEN
        ALTER TABLE public.announcements ADD COLUMN academic_year TEXT DEFAULT '2025-26';
        RAISE NOTICE 'Added academic_year to announcements';
    END IF;

    -- Add category column if it doesn't exist (for info, important, warning)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'category') THEN
        ALTER TABLE public.announcements ADD COLUMN category TEXT DEFAULT 'info';
        RAISE NOTICE 'Added category to announcements';
    END IF;

    -- RELAX/UPDATE TYPE CHECK CONSTRAINT
    BEGIN
        ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_type_check;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Constraint announcements_type_check not found or already dropped';
    END;

    ALTER TABLE public.announcements ADD CONSTRAINT announcements_type_check 
    CHECK (type IN ('all', 'students', 'faculty', 'parents', 'class', 'info', 'important', 'warning'));

    -- 9. FIX TRANSACTIONAL TABLES (Missing academic_year)
    -- STAFF_DETAILS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_details') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_details' AND column_name = 'academic_year') THEN
            ALTER TABLE public.staff_details ADD COLUMN academic_year TEXT DEFAULT '2025-26';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_details' AND column_name = 'staff_id') THEN
            ALTER TABLE public.staff_details ADD COLUMN staff_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_details' AND column_name = 'image_url') THEN
            ALTER TABLE public.staff_details ADD COLUMN image_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_details' AND column_name = 'class_assigned') THEN
            ALTER TABLE public.staff_details ADD COLUMN class_assigned TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_details' AND column_name = 'section_assigned') THEN
            ALTER TABLE public.staff_details ADD COLUMN section_assigned TEXT;
        END IF;
    END IF;

    -- ASSIGNMENTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'academic_year') THEN
            ALTER TABLE public.assignments ADD COLUMN academic_year TEXT DEFAULT '2025-26';
        END IF;
    END IF;

    -- ATTENDANCE
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_attendance') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_attendance' AND column_name = 'academic_year') THEN
            ALTER TABLE public.student_attendance ADD COLUMN academic_year TEXT DEFAULT '2025-26';
        END IF;
    END IF;

    -- LEAVE REQUESTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_requests' AND column_name = 'academic_year') THEN
            ALTER TABLE public.leave_requests ADD COLUMN academic_year TEXT DEFAULT '2025-26';
        END IF;
    END IF;

    -- EXAM SCHEDULE
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exam_schedule') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exam_schedule' AND column_name = 'academic_year') THEN
            ALTER TABLE public.exam_schedule ADD COLUMN academic_year TEXT DEFAULT '2025-26';
        END IF;
    END IF;

    -- ACADEMIC EVENTS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'academic_events') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'academic_events' AND column_name = 'academic_year') THEN
            ALTER TABLE public.academic_events ADD COLUMN academic_year TEXT DEFAULT '2025-26';
        END IF;
    END IF;

    -- NOTIFICATIONS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'academic_year') THEN
            ALTER TABLE public.notifications ADD COLUMN academic_year TEXT DEFAULT '2025-26';
        END IF;
    END IF;

    -- 10. BACKFILL DATA (Dynamic UUID Handing)
    IF v_inst_uuid IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
            UPDATE public.students SET profile_id = id WHERE profile_id IS NULL;
        END IF;
        
        -- Profiles might use the slug or the UUID - we'll check both for resilience
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
            UPDATE public.profiles SET academic_year = '2026-27' 
            WHERE institution_id::text = 'KTC' OR (v_inst_uuid IS NOT NULL AND institution_id = v_inst_uuid);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
            UPDATE public.students SET academic_year = '2026-27' 
            WHERE institution_id::text = 'KTC' OR (v_inst_uuid IS NOT NULL AND institution_id = v_inst_uuid);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'institutions') THEN
            UPDATE public.institutions SET current_academic_year = '2026-27' WHERE institution_id = 'KTC';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_details') THEN
            UPDATE public.staff_details SET academic_year = '2026-27' 
            WHERE institution_id::text = 'KTC' OR (v_inst_uuid IS NOT NULL AND institution_id = v_inst_uuid);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') THEN
            UPDATE public.assignments SET academic_year = '2026-27' 
            WHERE institution_id::text = 'KTC' OR (v_inst_uuid IS NOT NULL AND institution_id = v_inst_uuid);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_attendance') THEN
            UPDATE public.student_attendance SET academic_year = '2026-27' 
            WHERE institution_id::text = 'KTC' OR (v_inst_uuid IS NOT NULL AND institution_id = v_inst_uuid);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
            UPDATE public.announcements SET academic_year = '2026-27' 
            WHERE institution_id::text = 'KTC' OR (v_inst_uuid IS NOT NULL AND institution_id = v_inst_uuid);
        END IF;
    END IF;

    RAISE NOTICE 'Academic year structure synchronization complete!';
END $$;
