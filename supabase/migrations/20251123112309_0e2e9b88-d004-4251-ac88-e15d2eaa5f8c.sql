-- Add listing fee definition
INSERT INTO public.geoinsight_fee_definitions (code, name, description, fee_type, fixed_amount, currency, is_active)
VALUES (
  'LISTING_FEE',
  'Listing Publication Fee',
  'Fee charged when a property listing is published on the platform',
  'fixed',
  50000.00,
  'TZS',
  true
)
ON CONFLICT (code) DO NOTHING;

-- Create function to charge listing fee when published
CREATE OR REPLACE FUNCTION public.charge_listing_fee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fee_definition geoinsight_fee_definitions%ROWTYPE;
  v_description TEXT;
BEGIN
  -- Only charge when listing status changes to published
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Get the listing fee definition
    SELECT * INTO v_fee_definition 
    FROM geoinsight_fee_definitions 
    WHERE code = 'LISTING_FEE' AND is_active = true
    LIMIT 1;
    
    -- Only proceed if fee definition exists
    IF v_fee_definition.id IS NOT NULL THEN
      v_description := 'Listing publication fee for: ' || NEW.title;
      
      -- Create income record
      INSERT INTO geoinsight_income_records (
        user_id,
        related_listing_id,
        fee_definition_id,
        description,
        amount_due,
        currency,
        status,
        due_date
      ) VALUES (
        NEW.owner_id,
        NEW.id,
        v_fee_definition.id,
        v_description,
        v_fee_definition.fixed_amount,
        v_fee_definition.currency,
        'pending',
        NOW() + INTERVAL '14 days'
      );
      
      -- Log audit
      INSERT INTO audit_logs (action_type, actor_id, listing_id, action_details)
      VALUES (
        'CREATE_INCOME_RECORD',
        NEW.owner_id,
        NEW.id,
        jsonb_build_object(
          'fee_type', 'LISTING_FEE',
          'amount', v_fee_definition.fixed_amount,
          'listing_status', 'published'
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on listings table
DROP TRIGGER IF EXISTS trigger_charge_listing_fee ON public.listings;
CREATE TRIGGER trigger_charge_listing_fee
  AFTER INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.charge_listing_fee();