-- Function to get institution contact for a BLOCKED user (Publicly accessible but restricted)
CREATE OR REPLACE FUNCTION public.get_blocked_user_contact(identifier TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Required to bypass RLS for this public check
AS $$
DECLARE
    result JSON;
BEGIN
    -- Search for a profile that is specifically INACTIVE
    -- We match by ID (UUID) or by EXACT email
    SELECT 
        json_build_object(
            'institution_name', i.name,
            'phone', COALESCE(i.office_phone, i.phone, 'N/A')
        ) INTO result
    FROM public.profiles p
    JOIN public.institutions i ON p.institution_id = i.institution_id
    WHERE (p.id::text = identifier OR p.email = identifier)
    AND p.is_active = false
    LIMIT 1;

    RETURN result;
END;
$$;

-- Grant access to anonymous users (for the login screen)
GRANT EXECUTE ON FUNCTION public.get_blocked_user_contact(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_blocked_user_contact(TEXT) TO authenticated;
