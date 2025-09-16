-- Make promote_user_to_admin idempotent and conflict-free
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
BEGIN
  -- Find user id by email
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _email;

  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Ensure an admin role exists for this user (no error if it already exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Remove any residual 'user' role to avoid ambiguity
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = 'user'::app_role;

  RETURN true;
END;
$function$;

-- Promote the target user to admin
SELECT public.promote_user_to_admin('danilohen@gmail.com');