-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can send messages to listing owners or anyone if staff" ON public.messages;

-- Create a new policy that allows users to send messages:
-- 1. To listing owners (when listing_id is provided)
-- 2. Direct messages to any user (when listing_id is null)
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
);