-- =====================================================
-- FIX NOTIFICATION SPAM IN TIMETABLE UPDATES
-- =====================================================
-- This script updates the timetable trigger to include a rate-limit.
-- It ensures that multiple updates within 60 seconds only trigger
-- ONE notification per user.

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
    -- This query matches students by getting the class name from the classes table
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

-- Re-apply trigger to ensure it's active
DROP TRIGGER IF EXISTS trigger_timetable_notification ON public.timetable;
CREATE TRIGGER trigger_timetable_notification
    AFTER INSERT OR UPDATE ON public.timetable
    FOR EACH ROW EXECUTE FUNCTION public.on_timetable_change();
