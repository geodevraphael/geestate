-- Add notification function for institutional seller approval
CREATE OR REPLACE FUNCTION public.notify_institution_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_institution_name TEXT;
BEGIN
  IF NEW.is_approved = true AND (OLD.is_approved IS NULL OR OLD.is_approved = false) THEN
    v_institution_name := NEW.institution_name;
    
    -- Notify the institution profile owner
    PERFORM create_notification(
      NEW.profile_id,
      'listing_verified',
      'Institution Approved',
      'Your institution "' || v_institution_name || '" has been approved! You can now access your institution dashboard and landing page.',
      '/institutional-seller/dashboard'
    );
    
    -- Assign seller role if not already assigned
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (NEW.profile_id, 'seller'::app_role, NEW.approved_by_admin_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for institutional seller approval notifications
DROP TRIGGER IF EXISTS trigger_notify_institution_approval ON public.institutional_sellers;
CREATE TRIGGER trigger_notify_institution_approval
AFTER UPDATE ON public.institutional_sellers
FOR EACH ROW
EXECUTE FUNCTION public.notify_institution_approval();