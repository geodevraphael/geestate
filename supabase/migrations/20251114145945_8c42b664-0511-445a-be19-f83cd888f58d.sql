-- Create service provider companies table
CREATE TABLE IF NOT EXISTS public.service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_type TEXT NOT NULL, -- 'surveyor', 'title_verifier', 'topographer', 'geoinsight'
  services_offered TEXT[] NOT NULL DEFAULT '{}',
  contact_person TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  company_address TEXT,
  license_number TEXT,
  years_in_business INTEGER,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  rating NUMERIC(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_reviews INTEGER DEFAULT 0,
  completed_projects INTEGER DEFAULT 0,
  average_turnaround_days INTEGER,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service requests table to track requests to specific providers
CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id),
  requester_id UUID NOT NULL,
  service_provider_id UUID REFERENCES public.service_providers(id),
  service_type TEXT NOT NULL,
  service_category TEXT NOT NULL, -- 'geospatial' or 'geoinsight'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled'
  request_notes TEXT,
  provider_notes TEXT,
  quoted_price NUMERIC,
  quoted_currency TEXT DEFAULT 'TZS',
  estimated_completion_date DATE,
  actual_completion_date DATE,
  report_file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service reviews table
CREATE TABLE IF NOT EXISTS public.service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES public.service_requests(id),
  service_provider_id UUID NOT NULL REFERENCES public.service_providers(id),
  reviewer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
  timeliness_score INTEGER CHECK (timeliness_score >= 1 AND timeliness_score <= 5),
  professionalism_score INTEGER CHECK (professionalism_score >= 1 AND professionalism_score <= 5),
  would_recommend BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_providers_type ON public.service_providers(company_type);
CREATE INDEX IF NOT EXISTS idx_service_providers_rating ON public.service_providers(rating DESC);
CREATE INDEX IF NOT EXISTS idx_service_providers_active ON public.service_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_service_requests_listing ON public.service_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_requester ON public.service_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_provider ON public.service_requests(service_provider_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_provider ON public.service_reviews(service_provider_id);

-- Enable RLS
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_providers
CREATE POLICY "Anyone can view active service providers"
ON public.service_providers FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage service providers"
ON public.service_providers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for service_requests
CREATE POLICY "Users can view their own requests"
ON public.service_requests FOR SELECT
USING (auth.uid() = requester_id OR 
       EXISTS (SELECT 1 FROM public.service_providers WHERE id = service_requests.service_provider_id AND auth.uid() IN (SELECT id FROM public.profiles WHERE email = service_providers.contact_email)));

CREATE POLICY "Users can create service requests"
ON public.service_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Providers can update their requests"
ON public.service_requests FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.service_providers WHERE id = service_requests.service_provider_id AND auth.uid() IN (SELECT id FROM public.profiles WHERE email = service_providers.contact_email)));

CREATE POLICY "Admins can view all requests"
ON public.service_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for service_reviews
CREATE POLICY "Anyone can view reviews"
ON public.service_reviews FOR SELECT
USING (true);

CREATE POLICY "Users can create reviews for their completed requests"
ON public.service_reviews FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id AND
  EXISTS (SELECT 1 FROM public.service_requests WHERE id = service_reviews.service_request_id AND requester_id = auth.uid() AND status = 'completed')
);

-- Trigger to update provider rating when review is added
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.service_providers
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.service_reviews
      WHERE service_provider_id = NEW.service_provider_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.service_reviews
      WHERE service_provider_id = NEW.service_provider_id
    )
  WHERE id = NEW.service_provider_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_provider_rating
AFTER INSERT ON public.service_reviews
FOR EACH ROW
EXECUTE FUNCTION update_provider_rating();

-- Trigger to increment completed projects
CREATE OR REPLACE FUNCTION increment_completed_projects()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.service_providers
    SET completed_projects = completed_projects + 1
    WHERE id = NEW.service_provider_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_increment_completed_projects
AFTER UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION increment_completed_projects();

-- Add updated_at trigger for service_providers
CREATE TRIGGER update_service_providers_updated_at
BEFORE UPDATE ON public.service_providers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for service_requests
CREATE TRIGGER update_service_requests_updated_at
BEFORE UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();