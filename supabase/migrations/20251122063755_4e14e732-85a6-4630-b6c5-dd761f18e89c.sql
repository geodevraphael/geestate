-- Grant spatial_analyst access to service requests
CREATE POLICY "Spatial analysts can view all service requests"
ON public.service_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'spatial_analyst'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  auth.uid() = requester_id
);

CREATE POLICY "Spatial analysts can update service requests"
ON public.service_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'spatial_analyst'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Grant spatial_analyst access to valuation estimates
CREATE POLICY "Spatial analysts can view all valuations"
ON public.valuation_estimates
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'spatial_analyst'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM listings
    WHERE listings.id = valuation_estimates.listing_id
    AND (listings.owner_id = auth.uid() OR listings.status = 'published'::listing_status)
  )
);

CREATE POLICY "Spatial analysts can update valuations"
ON public.valuation_estimates
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'spatial_analyst'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Spatial analysts can create valuations"
ON public.valuation_estimates
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'spatial_analyst'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Grant spatial_analyst access to spatial risk profiles
CREATE POLICY "Spatial analysts can update spatial risk profiles"
ON public.spatial_risk_profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'spatial_analyst'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Grant spatial_analyst access to land use profiles
CREATE POLICY "Spatial analysts can update land use profiles"
ON public.land_use_profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'spatial_analyst'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Grant spatial_analyst access to proximity analysis
CREATE POLICY "Spatial analysts can update proximity analysis"
ON public.proximity_analysis
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'spatial_analyst'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Spatial analysts can insert proximity analysis"
ON public.proximity_analysis
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'spatial_analyst'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Grant spatial_analyst access to listing polygons for validation
CREATE POLICY "Spatial analysts can update listing polygons"
ON public.listing_polygons
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'spatial_analyst'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'verification_officer'::app_role)
);

-- Grant spatial_analyst access to listings for polygon validation
CREATE POLICY "Spatial analysts can update listing verification"
ON public.listings
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'spatial_analyst'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'verification_officer'::app_role) OR
  has_role(auth.uid(), 'compliance_officer'::app_role) OR
  auth.uid() = owner_id
);