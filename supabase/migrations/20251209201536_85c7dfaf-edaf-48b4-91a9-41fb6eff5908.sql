-- Drop the incorrect UPDATE policy
DROP POLICY IF EXISTS "Providers can update assigned requests" ON service_requests;

-- Create a corrected UPDATE policy that checks the user_id via service_provider_profiles
CREATE POLICY "Providers can update assigned requests" ON service_requests
FOR UPDATE
USING (
  (auth.uid() = requester_id) OR
  (EXISTS (
    SELECT 1 FROM service_provider_profiles spp 
    WHERE spp.id = service_requests.service_provider_id 
    AND spp.user_id = auth.uid()
  )) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'spatial_analyst'::app_role)
);

-- Also fix the SELECT policy to properly check provider user_id
DROP POLICY IF EXISTS "Providers can view assigned requests" ON service_requests;

CREATE POLICY "Providers can view assigned requests" ON service_requests
FOR SELECT
USING (
  (auth.uid() = requester_id) OR
  (EXISTS (
    SELECT 1 FROM service_provider_profiles spp 
    WHERE spp.id = service_requests.service_provider_id 
    AND spp.user_id = auth.uid()
  )) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'spatial_analyst'::app_role)
);