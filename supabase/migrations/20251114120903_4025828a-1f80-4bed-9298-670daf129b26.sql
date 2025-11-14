-- STEP 4 MODULE 1: Flood Risk & Environmental Layers
CREATE TABLE IF NOT EXISTS public.spatial_risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE CASCADE,
  flood_risk_level TEXT NOT NULL CHECK (flood_risk_level IN ('low', 'medium', 'high', 'unknown')),
  flood_risk_score INTEGER NOT NULL CHECK (flood_risk_score BETWEEN 0 AND 100),
  near_river BOOLEAN DEFAULT false,
  distance_to_river_m NUMERIC,
  elevation_m NUMERIC,
  slope_percent NUMERIC,
  environmental_notes TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 4 MODULE 2: Land-Use & Zoning Overlays
CREATE TABLE IF NOT EXISTS public.land_use_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE CASCADE,
  dominant_land_use TEXT NOT NULL,
  allowed_uses TEXT[] DEFAULT '{}',
  zoning_code TEXT,
  land_use_conflict BOOLEAN DEFAULT false,
  notes TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 4 MODULE 3: Government/Municipal Integration
CREATE TYPE institution_type AS ENUM ('government', 'municipal', 'authority', 'company');

CREATE TABLE IF NOT EXISTS public.institutional_sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_type institution_type NOT NULL,
  institution_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_by_admin_id UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 4 MODULE 4: Spatial Valuation Engine
CREATE TYPE estimation_method AS ENUM ('rule_based_v1', 'ml_model_v1', 'external_api');

CREATE TABLE IF NOT EXISTS public.valuation_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE CASCADE,
  estimated_value NUMERIC NOT NULL,
  estimation_currency TEXT DEFAULT 'TZS',
  estimation_method estimation_method NOT NULL DEFAULT 'rule_based_v1',
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 4 MODULE 5: Visit Scheduling & Field Visits
CREATE TYPE visit_status AS ENUM ('pending', 'accepted', 'rejected', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.visit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  requested_time_slot TEXT NOT NULL,
  status visit_status NOT NULL DEFAULT 'pending',
  buyer_notes TEXT,
  seller_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 4 MODULE 6: Audit Logging
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  listing_id UUID REFERENCES public.listings(id),
  action_type TEXT NOT NULL,
  action_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_spatial_risk_listing ON public.spatial_risk_profiles(listing_id);
CREATE INDEX IF NOT EXISTS idx_land_use_listing ON public.land_use_profiles(listing_id);
CREATE INDEX IF NOT EXISTS idx_institutional_sellers_profile ON public.institutional_sellers(profile_id);
CREATE INDEX IF NOT EXISTS idx_valuation_listing ON public.valuation_estimates(listing_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_listing ON public.visit_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_buyer ON public.visit_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_visit_requests_seller ON public.visit_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_listing ON public.audit_logs(listing_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);

-- Row Level Security Policies

-- spatial_risk_profiles: Anyone can view for published listings
ALTER TABLE public.spatial_risk_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view spatial risk for published listings"
ON public.spatial_risk_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = spatial_risk_profiles.listing_id
    AND (listings.status = 'published' OR listings.owner_id = auth.uid())
  )
);

CREATE POLICY "System can insert spatial risk profiles"
ON public.spatial_risk_profiles FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update spatial risk profiles"
ON public.spatial_risk_profiles FOR UPDATE
USING (true);

-- land_use_profiles: Anyone can view for published listings
ALTER TABLE public.land_use_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view land use for published listings"
ON public.land_use_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = land_use_profiles.listing_id
    AND (listings.status = 'published' OR listings.owner_id = auth.uid())
  )
);

CREATE POLICY "System can insert land use profiles"
ON public.land_use_profiles FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update land use profiles"
ON public.land_use_profiles FOR UPDATE
USING (true);

-- institutional_sellers: Users can view their own, admins can view all
ALTER TABLE public.institutional_sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own institutional seller profile"
ON public.institutional_sellers FOR SELECT
USING (auth.uid() = profile_id);

CREATE POLICY "Admins can view all institutional sellers"
ON public.institutional_sellers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Users can create institutional seller profile"
ON public.institutional_sellers FOR INSERT
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Admins can update institutional sellers"
ON public.institutional_sellers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- valuation_estimates: Anyone can view for published listings
ALTER TABLE public.valuation_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view valuations for published listings"
ON public.valuation_estimates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = valuation_estimates.listing_id
    AND (listings.status = 'published' OR listings.owner_id = auth.uid())
  )
);

CREATE POLICY "System can insert valuation estimates"
ON public.valuation_estimates FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update valuation estimates"
ON public.valuation_estimates FOR UPDATE
USING (true);

-- visit_requests: Buyers and sellers can view their own, admins can view all
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their visit requests"
ON public.visit_requests FOR SELECT
USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view their visit requests"
ON public.visit_requests FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all visit requests"
ON public.visit_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Buyers can create visit requests"
ON public.visit_requests FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update their visit requests"
ON public.visit_requests FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can cancel their visit requests"
ON public.visit_requests FOR UPDATE
USING (auth.uid() = buyer_id AND status = 'pending');

-- audit_logs: Only admins can view
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_spatial_risk_profiles_updated_at
BEFORE UPDATE ON public.spatial_risk_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_land_use_profiles_updated_at
BEFORE UPDATE ON public.land_use_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_institutional_sellers_updated_at
BEFORE UPDATE ON public.institutional_sellers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_valuation_estimates_updated_at
BEFORE UPDATE ON public.valuation_estimates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visit_requests_updated_at
BEFORE UPDATE ON public.visit_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();