-- Allow admins to create listings on behalf of users
CREATE POLICY "Admins can insert listings on behalf of users"
ON public.listings
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));