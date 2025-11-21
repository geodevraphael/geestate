-- Allow anyone (authenticated and anonymous) to see which users are sellers or brokers
CREATE POLICY "Anyone can view seller and broker roles"
ON public.user_roles
FOR SELECT
USING (role IN ('seller'::app_role, 'broker'::app_role));

-- Allow anyone to view approved institutional sellers
CREATE POLICY "Anyone can view approved institutions"
ON public.institutional_sellers
FOR SELECT
USING (is_approved = true);