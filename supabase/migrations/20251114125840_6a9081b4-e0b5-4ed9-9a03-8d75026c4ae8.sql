-- ========================================================
-- STEP 5 MODULE 1: Tanzania Administrative Hierarchy
-- ========================================================

-- 1. Create regions table
CREATE TABLE IF NOT EXISTS public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  geometry JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create districts table
CREATE TABLE IF NOT EXISTS public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  geometry JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(region_id, name)
);

-- 3. Create wards table
CREATE TABLE IF NOT EXISTS public.wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  geometry JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(district_id, name)
);

-- 4. Create streets/villages table
CREATE TABLE IF NOT EXISTS public.streets_villages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id UUID NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  geometry JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ward_id, name)
);

-- 5. Add administrative hierarchy to listings table
ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id),
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id),
  ADD COLUMN IF NOT EXISTS ward_id UUID REFERENCES public.wards(id),
  ADD COLUMN IF NOT EXISTS street_village_id UUID REFERENCES public.streets_villages(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_listings_region_id ON public.listings(region_id);
CREATE INDEX IF NOT EXISTS idx_listings_district_id ON public.listings(district_id);
CREATE INDEX IF NOT EXISTS idx_listings_ward_id ON public.listings(ward_id);
CREATE INDEX IF NOT EXISTS idx_listings_street_village_id ON public.listings(street_village_id);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_verification_status ON public.listings(verification_status);
CREATE INDEX IF NOT EXISTS idx_listings_property_type ON public.listings(property_type);

-- ========================================================
-- MODULE 3: Dispute Resolution System
-- ========================================================

-- Create dispute type enum
CREATE TYPE public.dispute_type AS ENUM (
  'payment_issue',
  'fraud_suspicion',
  'misrepresentation',
  'unverified_documents',
  'visit_issue',
  'other'
);

-- Create dispute status enum
CREATE TYPE public.dispute_status AS ENUM (
  'open',
  'in_review',
  'resolved',
  'rejected'
);

-- Create disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.profiles(id),
  seller_id UUID REFERENCES public.profiles(id),
  opened_by UUID NOT NULL REFERENCES public.profiles(id),
  dispute_type public.dispute_type NOT NULL,
  description TEXT NOT NULL,
  status public.dispute_status NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for disputes
CREATE INDEX IF NOT EXISTS idx_disputes_listing_id ON public.disputes(listing_id);
CREATE INDEX IF NOT EXISTS idx_disputes_buyer_id ON public.disputes(buyer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_seller_id ON public.disputes(seller_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_by ON public.disputes(opened_by);

-- ========================================================
-- MODULE 6: Enhanced User Profiles
-- ========================================================

-- Add new fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id),
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id),
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]'::jsonb;

-- ========================================================
-- RLS Policies
-- ========================================================

-- Enable RLS on new tables
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streets_villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Regions policies (public read)
CREATE POLICY "Anyone can view regions"
  ON public.regions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage regions"
  ON public.regions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Districts policies (public read)
CREATE POLICY "Anyone can view districts"
  ON public.districts FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage districts"
  ON public.districts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Wards policies (public read)
CREATE POLICY "Anyone can view wards"
  ON public.wards FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage wards"
  ON public.wards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Streets/Villages policies (public read)
CREATE POLICY "Anyone can view streets_villages"
  ON public.streets_villages FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage streets_villages"
  ON public.streets_villages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Disputes policies
CREATE POLICY "Users can view their own disputes"
  ON public.disputes FOR SELECT
  USING (
    auth.uid() = opened_by
    OR auth.uid() = buyer_id
    OR auth.uid() = seller_id
  );

CREATE POLICY "Admins can view all disputes"
  ON public.disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'compliance_officer', 'verification_officer')
    )
  );

CREATE POLICY "Users can create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (auth.uid() = opened_by);

CREATE POLICY "Admins can update disputes"
  ON public.disputes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'compliance_officer')
    )
  );

-- Trigger for disputes updated_at
CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Notification trigger for new disputes
CREATE OR REPLACE FUNCTION public.notify_on_new_dispute()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opener_name TEXT;
  v_listing_title TEXT;
BEGIN
  SELECT full_name INTO v_opener_name FROM public.profiles WHERE id = NEW.opened_by;
  SELECT title INTO v_listing_title FROM public.listings WHERE id = NEW.listing_id;
  
  -- Notify seller if buyer opened dispute
  IF NEW.seller_id IS NOT NULL AND NEW.seller_id != NEW.opened_by THEN
    PERFORM create_notification(
      NEW.seller_id,
      'dispute_opened',
      'New Dispute Opened',
      v_opener_name || ' opened a dispute regarding "' || v_listing_title || '"',
      '/disputes/' || NEW.id
    );
  END IF;
  
  -- Notify buyer if seller opened dispute
  IF NEW.buyer_id IS NOT NULL AND NEW.buyer_id != NEW.opened_by THEN
    PERFORM create_notification(
      NEW.buyer_id,
      'dispute_opened',
      'New Dispute Opened',
      v_opener_name || ' opened a dispute regarding "' || v_listing_title || '"',
      '/disputes/' || NEW.id
    );
  END IF;
  
  -- Notify all admins and compliance officers
  PERFORM create_notification(
    profiles.id,
    'new_dispute',
    'New Dispute Requires Review',
    'A dispute has been opened for "' || v_listing_title || '" by ' || v_opener_name,
    '/admin/disputes'
  )
  FROM public.profiles
  WHERE profiles.role IN ('admin', 'compliance_officer');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_dispute_created
  AFTER INSERT ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_dispute();