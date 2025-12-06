-- Add service_provider to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'service_provider';

-- Create a table for service provider profiles with more details
CREATE TABLE IF NOT EXISTS public.service_provider_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL, -- lawyer, land_valuer, construction_company, building_materials, surveyor, architect, etc.
  company_name TEXT NOT NULL,
  license_number TEXT,
  years_in_business INTEGER,
  description TEXT,
  services_offered TEXT[] DEFAULT '{}',
  service_areas TEXT[] DEFAULT '{}', -- regions/districts they serve
  contact_phone TEXT,
  contact_email TEXT NOT NULL,
  website_url TEXT,
  logo_url TEXT,
  rating NUMERIC(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  completed_projects INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  verification_notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.service_provider_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view active and verified service providers
CREATE POLICY "Anyone can view verified service providers"
ON public.service_provider_profiles
FOR SELECT
USING (is_active = true AND is_verified = true);

-- Users can view their own profile
CREATE POLICY "Users can view own service provider profile"
ON public.service_provider_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own profile
CREATE POLICY "Users can create own service provider profile"
ON public.service_provider_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own service provider profile"
ON public.service_provider_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all service provider profiles"
ON public.service_provider_profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update any profile (for verification)
CREATE POLICY "Admins can update any service provider profile"
ON public.service_provider_profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create service_provider_requests table for registration requests
CREATE TABLE IF NOT EXISTS public.service_provider_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL,
  company_name TEXT NOT NULL,
  license_number TEXT,
  years_in_business INTEGER,
  description TEXT,
  services_offered TEXT[] DEFAULT '{}',
  service_areas TEXT[] DEFAULT '{}',
  contact_phone TEXT,
  contact_email TEXT NOT NULL,
  website_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_provider_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own requests
CREATE POLICY "Users can create service provider requests"
ON public.service_provider_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own service provider requests"
ON public.service_provider_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all service provider requests"
ON public.service_provider_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update requests
CREATE POLICY "Admins can update service provider requests"
ON public.service_provider_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create service_provider_reviews table
CREATE TABLE IF NOT EXISTS public.service_provider_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.service_provider_profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_request_id UUID REFERENCES public.service_requests(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_id, reviewer_id, service_request_id)
);

-- Enable RLS
ALTER TABLE public.service_provider_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews
CREATE POLICY "Anyone can view service provider reviews"
ON public.service_provider_reviews
FOR SELECT
USING (true);

-- Users can create reviews for services they received
CREATE POLICY "Users can create reviews"
ON public.service_provider_reviews
FOR INSERT
WITH CHECK (auth.uid() = reviewer_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON public.service_provider_reviews
FOR UPDATE
USING (auth.uid() = reviewer_id);

-- Create trigger to update provider rating when review is added
CREATE OR REPLACE FUNCTION public.update_service_provider_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.service_provider_profiles
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.service_provider_reviews
      WHERE provider_id = NEW.provider_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.service_provider_reviews
      WHERE provider_id = NEW.provider_id
    ),
    updated_at = now()
  WHERE id = NEW.provider_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_provider_rating_on_review
AFTER INSERT OR UPDATE ON public.service_provider_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_service_provider_rating();

-- Create function to approve service provider request
CREATE OR REPLACE FUNCTION public.approve_service_provider_request(request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request service_provider_requests%ROWTYPE;
BEGIN
  -- Get the request
  SELECT * INTO v_request FROM service_provider_requests WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service provider request not found';
  END IF;
  
  -- Create service provider profile
  INSERT INTO public.service_provider_profiles (
    user_id,
    provider_type,
    company_name,
    license_number,
    years_in_business,
    description,
    services_offered,
    service_areas,
    contact_phone,
    contact_email,
    website_url,
    is_verified,
    verified_at,
    verified_by
  ) VALUES (
    v_request.user_id,
    v_request.provider_type,
    v_request.company_name,
    v_request.license_number,
    v_request.years_in_business,
    v_request.description,
    v_request.services_offered,
    v_request.service_areas,
    v_request.contact_phone,
    v_request.contact_email,
    v_request.website_url,
    true,
    now(),
    auth.uid()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    provider_type = EXCLUDED.provider_type,
    company_name = EXCLUDED.company_name,
    license_number = EXCLUDED.license_number,
    years_in_business = EXCLUDED.years_in_business,
    description = EXCLUDED.description,
    services_offered = EXCLUDED.services_offered,
    service_areas = EXCLUDED.service_areas,
    contact_phone = EXCLUDED.contact_phone,
    contact_email = EXCLUDED.contact_email,
    website_url = EXCLUDED.website_url,
    is_verified = true,
    verified_at = now(),
    verified_by = auth.uid();
  
  -- Assign service_provider role
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (v_request.user_id, 'service_provider'::app_role, auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update request status
  UPDATE public.service_provider_requests
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = request_id;
  
  -- Notify user
  PERFORM create_notification(
    v_request.user_id,
    'listing_verified',
    'Service Provider Application Approved',
    'Your application to become a service provider has been approved! You can now receive service requests.',
    '/dashboard'
  );
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_service_provider_profiles_updated_at
BEFORE UPDATE ON public.service_provider_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_provider_requests_updated_at
BEFORE UPDATE ON public.service_provider_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_provider_reviews_updated_at
BEFORE UPDATE ON public.service_provider_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();