-- Drop and recreate the backfill function with new return type
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
  
  -- First, delete all existing individual listing fee records
  DELETE FROM geoinsight_income_records
  WHERE fee_definition_id = v_fee_definition.id
    AND status IN ('pending', 'awaiting_review');
  
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