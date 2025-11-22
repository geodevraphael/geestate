-- Update notification trigger to handle direct messages (null listing_id)
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_listing_title TEXT;
  v_message TEXT;
BEGIN
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  -- Handle direct messages (no listing_id)
  IF NEW.listing_id IS NULL THEN
    v_message := v_sender_name || ' sent you a direct message';
    
    PERFORM create_notification(
      NEW.receiver_id,
      'new_message',
      'New Direct Message',
      v_message,
      '/messages?user=' || NEW.sender_id
    );
  ELSE
    -- Handle listing-based messages
    SELECT title INTO v_listing_title FROM public.listings WHERE id = NEW.listing_id;
    v_message := v_sender_name || ' sent you a message about "' || v_listing_title || '"';
    
    PERFORM create_notification(
      NEW.receiver_id,
      'new_message',
      'New Message',
      v_message,
      '/messages?listing=' || NEW.listing_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;