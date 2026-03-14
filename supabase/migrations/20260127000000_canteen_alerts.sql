-- Migration: Simplified Canteen Notifications (Permission Based - Fixed Type Mismatches & Targeted URLs)
-- Date: 2026-01-27

-- 1. CLEANUP
DROP TRIGGER IF EXISTS tr_canteen_denial_notify ON public.student_attendance;
DROP FUNCTION IF EXISTS tr_notify_canteen_denial();

-- 2. Modify student_attendance to align with user requirement (if not already done)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_attendance' AND column_name='canteen_permission') THEN
        ALTER TABLE public.student_attendance ADD COLUMN canteen_permission TEXT;
    END IF;
END $$;

ALTER TABLE public.student_attendance DROP CONSTRAINT IF EXISTS student_attendance_canteen_permission_check;
ALTER TABLE public.student_attendance ALTER COLUMN canteen_permission DROP DEFAULT;
ALTER TABLE public.student_attendance ALTER COLUMN canteen_permission SET DEFAULT NULL;

-- 3. Trigger Function with Robust Type Casting and Dynamic Student URLs
CREATE OR REPLACE FUNCTION tr_notify_canteen_denial()
RETURNS TRIGGER AS $$
DECLARE
    v_student RECORD;
    v_ins_id_text TEXT;
    v_class_teacher_id UUID;
    v_student_name TEXT;
    v_msg TEXT;
BEGIN
    -- Only trigger if canteen_permission is explicitly set to 'false' or 'deny'
    IF (NEW.canteen_permission::text IN ('false', 'deny', 'False')) -- Added 'False' just in case
       AND (OLD.canteen_permission IS NULL OR OLD.canteen_permission::text != NEW.canteen_permission::text OR TG_OP = 'INSERT') THEN
        
        -- Get student info for the notification message
        SELECT * INTO v_student FROM public.students WHERE id = NEW.student_id;
        v_student_name := COALESCE(v_student.name, 'Student');
        v_msg := 'Canteen access has been denied for ' || v_student_name || ' on ' || NEW.attendance_date || '.';

        -- NEW.institution_id is provided as TEXT in student_attendance
        v_ins_id_text := NEW.institution_id;

        -- Identify Class Teacher (using classes table schema)
        SELECT class_teacher_id INTO v_class_teacher_id 
        FROM public.classes 
        WHERE name = v_student.class_name 
        AND v_student.section = ANY(sections)
        LIMIT 1;

        -- Fallback to staff_details
        IF v_class_teacher_id IS NULL THEN
            SELECT profile_id INTO v_class_teacher_id
            FROM public.staff_details
            WHERE class_assigned = v_student.class_name 
            AND section_assigned = v_student.section
            LIMIT 1;
        END IF;

        -- 1. Notify Parents
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        SELECT pid, 'Canteen Access Denied', v_msg, 'attendance', '/parent/child/' || NEW.student_id
        FROM (
            SELECT p.profile_id as pid FROM public.student_parents sp
            JOIN public.parents p ON sp.parent_id = p.id
            WHERE sp.student_id = NEW.student_id
            UNION
            SELECT parent_id as pid FROM public.students WHERE id = NEW.student_id
        ) sub WHERE pid IS NOT NULL;

        -- 2. Notify Class Teacher
        IF v_class_teacher_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, action_url)
            VALUES (v_class_teacher_id, 'Canteen Permission Alert', v_msg, 'warning', '/faculty/students/' || NEW.student_id);
        END IF;

        -- 3. Notify Institution Admins
        -- Fix URL to use PLURAL 'students' to match App.tsx
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        SELECT id, 'Canteen Access Denial: ' || v_student_name, v_msg, 'error', '/institution/students/' || NEW.student_id
        FROM public.profiles
        WHERE (institution_id::text = v_ins_id_text OR institution_id::text IN (
            SELECT id::text FROM public.institutions WHERE institution_id = v_ins_id_text
        ))
        AND role IN ('admin', 'institution');

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Re-create Trigger
CREATE TRIGGER tr_canteen_denial_notify
AFTER INSERT OR UPDATE ON public.student_attendance
FOR EACH ROW EXECUTE FUNCTION tr_notify_canteen_denial();
