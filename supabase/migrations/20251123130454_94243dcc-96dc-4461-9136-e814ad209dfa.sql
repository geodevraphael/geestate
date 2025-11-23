-- Allow buyers to view listings they have buying process records for
CREATE POLICY "Buyers can view listings with buying process"
ON listings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM buying_process_tracker
    WHERE buying_process_tracker.listing_id = listings.id
    AND buying_process_tracker.buyer_id = auth.uid()
  )
);