-- Allow admins to insert media for any listing
CREATE POLICY "Admins can insert media for any listing"
ON public.listing_media
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'verification_officer'::app_role)
);