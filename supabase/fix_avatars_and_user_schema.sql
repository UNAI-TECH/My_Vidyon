-- ========================================================
-- Fix User Avatars, Buckets, Schema & Update Policies
-- ========================================================

-- 1. Create and configure 'avatars' storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 10485760, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = NULL;

-- 2. Create and configure 'student-photos' storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('student-photos', 'student-photos', true, 10485760, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = NULL;

-- 3. Storage Policies for 'avatars'
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete avatars" ON storage.objects;

CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated can upload avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated can update avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated can delete avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars');

-- 4. Storage Policies for 'student-photos'
DROP POLICY IF EXISTS "Public can view student-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload student-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update student-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete student-photos" ON storage.objects;

CREATE POLICY "Public can view student-photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'student-photos');

CREATE POLICY "Authenticated can upload student-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "Authenticated can update student-photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'student-photos');

CREATE POLICY "Authenticated can delete student-photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'student-photos');

-- 5. Safeguard columns on parents, students, and profiles
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 6. Enable authenticated users (such as institution admins) to UPDATE profiles, parents, and students
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.profiles;
CREATE POLICY "Allow update for authenticated users" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.parents;
CREATE POLICY "Allow update for authenticated users" 
ON public.parents 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.students;
CREATE POLICY "Allow update for authenticated users" 
ON public.students 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 7. SECURITY DEFINER function to reliably update user avatars without RLS hurdles
CREATE OR REPLACE FUNCTION public.update_user_avatar(
  p_user_id UUID,
  p_user_type TEXT,
  p_image_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_type = 'staff' THEN
    UPDATE public.profiles
    SET image_url = p_image_url,
        profile_image_url = p_image_url,
        avatar_url = p_image_url,
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSIF p_user_type = 'student' THEN
    UPDATE public.students
    SET image_url = p_image_url,
        updated_at = NOW()
    WHERE id = p_user_id;

    UPDATE public.profiles
    SET image_url = p_image_url,
        profile_image_url = p_image_url,
        avatar_url = p_image_url,
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSIF p_user_type = 'parent' THEN
    UPDATE public.parents
    SET image_url = p_image_url
    WHERE id = p_user_id;

    UPDATE public.profiles
    SET image_url = p_image_url,
        profile_image_url = p_image_url,
        avatar_url = p_image_url,
        updated_at = NOW()
    WHERE id IN (SELECT profile_id FROM public.parents WHERE id = p_user_id AND profile_id IS NOT NULL);
  END IF;

  RETURN jsonb_build_object('success', true, 'image_url', p_image_url);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_avatar(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_avatar(UUID, TEXT, TEXT) TO anon;
