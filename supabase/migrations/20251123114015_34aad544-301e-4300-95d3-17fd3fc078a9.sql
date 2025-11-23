-- Update charge_listing_fee to exclude overdue records from grouping
CREATE OR REPLACE FUNCTION public.charge_listing_fee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fee_definition geoinsight_fee_definitions%ROWTYPE;
  v_existing_record geoinsight_income_records%ROWTYPE;
  v_listing_count INTEGER;
  v_new_total NUMERIC;
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
      -- Check if user has an existing pending/awaiting_review listing fee record (NOT overdue)
      SELECT * INTO v_existing_record
      FROM geoinsight_income_records
      WHERE user_id = NEW.owner_id
        AND fee_definition_id = v_fee_definition.id
        AND status IN ('pending', 'awaiting_review')
      ORDER BY created_at DESC
      LIMIT 1;
      
      IF v_existing_record.id IS NOT NULL THEN
        -- Update existing record: increment amount and update description
        -- Calculate count from existing amount
        v_listing_count := (v_existing_record.amount_due / v_fee_definition.fixed_amount)::INTEGER + 1;
        v_new_total := v_existing_record.amount_due + v_fee_definition.fixed_amount;
        
        v_description := 'Listing fees for ' || v_listing_count || ' properties (' || 
                        v_fee_definition.fixed_amount || ' ' || v_fee_definition.currency || ' each)';
        
        UPDATE geoinsight_income_records
        SET 
          amount_due = v_new_total,
          description = v_description,
          updated_at = NOW()
        WHERE id = v_existing_record.id;
        
        -- Log audit
        INSERT INTO audit_logs (action_type, actor_id, listing_id, action_details)
        VALUES (
          'UPDATE_INCOME_RECORD',
          NEW.owner_id,
          NEW.id,
          jsonb_build_object(
            'fee_type', 'LISTING_FEE',
            'action', 'increment',
            'new_amount', v_new_total,
            'listing_count', v_listing_count,
            'income_record_id', v_existing_record.id
          )
        );
      ELSE
        -- Create new grouped record
        v_description := 'Listing fees for 1 property (' || 
                        v_fee_definition.fixed_amount || ' ' || v_fee_definition.currency || ' each)';
        
        INSERT INTO geoinsight_income_records (
          user_id,
          fee_definition_id,
          description,
          amount_due,
          currency,
          status,
          due_date
        ) VALUES (
          NEW.owner_id,
          v_fee_definition.id,
          v_description,
          v_fee_definition.fixed_amount,
          v_fee_definition.currency,
          'pending',
          NOW() + INTERVAL '14 days'
        );
        
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
            'listing_status', 'published'
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update backfill function to exclude overdue records from grouping
DROP FUNCTION IF EXISTS public.backfill_listing_fees();

CREATE FUNCTION public.backfill_listing_fees()
RETURNS TABLE(
  income_record_id UUID,
  user_id UUID,
  listing_count INTEGER,
  total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fee_definition geoinsight_fee_definitions%ROWTYPE;
  v_user_record RECORD;
  v_income_id UUID;
  v_description TEXT;
BEGIN
  -- Get the listing fee definition
  SELECT * INTO v_fee_definition 
  FROM geoinsight_fee_definitions 
  WHERE code = 'LISTING_FEE' AND is_active = true
  LIMIT 1;
  
  IF v_fee_definition.id IS NULL THEN
    RAISE EXCEPTION 'LISTING_FEE definition not found';
  END IF;
  
  -- Delete only non-overdue individual listing fee records
  DELETE FROM geoinsight_income_records
  WHERE fee_definition_id = v_fee_definition.id
    AND status IN ('pending', 'awaiting_review')
    AND (due_date IS NULL OR due_date >= NOW());
  
  -- Group published listings by owner and create one record per user
  FOR v_user_record IN 
    SELECT 
      l.owner_id,
      COUNT(*) as listing_count
    FROM listings l
    WHERE l.status = 'published'
    GROUP BY l.owner_id
    HAVING COUNT(*) > 0
  LOOP
    -- Calculate total amount
    v_description := 'Listing fees for ' || v_user_record.listing_count || ' properties (' || 
                    v_fee_definition.fixed_amount || ' ' || v_fee_definition.currency || ' each)';
    
    -- Create grouped income record
    INSERT INTO geoinsight_income_records (
      user_id,
      fee_definition_id,
      description,
      amount_due,
      currency,
      status,
      due_date
    ) VALUES (
      v_user_record.owner_id,
      v_fee_definition.id,
      v_description,
      v_fee_definition.fixed_amount * v_user_record.listing_count,
      v_fee_definition.currency,
      'pending',
      NOW() + INTERVAL '14 days'
    )
    RETURNING id INTO v_income_id;
    
    -- Notify user
    PERFORM create_notification(
      v_user_record.owner_id,
      'payment_proof_submitted',
      'Listing Fees Due',
      'Listing fees for ' || v_user_record.listing_count || ' properties (' || 
      (v_fee_definition.fixed_amount * v_user_record.listing_count) || ' ' || 
      v_fee_definition.currency || ' total) are due. Payment is due within 14 days.',
      '/geoinsight-payments'
    );
    
    -- Return the created record info
    income_record_id := v_income_id;
    user_id := v_user_record.owner_id;
    listing_count := v_user_record.listing_count;
    total_amount := v_fee_definition.fixed_amount * v_user_record.listing_count;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$function$;