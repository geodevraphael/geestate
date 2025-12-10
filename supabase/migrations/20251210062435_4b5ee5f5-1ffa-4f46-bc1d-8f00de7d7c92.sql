-- Fix institutional_sellers policy to require authentication
-- This prevents unauthenticated users from harvesting contact information

DROP POLICY IF EXISTS "Anyone can view approved institutions" ON public.institutional_sellers;

CREATE POLICY "Authenticated users can view approved institutions"
ON public.institutional_sellers FOR SELECT
TO authenticated
USING (is_approved = true);