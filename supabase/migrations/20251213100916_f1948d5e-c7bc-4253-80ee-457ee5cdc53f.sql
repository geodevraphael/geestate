-- Fix the admin insert policy to properly allow admins to set any owner_id
-- The current policy allows insert but doesn't have explicit WITH CHECK

-- Drop existing admin insert policy
DROP POLICY IF EXISTS "Admins can insert listings on behalf of users" ON public.listings;

-- Recreate with explicit WITH CHECK that allows any owner_id when admin
CREATE POLICY "Admins can insert listings on behalf of users"
  ON public.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also need to ensure the "Owners can insert own listings" doesn't block admin inserts
-- Drop and recreate to be more explicit
DROP POLICY IF EXISTS "Owners can insert own listings" ON public.listings;

-- Recreate: Allow sellers/brokers to insert their own listings (not admins - they use separate policy)
CREATE POLICY "Owners can insert own listings"
  ON public.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = owner_id) 
    AND (
      has_role(auth.uid(), 'seller'::app_role) 
      OR has_role(auth.uid(), 'broker'::app_role)
    )
    AND NOT has_role(auth.uid(), 'admin'::app_role) -- Exclude admins, they use their own policy
  );