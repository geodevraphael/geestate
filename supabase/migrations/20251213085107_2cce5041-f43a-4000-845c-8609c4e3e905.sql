-- Drop the problematic policy and recreate it properly
DROP POLICY IF EXISTS "Admins can view all media" ON public.listing_media;

CREATE POLICY "Admins can view all media"
ON public.listing_media
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'verification_officer'::app_role) OR 
  has_role(auth.uid(), 'compliance_officer'::app_role)
);