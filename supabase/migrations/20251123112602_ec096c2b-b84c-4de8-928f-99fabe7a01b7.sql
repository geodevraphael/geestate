-- Update the charge_listing_fee function to include notifications
CREATE OR REPLACE FUNCTION public.charge_listing_fee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fee_definition geoinsight_fee_definitions%ROWTYPE;
  v_description TEXT;
  v_income_id UUID;
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
      )
      RETURNING id INTO v_income_id;
      
      -- Notify user about the listing fee
      PERFORM create_notification(
        NEW.owner_id,
        'payment_proof_submitted',
        'Listing Fee Due',
        'A listing fee of ' || v_fee_definition.fixed_amount || ' ' || v_fee_definition.currency || ' is due for your listing "' || NEW.title || '". Payment is due within 14 days.',
        '/geoinsight-payments'
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
          'listing_status', 'published',
          'income_record_id', v_income_id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create an admin function to backfill listing fees for existing published listings
CREATE OR REPLACE FUNCTION public.backfill_listing_fees()
RETURNS TABLE(
  income_record_id UUID,
  listing_id UUID,
  user_id UUID,
  listing_title TEXT,
  amount_due NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fee_definition geoinsight_fee_definitions%ROWTYPE;
  v_listing RECORD;
  v_income_id UUID;
BEGIN
  -- Get the listing fee definition
  SELECT * INTO v_fee_definition 
  FROM geoinsight_fee_definitions 
  WHERE code = 'LISTING_FEE' AND is_active = true
  LIMIT 1;
  
  IF v_fee_definition.id IS NULL THEN
    RAISE EXCEPTION 'LISTING_FEE definition not found';
  END IF;
  
  -- Loop through all published listings without a listing fee
  FOR v_listing IN 
    SELECT l.id, l.owner_id, l.title
    FROM listings l
    WHERE l.status = 'published'
      AND NOT EXISTS (
        SELECT 1 
        FROM geoinsight_income_records ir 
        WHERE ir.related_listing_id = l.id 
          AND ir.fee_definition_id = v_fee_definition.id
      )
  LOOP
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
      v_listing.owner_id,
      v_listing.id,
      v_fee_definition.id,
      'Listing publication fee for: ' || v_listing.title,
      v_fee_definition.fixed_amount,
      v_fee_definition.currency,
      'pending',
      NOW() + INTERVAL '14 days'
    )
    RETURNING id INTO v_income_id;
    
    -- Notify user
    PERFORM create_notification(
      v_listing.owner_id,
      'payment_proof_submitted',
      'Listing Fee Due',
      'A listing fee of ' || v_fee_definition.fixed_amount || ' ' || v_fee_definition.currency || ' is due for your listing "' || v_listing.title || '". Payment is due within 14 days.',
      '/geoinsight-payments'
    );
    
    -- Return the created record info
    income_record_id := v_income_id;
    listing_id := v_listing.id;
    user_id := v_listing.owner_id;
    listing_title := v_listing.title;
    amount_due := v_fee_definition.fixed_amount;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$function$;