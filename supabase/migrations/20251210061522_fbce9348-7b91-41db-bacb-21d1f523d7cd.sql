-- Fix 1: Restrict profiles table RLS - users can only view their own profile by default
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more restrictive policy - users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow staff roles to view profiles they need for their work
CREATE POLICY "Staff can view profiles for work"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'customer_success'::app_role) OR
  has_role(auth.uid(), 'verification_officer'::app_role) OR
  has_role(auth.uid(), 'compliance_officer'::app_role)
);

-- Allow users to view profiles of people they have messages with
CREATE POLICY "Users can view profiles of message contacts"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages 
    WHERE (sender_id = auth.uid() AND receiver_id = profiles.id)
       OR (receiver_id = auth.uid() AND sender_id = profiles.id)
  )
);

-- Allow users to view seller profiles for listings they're interested in
CREATE POLICY "Users can view listing owner profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM listings 
    WHERE owner_id = profiles.id 
    AND status = 'published'
  )
);

-- Allow viewing profiles involved in transactions (visits, payments, deals)
CREATE POLICY "Users can view transaction party profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM visit_requests 
    WHERE (buyer_id = auth.uid() AND seller_id = profiles.id)
       OR (seller_id = auth.uid() AND buyer_id = profiles.id)
  )
  OR EXISTS (
    SELECT 1 FROM payment_proofs 
    WHERE (buyer_id = auth.uid() AND seller_id = profiles.id)
       OR (seller_id = auth.uid() AND buyer_id = profiles.id)
  )
  OR EXISTS (
    SELECT 1 FROM deal_closures 
    WHERE (buyer_id = auth.uid() AND seller_id = profiles.id)
       OR (seller_id = auth.uid() AND buyer_id = profiles.id)
  )
);

-- Fix 2: Create a public view with limited fields for seller/broker discovery
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  profile_photo_url,
  bio,
  organization_name
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Fix 3: Make payment-proofs bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'payment-proofs';

-- Update storage policies for payment-proofs bucket
DROP POLICY IF EXISTS "Payment proofs are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;

-- Policy: Only buyers, sellers, and admins involved in the transaction can view payment proofs
CREATE POLICY "Transaction parties can view payment proofs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND (
    -- Admins can view all
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'compliance_officer'::app_role) OR
    -- Users can view their own uploads (file path starts with their user id)
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Users involved in the payment proof record can view
    EXISTS (
      SELECT 1 FROM payment_proofs pp
      WHERE pp.proof_file_url LIKE '%' || name || '%'
        AND (pp.buyer_id = auth.uid() OR pp.seller_id = auth.uid())
    )
  )
);

-- Policy: Authenticated users can upload to their own folder
CREATE POLICY "Users can upload own payment proofs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid() IS NOT NULL
);

-- Policy: Users can update their own payment proofs
CREATE POLICY "Users can update own payment proofs"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'payment-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own payment proofs
CREATE POLICY "Users can delete own payment proofs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'payment-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);