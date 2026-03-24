-- =====================================================
-- EXAM SCHEDULE NOTIFICATION AUTOMATION
-- =====================================================
-- Notifies Students, Parents, and relevant Faculty when a new exam is scheduled.

CREATE OR REPLACE FUNCTION public.on_exam_schedule_published()
RETURNS TRIGGER AS $$
DECLARE
    class_name_val TEXT;
BEGIN
    -- 1. Get readable class name
    SELECT name INTO class_name_val 
    FROM public.classes 
    WHERE id::text = NEW.class_id;

    -- 2. Notify Students (Those linked to a profile)
    -- Note: students.id is the profile ID in many cases, or we use students.id
    -- Our app usually has a 1:1 link where students.id matches profiles.id
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    SELECT id, 
           'New Exam Schedule: ' || NEW.exam_display_name, 
           'Timetable for ' || COALESCE(class_name_val, 'your class') || ' is now available.', 
           'exam', 
           '/(root)/student/exams'
    FROM public.students
    WHERE class_name = class_name_val
    AND section = NEW.section
    AND institution_id = NEW.institution_id;

    -- 3. Notify Parents
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    SELECT DISTINCT parent_id, 
           'Exam Alert: ' || NEW.exam_display_name, 
           'Exam timetable for ' || name || ' (' || COALESCE(class_name_val, 'Class') || ') has been published.', 
           'exam', 
           '/(root)/parent/exams/' || id
    FROM public.students
    WHERE class_name = class_name_val
    AND section = NEW.section
    AND institution_id = NEW.institution_id
    AND parent_id IS NOT NULL;

    -- 4. Notify Faculty assigned to this class/section
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    SELECT DISTINCT faculty_profile_id, 
           'Exam Duty: ' || NEW.exam_display_name, 
           'Exam schedule published for ' || COALESCE(class_name_val, 'Class') || ' ' || NEW.section || '.', 
           'exam', 
           '/(root)/faculty/exams'
    FROM public.faculty_subjects
    WHERE class_id::text = NEW.class_id
    AND (section = NEW.section OR section IS NULL);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP AND RECREATE TRIGGER
DROP TRIGGER IF EXISTS trigger_exam_schedule_notification ON public.exam_schedules;
CREATE TRIGGER trigger_exam_schedule_notification
    AFTER INSERT ON public.exam_schedules
    FOR EACH ROW EXECUTE FUNCTION public.on_exam_schedule_published();
