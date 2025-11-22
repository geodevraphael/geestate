-- Update lead creation trigger to handle direct messages
CREATE OR REPLACE FUNCTION public.create_lead_from_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create lead if message is about a listing (skip direct messages)
  IF NEW.listing_id IS NOT NULL THEN
    INSERT INTO public.leads (listing_id, seller_id, buyer_id, source, status)
    SELECT 
      NEW.listing_id,
      NEW.receiver_id,
      NEW.sender_id,
      'message'::lead_source,
      'new'::lead_status
    FROM public.listings
    WHERE listings.id = NEW.listing_id
    AND listings.owner_id = NEW.receiver_id
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;