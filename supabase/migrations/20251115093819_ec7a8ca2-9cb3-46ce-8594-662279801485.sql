-- Create notification trigger for visit requests

-- Function to notify on visit request creation and updates
CREATE OR REPLACE FUNCTION public.notify_on_visit_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_name TEXT;
  v_seller_name TEXT;
  v_listing_title TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
  v_link_url TEXT;
BEGIN
  -- Get names and listing details
  SELECT full_name INTO v_buyer_name FROM public.profiles WHERE id = NEW.buyer_id;
  SELECT full_name INTO v_seller_name FROM public.profiles WHERE id = NEW.seller_id;
  SELECT title INTO v_listing_title FROM public.listings WHERE id = NEW.listing_id;
  
  v_link_url := '/visit-requests';
  
  -- Handle new visit request (INSERT)
  IF TG_OP = 'INSERT' THEN
    -- Notify seller about new visit request
    PERFORM create_notification(
      NEW.seller_id,
      'visit_requested',
      'New Site Visit Request',
      v_buyer_name || ' requested to visit "' || v_listing_title || '" on ' || TO_CHAR(NEW.requested_date::DATE, 'Mon DD, YYYY') || ' at ' || NEW.requested_time_slot,
      v_link_url
    );
    
    RETURN NEW;
  END IF;
  
  -- Handle visit request status updates (UPDATE)
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'accepted' THEN
        -- Notify buyer that seller accepted
        v_notification_title := 'Visit Request Accepted';
        v_notification_message := v_seller_name || ' accepted your visit request for "' || v_listing_title || '"';
        
        PERFORM create_notification(
          NEW.buyer_id,
          'visit_requested',
          v_notification_title,
          v_notification_message,
          v_link_url
        );
        
      WHEN 'rejected' THEN
        -- Notify buyer that seller rejected
        v_notification_title := 'Visit Request Rejected';
        v_notification_message := v_seller_name || ' rejected your visit request for "' || v_listing_title || '"';
        
        PERFORM create_notification(
          NEW.buyer_id,
          'visit_requested',
          v_notification_title,
          v_notification_message,
          v_link_url
        );
        
      WHEN 'completed' THEN
        -- Notify both parties that visit is completed
        PERFORM create_notification(
          NEW.buyer_id,
          'visit_requested',
          'Visit Completed',
          'Your visit to "' || v_listing_title || '" has been marked as completed',
          v_link_url
        );
        
        PERFORM create_notification(
          NEW.seller_id,
          'visit_requested',
          'Visit Completed',
          'The visit for "' || v_listing_title || '" has been marked as completed',
          v_link_url
        );
        
      ELSE
        -- Do nothing for other status changes
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for visit requests
DROP TRIGGER IF EXISTS trigger_notify_on_visit_request ON public.visit_requests;

CREATE TRIGGER trigger_notify_on_visit_request
AFTER INSERT OR UPDATE ON public.visit_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_visit_request();