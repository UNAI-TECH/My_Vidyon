-- Migration: Automatic Daily Absence Marking (9 AM Cutoff - Robust Version)
-- Date: 2026-01-27

-- 1. Stored Procedure to mark missing Students as Absent
CREATE OR REPLACE FUNCTION public.mark_absent_students()
RETURNS void AS $$
BEGIN
    INSERT INTO public.student_attendance (
        student_id, 
        institution_id, 
        attendance_date, 
        status, 
        entry_allowed,
        academic_year,
        canteen_permission
    )
    SELECT 
        s.id as student_id,
        s.institution_id,
        current_date as attendance_date,
        'absent' as status,
        false as entry_allowed,
        s.academic_year as academic_year,
        false as canteen_permission
    FROM public.students s
    LEFT JOIN public.student_attendance sa 
        ON s.id = sa.student_id 
        AND sa.attendance_date = CURRENT_DATE
    WHERE s.is_active = true 
        AND s.institution_id IS NOT NULL -- Guard against missing IDs
        AND sa.id IS NULL;

    RAISE NOTICE 'Daily student absence marking complete for %', CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 2. Stored Procedure to mark missing Staff as Absent
CREATE OR REPLACE FUNCTION public.mark_absent_staff()
RETURNS void AS $$
BEGIN
    INSERT INTO public.staff_attendance (
        staff_id, 
        institution_id, 
        attendance_date, 
        status
    )
    SELECT 
        p.id, 
        p.institution_id::text, -- Cast to text to match staff_attendance schema if needed
        CURRENT_DATE, 
        'absent'
    FROM public.profiles p
    LEFT JOIN public.staff_attendance sa 
        ON p.id = sa.staff_id 
        AND sa.attendance_date = CURRENT_DATE
    WHERE p.role IN ('faculty', 'teacher', 'staff', 'admin')
        AND p.institution_id IS NOT NULL -- Guard against missing IDs
        AND sa.id IS NULL;

    RAISE NOTICE 'Daily staff absence marking complete for %', CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
