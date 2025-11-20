-- Ensure admins can view and update all institutional sellers
DROP POLICY IF EXISTS "Admins can view all institutional sellers" ON public.institutional_sellers;
CREATE POLICY "Admins can view all institutional sellers"
ON public.institutional_sellers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update institutional sellers" ON public.institutional_sellers;
CREATE POLICY "Admins can update institutional sellers"
ON public.institutional_sellers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));