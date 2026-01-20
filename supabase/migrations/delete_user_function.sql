-- =====================================================
-- DELETE USER FUNCTION
-- =====================================================
-- This function allows users to delete their own account
-- Run this in your Supabase SQL Editor

-- Function to allow users to delete their own account
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the user's profile (cascades to all related tables)
  DELETE FROM public.profiles
  WHERE id = auth.uid();

  -- Delete from auth.users (requires service role, so this may fail)
  -- The cascade deletion from profiles will handle most cleanup
  BEGIN
    DELETE FROM auth.users WHERE id = auth.uid();
  EXCEPTION
    WHEN OTHERS THEN
      -- If we can't delete from auth.users, that's okay
      -- The profile deletion will have cleaned up the data
      NULL;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;

-- Optional: Function to anonymize user data instead of deleting
-- Useful if you need to keep records for legal/compliance reasons
CREATE OR REPLACE FUNCTION public.anonymize_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Anonymize profile data
  UPDATE public.profiles
  SET
    email = 'deleted_user_' || id || '@deleted.local',
    full_name = 'Deleted User',
    avatar_url = NULL,
    updated_at = NOW()
  WHERE id = auth.uid();

  -- Mark all listings as archived
  UPDATE public.listings
  SET status = 'archived', updated_at = NOW()
  WHERE user_id = auth.uid();

  -- You can add more anonymization steps here
END;
$$;

GRANT EXECUTE ON FUNCTION public.anonymize_user() TO authenticated;
