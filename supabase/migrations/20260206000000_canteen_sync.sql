
-- 1. Ensure student_attendance table matches user's SQL
-- The user provided a specific schema for student_attendance
-- We check and add missing columns if they don't exist.

DO $$ 
BEGIN
    -- Add entry_allowed if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_attendance' AND column_name = 'entry_allowed') THEN
        ALTER TABLE public.student_attendance ADD COLUMN entry_allowed BOOLEAN DEFAULT true;
    END IF;

    -- Add academic_year if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_attendance' AND column_name = 'academic_year') THEN
        ALTER TABLE public.student_attendance ADD COLUMN academic_year TEXT;
    END IF;

    -- Add canteen_permission if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_attendance' AND column_name = 'canteen_permission') THEN
        ALTER TABLE public.student_attendance ADD COLUMN canteen_permission TEXT;
    END IF;

    -- Add check_in_time if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_attendance' AND column_name = 'check_in_time') THEN
        ALTER TABLE public.student_attendance ADD COLUMN check_in_time TIME WITHOUT TIME ZONE;
    END IF;
END $$;

-- 2. Create or Update Trigger Functions as per user request

-- tr_sync_canteen_permission
CREATE OR REPLACE FUNCTION public.tr_sync_canteen_permission()
RETURNS TRIGGER AS $$
BEGIN
    -- Logic to sync canteen permission based on attendance status
    -- For example: if status is 'absent', canteen_permission = 'false'
    IF NEW.status = 'absent' THEN
        NEW.canteen_permission := 'false';
    ELSEIF NEW.status = 'present' THEN
        NEW.canteen_permission := 'true';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- handle_attendance_status
CREATE OR REPLACE FUNCTION public.handle_attendance_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Logic to calculate status based on check_in_time
    IF NEW.check_in_time IS NOT NULL THEN
        IF NEW.check_in_time <= '09:00:00'::time THEN
            NEW.status := 'present';
        ELSEIF NEW.check_in_time <= '10:00:00'::time THEN
            NEW.status := 'late';
        ELSE
            NEW.status := 'absent';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- tr_notify_canteen_denial
CREATE OR REPLACE FUNCTION public.tr_notify_canteen_denial()
RETURNS TRIGGER AS $$
BEGIN
    -- Logic for notification (mocked for now as we don't have the full context of notifications)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-create Triggers on student_attendance

DROP TRIGGER IF EXISTS tr_attendance_canteen_sync ON public.student_attendance;
CREATE TRIGGER tr_attendance_canteen_sync BEFORE INSERT OR UPDATE ON public.student_attendance
FOR EACH ROW EXECUTE FUNCTION tr_sync_canteen_permission();

DROP TRIGGER IF EXISTS tr_auto_deny_canteen ON public.student_attendance;
CREATE TRIGGER tr_auto_deny_canteen BEFORE INSERT OR UPDATE ON public.student_attendance
FOR EACH ROW EXECUTE FUNCTION tr_sync_canteen_permission();

DROP TRIGGER IF EXISTS tr_calculate_status ON public.student_attendance;
CREATE TRIGGER tr_calculate_status BEFORE INSERT ON public.student_attendance
FOR EACH ROW EXECUTE FUNCTION handle_attendance_status();

DROP TRIGGER IF EXISTS tr_canteen_denial_notify ON public.student_attendance;
CREATE TRIGGER tr_canteen_denial_notify AFTER INSERT OR UPDATE ON public.student_attendance
FOR EACH ROW EXECUTE FUNCTION tr_notify_canteen_denial();

-- 4. Support 'unverified' status in canteen_attendance
-- We don't need to change the schema as status is TEXT, but we can verify it.
-- Existing migration 20260126000000_canteen_features already created it.

-- 5. Ensure students table matches user's SQL (especially image_url)
DO $$ 
BEGIN
    -- Add image_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'image_url') THEN
        ALTER TABLE public.students ADD COLUMN image_url TEXT;
    END IF;

    -- Add is_active if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'is_active') THEN
        ALTER TABLE public.students ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- Add academic_year if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'academic_year') THEN
        ALTER TABLE public.students ADD COLUMN academic_year TEXT DEFAULT '2025-26';
    END IF;

    -- Add parent_email if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'parent_email') THEN
        ALTER TABLE public.students ADD COLUMN parent_email TEXT;
    END IF;

    -- Add parent_phone if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'parent_phone') THEN
        ALTER TABLE public.students ADD COLUMN parent_phone TEXT;
    END IF;
    
    -- Add blood_group if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'blood_group') THEN
        ALTER TABLE public.students ADD COLUMN blood_group TEXT;
    END IF;

    -- Add stop_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'stop_id') THEN
        ALTER TABLE public.students ADD COLUMN stop_id TEXT;
    END IF;
END $$;

-- 6. Ensure canteen_attendance matches user's latest SQL
DO $$ 
BEGIN
    -- Add photo_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canteen_attendance' AND column_name = 'photo_url') THEN
        ALTER TABLE public.canteen_attendance ADD COLUMN photo_url TEXT;
    END IF;

    -- Add activity_log if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canteen_attendance' AND column_name = 'activity_log') THEN
        ALTER TABLE public.canteen_attendance ADD COLUMN activity_log TEXT;
    END IF;

    -- Add metadata if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canteen_attendance' AND column_name = 'metadata') THEN
        ALTER TABLE public.canteen_attendance ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- 7. Trigger to auto-populate photo_url from students table
CREATE OR REPLACE FUNCTION public.tr_sync_canteen_photo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.photo_url IS NULL THEN
        SELECT image_url INTO NEW.photo_url 
        FROM public.students 
        WHERE id = NEW.student_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_canteen_photo_sync ON public.canteen_attendance;
CREATE TRIGGER tr_canteen_photo_sync BEFORE INSERT OR UPDATE ON public.canteen_attendance
FOR EACH ROW EXECUTE FUNCTION tr_sync_canteen_photo();

-- 8. Table to track canteen sessions (closed status)
CREATE TABLE IF NOT EXISTS public.canteen_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(institution_id, session_date)
);

-- Enable RLS
ALTER TABLE public.canteen_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for canteen_sessions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'canteen_sessions' AND policyname = 'Allow public view') THEN
        CREATE POLICY "Allow public view" ON public.canteen_sessions FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'canteen_sessions' AND policyname = 'Allow service role manage') THEN
        CREATE POLICY "Allow service role manage" ON public.canteen_sessions FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
