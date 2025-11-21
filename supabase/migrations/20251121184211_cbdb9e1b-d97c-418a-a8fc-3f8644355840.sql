-- Update RLS policy on listings to allow viewing listings involved in user's messages
-- This ensures users can see listing details in their message conversations

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view published listings" ON public.listings;

-- Create new policy that allows viewing:
-- 1. Published listings (anyone)
-- 2. Own listings (owner)
-- 3. Listings involved in user's messages (sender or receiver)
CREATE POLICY "Users can view published, own, or messaged listings"
ON public.listings
FOR SELECT
USING (
  status = 'published'::listing_status 
  OR owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.messages
    WHERE messages.listing_id = listings.id
    AND (messages.sender_id = auth.uid() OR messages.receiver_id = auth.uid())
  )
);