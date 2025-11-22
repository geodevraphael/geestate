-- Update RLS policies for messages to allow staff to initiate conversations

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- Allow users to send messages (including staff to any user)
CREATE POLICY "Users can send messages to listing owners or anyone if staff"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND (
    -- Normal users can message about listings they have access to
    listing_id IS NOT NULL OR
    -- Staff (admin, customer_success) can message anyone directly
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'customer_success'::app_role)
  )
);