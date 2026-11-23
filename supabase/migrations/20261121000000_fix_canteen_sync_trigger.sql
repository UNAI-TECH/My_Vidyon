-- Migration: Fix canteen sync trigger and decouple school attendance from canteen verification
-- Date: 2026-11-21

-- 1. Update tr_sync_canteen_permission() to only manage entry_allowed and academic_year
--    NEVER overwrite canteen_permission, which is reserved for the Canteen Portal meal verdict.
CREATE OR REPLACE FUNCTION public.tr_sync_canteen_permission()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync academic year from students table if missing
    IF NEW.academic_year IS NULL THEN
        SELECT s.academic_year INTO NEW.academic_year
        FROM public.students s
        WHERE s.id = NEW.student_id;
    END IF;

    -- Sync entry_allowed based on attendance status; DO NOT touch canteen_permission
    IF NEW.status = 'absent' THEN
        NEW.entry_allowed := false;
    ELSEIF NEW.status = 'present' OR NEW.status = 'late' THEN
        NEW.entry_allowed := true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Clean existing legacy boolean strings from student_attendance
UPDATE public.student_attendance 
SET canteen_permission = NULL 
WHERE canteen_permission IN ('true', 'false');
