-- =====================================================
-- PUSH NOTIFICATION AUTOMATION
-- =====================================================
-- This script adds triggers to automatically generate notifications
-- for Announcements, Attendance, and Fees.

-- 1. ANNOUNCEMENTS TRIGGER
-- Automatically notifies the target audience when an announcement is published.
CREATE OR REPLACE FUNCTION public.on_announcement_published()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Logic to find recipients based on class/section
    IF NEW.target_class_id IS NULL THEN
        -- Notify everyone in the institution (optionally filtered by category/role)
        INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
        SELECT id, NEW.title, NEW.content, 'announcement', 
            CASE role::text
                WHEN 'student' THEN '/student/notices'
                WHEN 'parent' THEN NULL
                WHEN 'faculty' THEN '/faculty/announcements'
                WHEN 'institution' THEN '/institution/communication'
                WHEN 'admin' THEN '/admin/communication'
                WHEN 'superadmin' THEN '/admin/communication'
                WHEN 'accountant' THEN '/accountant/notifications'
                WHEN 'canteen' THEN '/canteen/notifications'
                ELSE '/index'
            END,
            jsonb_build_object('event_type', 'announcement', 'record', row_to_json(NEW))
        FROM public.profiles
        WHERE institution_id = NEW.institution_id
        AND (
            NEW.category IS NULL OR 
            NEW.category = 'all' OR 
            NEW.category = 'General' OR
            role::text = NEW.category OR
            (NEW.category = 'staff' AND role::text IN ('faculty', 'accountant', 'canteen'))
        );
    ELSE
        -- Notify only a specific class (and optionally section)
        -- We join classes to get the name, as students table uses class_name string
        INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
        SELECT p.id, NEW.title, NEW.content, 'announcement', 
            CASE p.role::text
                WHEN 'student' THEN '/student/notices'
                WHEN 'parent' THEN NULL
                WHEN 'faculty' THEN '/faculty/announcements'
                WHEN 'institution' THEN '/institution/communication'
                WHEN 'admin' THEN '/admin/communication'
                WHEN 'superadmin' THEN '/admin/communication'
                WHEN 'accountant' THEN '/accountant/notifications'
                WHEN 'canteen' THEN '/canteen/notifications'
                ELSE '/index'
            END,
            jsonb_build_object('event_type', 'announcement', 'record', row_to_json(NEW))
        FROM public.profiles p
        JOIN public.students s ON s.id = p.id
        JOIN public.classes c ON c.name = s.class_name
        WHERE p.institution_id = NEW.institution_id 
        AND c.id = NEW.target_class_id
        AND (NEW.target_section IS NULL OR s.section = NEW.target_section);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_announcement_notification ON public.announcements;
CREATE TRIGGER trigger_announcement_notification
    AFTER INSERT ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION public.on_announcement_published();


-- 2. ATTENDANCE TRIGGER (ABSENT NOTIFICATION)
-- Automatically notifies parents when a student is marked as "absent".
CREATE OR REPLACE FUNCTION public.on_attendance_marked()
RETURNS TRIGGER AS $$
DECLARE
    parent_uid UUID;
    student_name TEXT;
BEGIN
    -- 1. Get student details
    SELECT s.name, s.parent_id 
    INTO student_name, parent_uid
    FROM public.students s
    WHERE s.id = NEW.student_id;

    -- 2. Handle Absent Notification (To Parent only)
    IF NEW.status = 'absent' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status != 'absent') THEN
        IF parent_uid IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
            VALUES (parent_uid, 'Attendance Alert', student_name || ' was marked absent today.', 'attendance', '/(root)/parent/student/' || NEW.student_id, jsonb_build_object('event_type', 'attendance_absent', 'record', row_to_json(NEW), 'student_name', student_name));
        END IF;
    END IF;

    -- 3. Handle Illegal Entry Notification (To Parent, Institution, and Class Teacher)
    IF NEW.canteen_permission = 'illegal' AND (TG_OP = 'INSERT' OR OLD.canteen_permission IS NULL OR OLD.canteen_permission != 'illegal') THEN
        -- A. Notify Parent
        IF parent_uid IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
            VALUES (parent_uid, 'Security Alert', 'Illegal canteen entry attempt by ' || student_name || '.', 'attendance', '/(root)/parent/student/' || NEW.student_id, jsonb_build_object('event_type', 'attendance_illegal_entry', 'record', row_to_json(NEW), 'student_name', student_name));
        END IF;

        -- B. Notify Institution Admins
        INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
        SELECT id, 'Illegal Entry Alert', student_name || ' (ID: ' || NEW.student_id || ') attempted illegal entry.', 'attendance', '/admin/communication', jsonb_build_object('event_type', 'attendance_illegal_entry', 'record', row_to_json(NEW), 'student_name', student_name)
        FROM public.profiles
        WHERE institution_id = NEW.institution_id 
        AND role::text IN ('admin', 'institution');

        -- C. Notify Class Teacher
        INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
        SELECT c.class_teacher_id, 'Illegal Entry Alert', student_name || ' from your class attempted illegal entry.', 'attendance', '/faculty/index', jsonb_build_object('event_type', 'attendance_illegal_entry', 'record', row_to_json(NEW), 'student_name', student_name)
        FROM public.students s
        JOIN public.classes c ON s.class_name = c.name
        WHERE s.id = NEW.student_id AND c.class_teacher_id IS NOT NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_attendance_notification ON public.student_attendance;
CREATE TRIGGER trigger_attendance_notification
    AFTER INSERT OR UPDATE OF status, canteen_permission ON public.student_attendance
    FOR EACH ROW EXECUTE FUNCTION public.on_attendance_marked();


-- 3. FEE REMINDER TRIGGER (OVERDUE)
-- Automatically notifies parents when a fee is marked as "overdue".
CREATE OR REPLACE FUNCTION public.on_fee_status_change()
RETURNS TRIGGER AS $$
DECLARE
    parent_uid UUID;
    student_name TEXT;
BEGIN
    -- Notify on insert if overdue, or when updated to overdue
    IF NEW.status = 'overdue' AND (TG_OP = 'INSERT' OR OLD.status != 'overdue') THEN
        -- Find student name and parent_id
        SELECT s.name, s.parent_id INTO student_name, parent_uid
        FROM public.students s
        WHERE s.id = NEW.student_id;

        IF parent_uid IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
            VALUES (
                parent_uid,
                'FEE_PAYMENT_REMINDER',
                'Fee payment of ' || NEW.amount || ' for ' || student_name || ' is overdue.',
                'fee',
                '/parent/fee-gateway',
                jsonb_build_object('event_type', 'fee_reminder', 'record', row_to_json(NEW), 'student_name', student_name)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_fee_notification ON public.fee_payments;
CREATE TRIGGER trigger_fee_notification
    AFTER INSERT OR UPDATE OF status ON public.fee_payments
    FOR EACH ROW EXECUTE FUNCTION public.on_fee_status_change();


-- 4. TIMETABLE CHANGE TRIGGER
-- Notifies affected users when a timetable slot is created or updated.
-- (This is best for "special" changes)
CREATE OR REPLACE FUNCTION public.on_timetable_change()
RETURNS TRIGGER AS $$
DECLARE
    faculty_uid UUID;
BEGIN
    -- 1. Notify Faculty (if assigned and not already notified in the last 60s)
    IF NEW.faculty_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = NEW.faculty_id 
            AND type = 'timetable'
            AND title = 'Timetable Update'
            AND created_at > (NOW() - INTERVAL '1 minute')
        ) THEN
            INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
            VALUES (
                NEW.faculty_id,
                'Timetable Update',
                'Your timetable for ' || NEW.day_of_week || ' at ' || NEW.start_time || ' has been updated.',
                'timetable',
                '/faculty/timetable',
                jsonb_build_object('event_type', 'timetable_change', 'record_id', NEW.id)
            );
        END IF;
    END IF;
    
    -- 2. Notify All Students in the Class (if not already notified in the last 60s)
    -- This query matches students by class name
    INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
    SELECT s.id, 'Timetable Updated', 
           'Your timetable for ' || NEW.day_of_week || ' has been updated. Check the new schedule.', 
           'timetable', 
           '/student/timetable',
           jsonb_build_object('event_type', 'timetable_change', 'record_id', NEW.id)
    FROM public.students s
    WHERE s.class_name = (SELECT name FROM public.classes WHERE id = NEW.class_id)
    AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = s.id 
        AND n.type = 'timetable'
        AND n.title = 'Timetable Updated'
        AND n.created_at > (NOW() - INTERVAL '1 minute')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_timetable_notification ON public.timetable;
CREATE TRIGGER trigger_timetable_notification
    AFTER INSERT OR UPDATE ON public.timetable
    FOR EACH ROW EXECUTE FUNCTION public.on_timetable_change();

-- 5. EXAM RESULT PUBLISHED TRIGGER
-- Notifies student and parent when status changes to 'PUBLISHED'
CREATE OR REPLACE FUNCTION public.on_exam_result_published()
RETURNS TRIGGER AS $$
DECLARE
    exam_name TEXT;
    student_name TEXT;
BEGIN
    -- Only run when status changes to 'PUBLISHED'
    IF (NEW.status = 'PUBLISHED' AND (OLD.status IS NULL OR OLD.status != 'PUBLISHED')) THEN
        
        -- 1. Get Exam Name from exam_schedules (id is UUID, NEW.exam_id might be TEXT)
        SELECT exam_display_name INTO exam_name 
        FROM public.exam_schedules 
        WHERE id = NEW.exam_id::uuid;

        -- 2. Get Student Name from profiles (id is UUID, NEW.student_id might be TEXT)
        SELECT full_name INTO student_name 
        FROM public.profiles 
        WHERE id = NEW.student_id::uuid;

        -- 3. Notify Student
        IF NEW.student_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
            VALUES (
                NEW.student_id::uuid, 
                'Exam Results Published', 
                'Your results for ' || COALESCE(exam_name, 'the exam') || ' are now available.',
                'exam',
                '/student/exams',
                jsonb_build_object('event_type', 'exam_result_published', 'record_id', NEW.id)
            );
        END IF;

        -- 4. Notify Parent(s) from students table (Primary)
        INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
        SELECT parent_id, 'Child''s Exam Results', 
               'Examination results for ' || COALESCE(student_name, 'your child') || ' have been published.',
               'exam',
               '/(root)/parent/student/' || NEW.student_id,
               jsonb_build_object('event_type', 'exam_result_published', 'record_id', NEW.id)
        FROM public.students 
        WHERE id = NEW.student_id::uuid AND parent_id IS NOT NULL;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_exam_result_notification ON public.exam_results;
CREATE TRIGGER trigger_exam_result_notification
    AFTER INSERT OR UPDATE OF status ON public.exam_results
    FOR EACH ROW EXECUTE FUNCTION public.on_exam_result_published();
