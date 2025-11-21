-- Create proximity_analysis table to store detailed location analysis
CREATE TABLE IF NOT EXISTS public.proximity_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  
  -- Roads
  nearest_road_name TEXT,
  nearest_road_distance_m NUMERIC,
  nearest_major_road_name TEXT,
  nearest_major_road_distance_m NUMERIC,
  
  -- Hospitals
  nearest_hospital_name TEXT,
  nearest_hospital_distance_m NUMERIC,
  hospitals_within_5km JSONB, -- Array of {name, distance, type}
  
  -- Schools
  nearest_school_name TEXT,
  nearest_school_distance_m NUMERIC,
  schools_within_5km JSONB, -- Array of {name, distance, type}
  
  -- Marketplaces
  nearest_marketplace_name TEXT,
  nearest_marketplace_distance_m NUMERIC,
  marketplaces_within_5km JSONB, -- Array of {name, distance, type}
  
  -- Additional amenities
  public_transport_nearby JSONB, -- Bus stops, stations within 1km
  
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for fast lookups
CREATE INDEX idx_proximity_analysis_listing_id ON public.proximity_analysis(listing_id);

-- Enable RLS
ALTER TABLE public.proximity_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow public read access
CREATE POLICY "Allow public read access to proximity analysis"
  ON public.proximity_analysis
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert their own listings' analysis
CREATE POLICY "Allow authenticated users to insert proximity analysis"
  ON public.proximity_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = proximity_analysis.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Allow authenticated users to update their own listings' analysis
CREATE POLICY "Allow authenticated users to update proximity analysis"
  ON public.proximity_analysis
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = proximity_analysis.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_proximity_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_proximity_analysis_updated_at
  BEFORE UPDATE ON public.proximity_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_proximity_analysis_updated_at();