-- Create function to notify users on service request updates
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
  -- Get listing title
  SELECT title INTO v_listing_title FROM public.listings WHERE id = NEW.listing_id;
  
  -- Set link URL
  v_link_url := '/service-requests/' || NEW.id;
  
  -- Handle new service request
  IF TG_OP = 'INSERT' THEN
    -- Notify admins about new service request
    PERFORM create_notification(
      profiles.id,
      'new_message',
      'New Service Request',
      'A new service request has been submitted for "' || v_listing_title || '"',
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
      v_notification_message := 'Your service request for "' || v_listing_title || '" is now ' || NEW.status;
      
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
      PERFORM create_notification(
        NEW.requester_id,
        'new_message',
        'Service Request Quote Received',
        'You have received a quote of ' || NEW.quoted_price || ' ' || COALESCE(NEW.quoted_currency, 'TZS') || ' for your service request on "' || v_listing_title || '"',
        v_link_url
      );
    END IF;
    
    -- Notify requester when service is completed
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
      PERFORM create_notification(
        NEW.requester_id,
        'new_message',
        'Service Request Completed',
        'Your service request for "' || v_listing_title || '" has been completed',
        v_link_url
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for service request notifications
DROP TRIGGER IF EXISTS on_service_request_change ON public.service_requests;
CREATE TRIGGER on_service_request_change
  AFTER INSERT OR UPDATE ON public.service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_service_request_update();