-- Update charge_listing_fee to handle percentage-based fees
CREATE OR REPLACE FUNCTION public.charge_listing_fee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fee_definition geoinsight_fee_definitions%ROWTYPE;
  v_existing_record geoinsight_income_records%ROWTYPE;
  v_fee_amount NUMERIC;
  v_description TEXT;
BEGIN
  -- Only charge when listing status changes to published
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Get the listing fee definition
    SELECT * INTO v_fee_definition 
    FROM geoinsight_fee_definitions 
    WHERE code = 'LISTING_FEE' AND is_active = true
    LIMIT 1;
    
    -- Only proceed if fee definition exists and listing has a price
    IF v_fee_definition.id IS NOT NULL AND NEW.price IS NOT NULL AND NEW.price > 0 THEN
      -- Calculate fee based on type
      IF v_fee_definition.fee_type = 'percentage' AND v_fee_definition.percentage_rate IS NOT NULL THEN
        v_fee_amount := NEW.price * v_fee_definition.percentage_rate;
      ELSE
        v_fee_amount := COALESCE(v_fee_definition.fixed_amount, 0);
      END IF;
      
      -- Skip if fee is 0
      IF v_fee_amount <= 0 THEN
        RETURN NEW;
      END IF;
      
      v_description := 'Listing fee (0.1% of ' || NEW.price || ' ' || COALESCE(NEW.currency, 'TZS') || ') for: ' || NEW.title;
      
      -- Create income record for this listing
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
        v_fee_amount,
        COALESCE(NEW.currency, v_fee_definition.currency, 'TZS'),
        'pending',
        NOW() + INTERVAL '14 days'
      );
      
      -- Notify user about the listing fee
      PERFORM create_notification(
        NEW.owner_id,
        'payment_proof_submitted',
        'Listing Fee Due',
        'A listing fee of ' || ROUND(v_fee_amount, 2) || ' ' || COALESCE(NEW.currency, 'TZS') || ' (0.1% of selling price) is due for your listing "' || NEW.title || '". Payment is due within 14 days.',
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
          'calculation', v_fee_definition.fee_type,
          'listing_price', NEW.price,
          'fee_amount', v_fee_amount,
          'percentage_rate', v_fee_definition.percentage_rate
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update backfill_listing_fees to handle percentage-based fees
CREATE OR REPLACE FUNCTION public.backfill_listing_fees()
 RETURNS TABLE(income_record_id uuid, user_id uuid, listing_count integer, total_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fee_definition geoinsight_fee_definitions%ROWTYPE;
  v_listing_record RECORD;
  v_income_id UUID;
  v_description TEXT;
  v_fee_amount NUMERIC;
BEGIN
  -- Get the listing fee definition
  SELECT * INTO v_fee_definition 
  FROM geoinsight_fee_definitions 
  WHERE code = 'LISTING_FEE' AND is_active = true
  LIMIT 1;
  
  IF v_fee_definition.id IS NULL THEN
    RAISE EXCEPTION 'LISTING_FEE definition not found';
  END IF;
  
  -- Delete only non-overdue pending listing fee records that don't have payment proofs
  DELETE FROM geoinsight_income_records gir
  WHERE fee_definition_id = v_fee_definition.id
    AND status IN ('pending', 'awaiting_review')
    AND (due_date IS NULL OR due_date >= NOW())
    AND NOT EXISTS (
      SELECT 1 FROM geoinsight_payment_proofs gpp 
      WHERE gpp.income_record_id = gir.id
    );
  
  -- Create individual fee records for each published listing without existing fee
  FOR v_listing_record IN 
    SELECT l.id, l.owner_id, l.title, l.price, l.currency
    FROM listings l
    WHERE l.status = 'published'
      AND l.price IS NOT NULL
      AND l.price > 0
      AND NOT EXISTS (
        SELECT 1 FROM geoinsight_income_records gir
        WHERE gir.related_listing_id = l.id
          AND gir.fee_definition_id = v_fee_definition.id
      )
  LOOP
    -- Calculate fee based on type
    IF v_fee_definition.fee_type = 'percentage' AND v_fee_definition.percentage_rate IS NOT NULL THEN
      v_fee_amount := v_listing_record.price * v_fee_definition.percentage_rate;
    ELSE
      v_fee_amount := COALESCE(v_fee_definition.fixed_amount, 0);
    END IF;
    
    -- Skip if fee is 0
    IF v_fee_amount <= 0 THEN
      CONTINUE;
    END IF;
    
    v_description := 'Listing fee (0.1% of ' || v_listing_record.price || ' ' || COALESCE(v_listing_record.currency, 'TZS') || ') for: ' || v_listing_record.title;
    
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
      v_listing_record.owner_id,
      v_listing_record.id,
      v_fee_definition.id,
      v_description,
      v_fee_amount,
      COALESCE(v_listing_record.currency, v_fee_definition.currency, 'TZS'),
      'pending',
      NOW() + INTERVAL '14 days'
    )
    RETURNING id INTO v_income_id;
    
    -- Return the created record info
    income_record_id := v_income_id;
    user_id := v_listing_record.owner_id;
    listing_count := 1;
    total_amount := v_fee_amount;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$function$;