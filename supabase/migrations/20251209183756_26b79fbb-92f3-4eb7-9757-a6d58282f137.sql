-- Fix the notify_on_service_request_update function to ensure message is never null
CREATE OR REPLACE FUNCTION public.notify_on_service_request_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_listing_title TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
  v_link_url TEXT;
BEGIN
  -- Get listing title (may be null if no listing)
  IF NEW.listing_id IS NOT NULL THEN
    SELECT title INTO v_listing_title FROM public.listings WHERE id = NEW.listing_id;
  END IF;
  
  -- Set link URL
  v_link_url := '/service-requests/' || NEW.id;
  
  -- Handle new service request
  IF TG_OP = 'INSERT' THEN
    -- Build message with fallback for null listing
    v_notification_message := 'A new service request has been submitted' || 
      CASE WHEN v_listing_title IS NOT NULL THEN ' for "' || v_listing_title || '"' ELSE '' END;
    
    -- Notify admins about new service request
    PERFORM create_notification(
      profiles.id,
      'new_message',
      'New Service Request',
      v_notification_message,
      '/admin/service-requests'
    )
    FROM public.profiles
    WHERE profiles.role IN ('admin', 'spatial_analyst');
    
    RETURN NEW;
  END IF;
  
  -- Handle service request updates
  IF TG_OP = 'UPDATE' THEN
    -- Notify requester on status change
    IF OLD.status != NEW.status THEN
      v_notification_title := 'Service Request ' || INITCAP(NEW.status);
      v_notification_message := 'Your service request' || 
        CASE WHEN v_listing_title IS NOT NULL THEN ' for "' || v_listing_title || '"' ELSE '' END ||
        ' is now ' || NEW.status;
      
      PERFORM create_notification(
        NEW.requester_id,
        'new_message',
        v_notification_title,
        v_notification_message,
        v_link_url
      );
    END IF;
    
    -- Notify requester when quote is added
    IF OLD.quoted_price IS NULL AND NEW.quoted_price IS NOT NULL THEN
      v_notification_message := 'You have received a quote of ' || NEW.quoted_price || ' ' || COALESCE(NEW.quoted_currency, 'TZS') ||
        CASE WHEN v_listing_title IS NOT NULL THEN ' for your service request on "' || v_listing_title || '"' ELSE ' for your service request' END;
      
      PERFORM create_notification(
        NEW.requester_id,
        'new_message',
        'Service Request Quote Received',
        v_notification_message,
        v_link_url
      );
    END IF;
    
    -- Notify requester when service is completed
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
      v_notification_message := 'Your service request' ||
        CASE WHEN v_listing_title IS NOT NULL THEN ' for "' || v_listing_title || '"' ELSE '' END ||
        ' has been completed';
      
      PERFORM create_notification(
        NEW.requester_id,
        'new_message',
        'Service Request Completed',
        v_notification_message,
        v_link_url
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;