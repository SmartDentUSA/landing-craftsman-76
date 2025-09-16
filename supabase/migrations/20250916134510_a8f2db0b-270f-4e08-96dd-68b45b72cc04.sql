-- Create a function to promote a user to admin by email
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Get user ID from auth.users by email
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _email;
  
  -- Check if user exists
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update or insert admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- If user already has a 'user' role, update it to 'admin'
  UPDATE public.user_roles 
  SET role = 'admin'::app_role
  WHERE user_id = _user_id AND role = 'user'::app_role;
  
  RETURN true;
END;
$$;

-- Create the admin user if they don't exist yet
-- This will automatically promote danilohen@gmail.com to admin when they sign up
DO $$
BEGIN
  -- Check if we can promote the user (they might already be registered)
  PERFORM public.promote_user_to_admin('danilohen@gmail.com');
END $$;