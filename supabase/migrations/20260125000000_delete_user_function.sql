-- Migration: Add delete_user_completely function
-- This function deletes a user from both database and auth
-- Date: 2026-01-25

-- Create a function to delete user completely (database + auth)
CREATE OR REPLACE FUNCTION public.delete_user_completely(
    user_id UUID,
    user_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
AS $$
DECLARE
    auth_user_id UUID;
    result JSON;
BEGIN
    -- Verify the caller has permission (must be institution admin or super admin)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('institution', 'admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions. Only institution admins can delete users.';
    END IF;

    -- Get the auth user ID based on user type
    IF user_type = 'student' THEN
        SELECT id INTO auth_user_id
        FROM public.students
        WHERE id = user_id;
        
        IF auth_user_id IS NULL THEN
            RAISE EXCEPTION 'Student not found';
        END IF;
        
        -- Delete student record (cascading will handle related records)
        DELETE FROM public.students WHERE id = user_id;
        
    ELSIF user_type = 'parent' THEN
        SELECT profile_id INTO auth_user_id
        FROM public.parents
        WHERE id = user_id;
        
        IF auth_user_id IS NULL THEN
            RAISE EXCEPTION 'Parent not found';
        END IF;
        
        -- Delete parent record
        DELETE FROM public.parents WHERE id = user_id;
        
        -- Delete profile
        DELETE FROM public.profiles WHERE id = auth_user_id;
        
    ELSIF user_type = 'staff' THEN
        auth_user_id := user_id;
        
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
            RAISE EXCEPTION 'Staff member not found';
        END IF;
        
        -- Delete from staff_details if exists
        DELETE FROM public.staff_details WHERE profile_id = user_id;
        
        -- Delete from accountants if exists
        DELETE FROM public.accountants WHERE profile_id = user_id;
        
        -- Delete profile
        DELETE FROM public.profiles WHERE id = user_id;
        
    ELSE
        RAISE EXCEPTION 'Invalid user_type. Must be student, parent, or staff.';
    END IF;

    -- Delete from auth.users (this prevents login)
    -- Note: This requires the function to have SECURITY DEFINER
    DELETE FROM auth.users WHERE id = auth_user_id;

    -- Return success
    result := json_build_object(
        'success', true,
        'message', user_type || ' deleted successfully',
        'deleted_user_id', user_id,
        'deleted_auth_user_id', auth_user_id
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Return error as JSON
        result := json_build_object(
            'success', false,
            'error', SQLERRM
        );
        RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_completely(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.delete_user_completely IS 'Deletes a user from both database tables and auth.users, preventing them from logging in. Only institution admins can execute this.';
