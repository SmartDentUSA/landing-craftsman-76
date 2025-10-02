-- Migration: Auto-promote specific emails to admin role
-- Description: Updates handle_new_user() function to automatically assign admin role to predefined emails

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_emails TEXT[] := ARRAY['smartdentcadcam@gmail.com', 'danilohen@gmail.com'];
  user_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  
  -- Determine role based on email
  IF NEW.email = ANY(admin_emails) THEN
    user_role := 'admin';
  ELSE
    user_role := 'user';
  END IF;
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;