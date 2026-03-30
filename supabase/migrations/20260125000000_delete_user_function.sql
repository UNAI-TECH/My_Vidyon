-- Migration: THE "BLACK BOX" delete_user_completely (v3.4)
-- Tracks every step and returns a full log on failure
-- Date: 2026-03-29

CREATE OR REPLACE FUNCTION public.delete_user_completely(
    user_id UUID,
    user_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Elevated privileges
AS $$
DECLARE
    auth_user_id UUID;
    admin_profile_id UUID;
    v_table TEXT;
    v_col TEXT;
    v_error_msg TEXT;
    v_record RECORD;
    v_log TEXT := ''; -- Flight recorder
BEGIN
    v_log := v_log || '1. Starting deletion for ' || user_type || ' (' || user_id || '). ';
    
    -- 1. Security Check
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role IN ('institution', 'admin', 'super_admin') OR profiles.role = 'institution')
    ) THEN
        v_log := v_log || 'FAILED: Insufficient permissions for user ' || COALESCE(auth.uid()::text, 'NULL') || '. ';
        RETURN json_build_object('success', false, 'message', 'Insufficient permissions', 'log', v_log);
    END IF;

    -- 2. Identify Fallback Admin
    SELECT id INTO admin_profile_id FROM public.profiles 
    WHERE role IN ('institution', 'admin', 'super_admin') AND id != delete_user_completely.user_id LIMIT 1;
    v_log := v_log || '2. Admin ' || COALESCE(admin_profile_id::text, 'None') || ' identified. ';

    BEGIN
        -- 3. Map to Auth ID
        IF LOWER(delete_user_completely.user_type) = 'student' THEN
            SELECT profile_id INTO auth_user_id FROM public.students WHERE students.id = delete_user_completely.user_id OR students.profile_id = delete_user_completely.user_id;
        ELSIF LOWER(delete_user_completely.user_type) = 'parent' THEN
            SELECT profile_id INTO auth_user_id FROM public.parents WHERE parents.id = delete_user_completely.user_id;
        ELSE
            auth_user_id := delete_user_completely.user_id;
        END IF;
        IF auth_user_id IS NULL THEN auth_user_id := delete_user_completely.user_id; END IF;
        v_log := v_log || '3. Auth ID set to ' || auth_user_id || '. ';

        -- 4. BUST ALL FOREIGN KEYS pointing to profiles or students or parents
        FOR v_record IN (
            SELECT tc.table_name, kcu.column_name, c.is_nullable
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.columns c ON c.table_name = tc.table_name AND c.column_name = kcu.column_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.referenced_table_name IN ('profiles', 'students', 'parents') AND tc.table_schema = 'public'
        ) LOOP
            v_table := v_record.table_name; v_col := v_record.column_name;
            IF v_table IN ('students', 'parents', 'profiles') THEN CONTINUE; END IF;

            v_log := v_log || 'Cleaning ' || v_table || '(' || v_col || '). ';
            BEGIN
                IF v_table IN ('announcements', 'assignments', 'exam_results') AND admin_profile_id IS NOT NULL THEN
                    EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = $2', v_table, v_col, v_col) USING admin_profile_id, auth_user_id;
                    EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = $2', v_table, v_col, v_col) USING admin_profile_id, delete_user_completely.user_id;
                ELSIF v_record.is_nullable = 'YES' THEN
                    EXECUTE format('UPDATE public.%I SET %I = NULL WHERE %I = $1', v_table, v_col, v_col) USING auth_user_id;
                    EXECUTE format('UPDATE public.%I SET %I = NULL WHERE %I = $1', v_table, v_col, v_col) USING delete_user_completely.user_id;
                ELSE
                    EXECUTE format('DELETE FROM public.%I WHERE %I = $1', v_table, v_col) USING auth_user_id;
                    EXECUTE format('DELETE FROM public.%I WHERE %I = $1', v_table, v_col) USING delete_user_completely.user_id;
                END IF;
            EXCEPTION WHEN OTHERS THEN 
                v_log := v_log || 'ERR in ' || v_table || ': ' || SQLERRM || '. ';
            END;
        END LOOP;

        -- 5. Core Removal
        v_log := v_log || '5. Removing core records... ';
        v_table := 'students'; DELETE FROM public.students WHERE students.id = delete_user_completely.user_id OR students.profile_id = delete_user_completely.user_id;
        v_table := 'parents'; DELETE FROM public.parents WHERE parents.id = delete_user_completely.user_id;
        v_table := 'profiles'; DELETE FROM public.profiles WHERE profiles.id = auth_user_id;
        
        -- 6. Auth Cleanup
        v_log := v_log || '6. Cleaning Auth... ';
        v_table := 'push_tokens'; IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_table) THEN DELETE FROM public.push_tokens WHERE user_id = auth_user_id; END IF;
        v_table := 'auth.users'; DELETE FROM auth.users WHERE auth.users.id = auth_user_id;

        v_log := v_log || 'SUCCESS. ';
        RETURN json_build_object('success', true, 'message', 'Nuclear Deletion Complete', 'log', v_log);

    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
        v_log := v_log || 'FATAL: ' || v_error_msg || '. ';
        RETURN json_build_object('success', false, 'message', 'Failed at table: ' || v_table, 'detail', v_error_msg, 'log', v_log);
    END;
END;
$$;
