-- Create enum types for roles and statuses
CREATE TYPE app_role AS ENUM ('buyer', 'seller', 'broker', 'admin', 'verification_officer', 'compliance_officer');
CREATE TYPE listing_type AS ENUM ('sale', 'rent');
CREATE TYPE property_type AS ENUM ('land', 'house', 'apartment', 'commercial', 'other');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE listing_status AS ENUM ('draft', 'published', 'archived', 'closed');
CREATE TYPE media_type AS ENUM ('image', 'document');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  role app_role,
  national_id_number TEXT,
  organization_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Listings table
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  listing_type listing_type NOT NULL,
  property_type property_type NOT NULL,
  price NUMERIC,
  currency TEXT DEFAULT 'TZS',
  location_label TEXT NOT NULL,
  region TEXT,
  district TEXT,
  ward TEXT,
  is_polygon_verified BOOLEAN DEFAULT false,
  verification_status verification_status DEFAULT 'unverified',
  verification_notes TEXT,
  status listing_status DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on listings
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Listings policies
CREATE POLICY "Anyone can view published listings"
  ON public.listings FOR SELECT
  TO authenticated
  USING (status = 'published' OR owner_id = auth.uid());

CREATE POLICY "Admins can view all listings"
  ON public.listings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'verification_officer', 'compliance_officer')
    )
  );

CREATE POLICY "Owners can insert own listings"
  ON public.listings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('seller', 'broker', 'admin')
    )
  );

CREATE POLICY "Owners can update own listings"
  ON public.listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can update any listing"
  ON public.listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'verification_officer', 'compliance_officer')
    )
  );

-- Listing polygons table
CREATE TABLE public.listing_polygons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE CASCADE,
  geojson JSONB NOT NULL,
  area_m2 NUMERIC,
  centroid_lat NUMERIC,
  centroid_lng NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on listing_polygons
ALTER TABLE public.listing_polygons ENABLE ROW LEVEL SECURITY;

-- Listing polygons policies
CREATE POLICY "Anyone can view polygons for published listings"
  ON public.listing_polygons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = listing_id
      AND (status = 'published' OR owner_id = auth.uid())
    )
  );

CREATE POLICY "Admins can view all polygons"
  ON public.listing_polygons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'verification_officer', 'compliance_officer')
    )
  );

CREATE POLICY "Owners can insert polygons for own listings"
  ON public.listing_polygons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = listing_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update polygons for own listings"
  ON public.listing_polygons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = listing_id
      AND owner_id = auth.uid()
    )
  );

-- Listing media table
CREATE TABLE public.listing_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  media_type media_type NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on listing_media
ALTER TABLE public.listing_media ENABLE ROW LEVEL SECURITY;

-- Listing media policies
CREATE POLICY "Anyone can view media for published listings"
  ON public.listing_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = listing_id
      AND (status = 'published' OR owner_id = auth.uid())
    )
  );

CREATE POLICY "Admins can view all media"
  ON public.listing_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'verification_officer', 'compliance_officer')
    )
  );

CREATE POLICY "Owners can insert media for own listings"
  ON public.listing_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = listing_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete media for own listings"
  ON public.listing_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = listing_id
      AND owner_id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listing_polygons_updated_at
  BEFORE UPDATE ON public.listing_polygons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for listing media
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-media', 'listing-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for listing media
CREATE POLICY "Anyone can view listing media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-media');

CREATE POLICY "Authenticated users can upload listing media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'listing-media');

CREATE POLICY "Users can update own listing media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'listing-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own listing media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'listing-media' AND auth.uid()::text = (storage.foldername(name))[1]);