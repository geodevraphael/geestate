-- Drop the old problematic policies
DROP POLICY IF EXISTS "Providers can update their requests" ON public.service_requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.service_requests;

-- Create proper policies that use service_provider_profiles table
CREATE POLICY "Providers can view assigned requests"
ON public.service_requests
FOR SELECT
USING (
  auth.uid() = requester_id
  OR auth.uid() = service_provider_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'spatial_analyst'::app_role)
);

CREATE POLICY "Providers can update assigned requests"
ON public.service_requests
FOR UPDATE
USING (
  auth.uid() = service_provider_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'spatial_analyst'::app_role)
);

-- Drop the duplicate/conflicting policies
DROP POLICY IF EXISTS "Admins can view all requests" ON public.service_requests;
DROP POLICY IF EXISTS "Spatial analysts can view all service requests" ON public.service_requests;
DROP POLICY IF EXISTS "Spatial analysts can update service requests" ON public.service_requests;