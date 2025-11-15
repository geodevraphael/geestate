-- Add visit_requested to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'visit_requested';

-- Enable RLS on visit_requests table (if not already enabled)
ALTER TABLE visit_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Buyers can view their own visit requests" ON public.visit_requests;
DROP POLICY IF EXISTS "Sellers can view visit requests for their listings" ON public.visit_requests;
DROP POLICY IF EXISTS "Buyers can create visit requests" ON public.visit_requests;
DROP POLICY IF EXISTS "Sellers can update visit requests for their listings" ON public.visit_requests;
DROP POLICY IF EXISTS "Buyers can update their own visit requests" ON public.visit_requests;
DROP POLICY IF EXISTS "Admins can view all visit requests" ON public.visit_requests;
DROP POLICY IF EXISTS "Admins can manage visit requests" ON public.visit_requests;

-- Create comprehensive RLS policies

-- SELECT policies: Both buyers and sellers can view their visit requests
CREATE POLICY "Buyers can view their own visit requests"
ON public.visit_requests
FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view visit requests for their listings"
ON public.visit_requests
FOR SELECT
TO authenticated
USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all visit requests"
ON public.visit_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- INSERT policy: Buyers can create visit requests
CREATE POLICY "Buyers can create visit requests"
ON public.visit_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

-- UPDATE policies: Both buyers and sellers can update
CREATE POLICY "Sellers can update visit requests"
ON public.visit_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can update their visit requests"
ON public.visit_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id);

CREATE POLICY "Admins can update all visit requests"
ON public.visit_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- DELETE policy: Admins only
CREATE POLICY "Admins can delete visit requests"
ON public.visit_requests
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));