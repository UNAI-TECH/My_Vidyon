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
        -- Notify everyone in the institution
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        SELECT id, NEW.title, NEW.content, 'announcement', '/(tabs)/announcements'
        FROM public.profiles
        WHERE institution_id = NEW.institution_id;
    ELSE
        -- Notify only a specific class (and optionally section)
        -- We join classes to get the name, as students table uses class_name string
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        SELECT p.id, NEW.title, NEW.content, 'announcement', '/(tabs)/announcements'
        FROM public.profiles p
        JOIN public.students s ON s.id = p.id
        JOIN public.classes c ON c.id = NEW.target_class_id
        WHERE p.institution_id = NEW.institution_id 
        AND s.class_name = c.name
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
    IF NEW.status = 'absent' THEN
        -- Find student name and parent_id
        SELECT s.full_name, s.parent_id INTO student_name, parent_uid
        FROM public.students s
        WHERE s.id = NEW.student_id;

        IF parent_uid IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, action_url)
            VALUES (
                parent_uid,
                'Attendance Alert',
                student_name || ' was marked absent today (' || NEW.attendance_date || ').',
                'attendance',
                '/parent/attendance'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_attendance_notification ON public.student_attendance;
CREATE TRIGGER trigger_attendance_notification
    AFTER INSERT OR UPDATE OF status ON public.student_attendance
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
        SELECT s.full_name, s.parent_id INTO student_name, parent_uid
        FROM public.students s
        WHERE s.id = NEW.student_id;

        IF parent_uid IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, action_url)
            VALUES (
                parent_uid,
                'Fee Payment Reminder',
                'Fee payment of ' || NEW.amount || ' for ' || student_name || ' is overdue.',
                'fee',
                '/parent/fees'
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
    -- Notify Faculty
    IF NEW.faculty_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        VALUES (
            NEW.faculty_id,
            'Timetable Update',
            'Your timetable for ' || NEW.day_of_week || ' Period ' || NEW.period_index || ' has been updated.',
            'timetable',
            '/faculty/timetable'
        );
    END IF;
    
    -- In a real scenario, you'd also notify all students in the class.
    -- This might be too many notifications if done synchronously for every slot change.
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_timetable_notification ON public.timetable_slots;
CREATE TRIGGER trigger_timetable_notification
    AFTER INSERT OR UPDATE ON public.timetable_slots
    FOR EACH ROW EXECUTE FUNCTION public.on_timetable_change();
