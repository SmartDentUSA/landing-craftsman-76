-- PHASE 1: IMPLEMENT AUTHENTICATION AND SECURE RLS POLICIES

-- Step 1: Create user roles system for proper access control
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Step 2: Replace dangerous RLS policies with secure ones

-- SECURE RLS POLICIES FOR RAW_REVIEWS
DROP POLICY IF EXISTS "Allow all operations on raw_reviews" ON public.raw_reviews;

CREATE POLICY "Authenticated users can view raw_reviews"
ON public.raw_reviews
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert raw_reviews"
ON public.raw_reviews
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update raw_reviews"
ON public.raw_reviews
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete raw_reviews"
ON public.raw_reviews
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- SECURE RLS POLICIES FOR APPROVED_REVIEWS
DROP POLICY IF EXISTS "Allow all operations on approved_reviews" ON public.approved_reviews;

CREATE POLICY "Anyone can view approved_reviews"
ON public.approved_reviews
FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert approved_reviews"
ON public.approved_reviews
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update approved_reviews"
ON public.approved_reviews
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete approved_reviews"
ON public.approved_reviews
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- SECURE RLS POLICIES FOR EXTRACTION_JOBS
DROP POLICY IF EXISTS "Allow all operations on extraction_jobs" ON public.extraction_jobs;

CREATE POLICY "Authenticated users can view extraction_jobs"
ON public.extraction_jobs
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can insert extraction_jobs"
ON public.extraction_jobs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update extraction_jobs"
ON public.extraction_jobs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete extraction_jobs"
ON public.extraction_jobs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- SECURE RLS POLICIES FOR MANUAL_REVIEWS
DROP POLICY IF EXISTS "Allow all operations on manual_reviews" ON public.manual_reviews;

CREATE POLICY "Anyone can view approved manual_reviews"
ON public.manual_reviews
FOR SELECT
USING (approved = true);

CREATE POLICY "Only admins can insert manual_reviews"
ON public.manual_reviews
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update manual_reviews"
ON public.manual_reviews
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete manual_reviews"
ON public.manual_reviews
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- SECURE RLS POLICIES FOR USER_ROLES
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 3: Create profiles table for additional user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Create trigger to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
    );
    
    -- Assign default 'user' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updating profiles timestamp
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();