-- Final Fix for Exam Result Notification and operator error (uuid = text)
-- Run this in your Supabase SQL Editor

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

        -- 4. Notify Parent(s)
        -- Primary parent from students table
        INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
        SELECT parent_id, 'Child''s Exam Results', 
               'Examination results for ' || COALESCE(student_name, 'your child') || ' have been published.',
               'exam',
               '/(root)/parent/student/' || NEW.student_id,
               jsonb_build_object('event_type', 'exam_result_published', 'record_id', NEW.id)
        FROM public.students 
        WHERE id = NEW.student_id::uuid AND parent_id IS NOT NULL;

        -- Secondary parents from parent_student_relations (if exists)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parent_student_relations') THEN
            INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
            SELECT parent_id, 'Child''s Exam Results', 
                   'Examination results for ' || COALESCE(student_name, 'your child') || ' have been published.',
                   'exam',
                   '/(root)/parent/student/' || NEW.student_id,
                   jsonb_build_object('event_type', 'exam_result_published', 'record_id', NEW.id)
            FROM public.parent_student_relations
            WHERE student_id = NEW.student_id::uuid;
        END IF;

    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger to be safe
DROP TRIGGER IF EXISTS trigger_exam_result_notification ON public.exam_results;
CREATE TRIGGER trigger_exam_result_notification
    AFTER INSERT OR UPDATE OF status ON public.exam_results
    FOR EACH ROW EXECUTE FUNCTION public.on_exam_result_published();

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
