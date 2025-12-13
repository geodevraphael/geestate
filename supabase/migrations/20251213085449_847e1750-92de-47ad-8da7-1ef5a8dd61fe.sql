-- Allow admins and verification officers to insert polygons for any listing
CREATE POLICY "Admins can insert polygons for any listing"
ON public.listing_polygons
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'verification_officer'::app_role)
);