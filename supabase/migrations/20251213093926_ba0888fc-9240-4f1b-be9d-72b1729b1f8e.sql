-- Delete existing individual listing fee records
DELETE FROM geoinsight_income_records gir
WHERE fee_definition_id = (SELECT id FROM geoinsight_fee_definitions WHERE code = 'LISTING_FEE')
  AND status IN ('pending', 'awaiting_review')
  AND NOT EXISTS (
    SELECT 1 FROM geoinsight_payment_proofs gpp 
    WHERE gpp.income_record_id = gir.id
  );

-- Create grouped listing fees per user
INSERT INTO geoinsight_income_records (
  user_id,
  fee_definition_id,
  description,
  amount_due,
  currency,
  status,
  due_date
)
SELECT 
  l.owner_id,
  gfd.id,
  'Listing fees (0.1% of selling price) for ' || COUNT(*) || ' properties - Total value: ' || SUM(l.price) || ' TZS',
  SUM(l.price * gfd.percentage_rate),
  'TZS',
  'pending',
  NOW() + INTERVAL '14 days'
FROM listings l
CROSS JOIN geoinsight_fee_definitions gfd
WHERE l.status = 'published'
  AND l.price IS NOT NULL
  AND l.price > 0
  AND gfd.code = 'LISTING_FEE'
  AND gfd.is_active = true
GROUP BY l.owner_id, gfd.id;

-- Update charge_listing_fee to group fees per user
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
  v_current_total NUMERIC;
  v_listing_count INTEGER;
  v_total_value NUMERIC;
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
      -- Calculate fee for this listing
      IF v_fee_definition.fee_type = 'percentage' AND v_fee_definition.percentage_rate IS NOT NULL THEN
        v_fee_amount := NEW.price * v_fee_definition.percentage_rate;
      ELSE
        v_fee_amount := COALESCE(v_fee_definition.fixed_amount, 0);
      END IF;
      
      IF v_fee_amount <= 0 THEN
        RETURN NEW;
      END IF;
      
      -- Check for existing pending grouped record for this user
      SELECT * INTO v_existing_record
      FROM geoinsight_income_records
      WHERE user_id = NEW.owner_id
        AND fee_definition_id = v_fee_definition.id
        AND status IN ('pending', 'awaiting_review')
        AND related_listing_id IS NULL
      ORDER BY created_at DESC
      LIMIT 1;
      
      IF v_existing_record.id IS NOT NULL THEN
        -- Calculate new totals
        SELECT COUNT(*), SUM(price)
        INTO v_listing_count, v_total_value
        FROM listings
        WHERE owner_id = NEW.owner_id
          AND status = 'published'
          AND price IS NOT NULL
          AND price > 0;
        
        -- Update existing grouped record
        UPDATE geoinsight_income_records
        SET 
          amount_due = v_total_value * v_fee_definition.percentage_rate,
          description = 'Listing fees (0.1% of selling price) for ' || v_listing_count || ' properties - Total value: ' || v_total_value || ' TZS',
          updated_at = NOW()
        WHERE id = v_existing_record.id;
      ELSE
        -- Create new grouped record
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
          'Listing fees (0.1% of selling price) for 1 property - Total value: ' || NEW.price || ' TZS',
          v_fee_amount,
          COALESCE(NEW.currency, v_fee_definition.currency, 'TZS'),
          'pending',
          NOW() + INTERVAL '14 days'
        );
        
        -- Notify user
        PERFORM create_notification(
          NEW.owner_id,
          'payment_proof_submitted',
          'Listing Fee Due',
          'A listing fee of ' || ROUND(v_fee_amount, 2) || ' TZS (0.1% of selling price) is due for your listing. Payment is due within 14 days.',
          '/geoinsight-payments'
        );
      END IF;
      
      -- Log audit
      INSERT INTO audit_logs (action_type, actor_id, listing_id, action_details)
      VALUES (
        'CREATE_INCOME_RECORD',
        NEW.owner_id,
        NEW.id,
        jsonb_build_object(
          'fee_type', 'LISTING_FEE',
          'listing_price', NEW.price,
          'fee_amount', v_fee_amount
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update backfill function
CREATE OR REPLACE FUNCTION public.backfill_listing_fees()
 RETURNS TABLE(income_record_id uuid, user_id uuid, listing_count integer, total_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fee_definition geoinsight_fee_definitions%ROWTYPE;
  v_user_record RECORD;
  v_income_id UUID;
BEGIN
  SELECT * INTO v_fee_definition 
  FROM geoinsight_fee_definitions 
  WHERE code = 'LISTING_FEE' AND is_active = true
  LIMIT 1;
  
  IF v_fee_definition.id IS NULL THEN
    RAISE EXCEPTION 'LISTING_FEE definition not found';
  END IF;
  
  -- Delete pending records without payment proofs
  DELETE FROM geoinsight_income_records gir
  WHERE fee_definition_id = v_fee_definition.id
    AND status IN ('pending', 'awaiting_review')
    AND NOT EXISTS (
      SELECT 1 FROM geoinsight_payment_proofs gpp 
      WHERE gpp.income_record_id = gir.id
    );
  
  -- Create grouped records per user
  FOR v_user_record IN 
    SELECT 
      l.owner_id,
      COUNT(*) as listing_count,
      SUM(l.price) as total_value,
      SUM(l.price * v_fee_definition.percentage_rate) as total_fee
    FROM listings l
    WHERE l.status = 'published'
      AND l.price IS NOT NULL
      AND l.price > 0
    GROUP BY l.owner_id
  LOOP
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
      'Listing fees (0.1% of selling price) for ' || v_user_record.listing_count || ' properties - Total value: ' || v_user_record.total_value || ' TZS',
      v_user_record.total_fee,
      v_fee_definition.currency,
      'pending',
      NOW() + INTERVAL '14 days'
    )
    RETURNING id INTO v_income_id;
    
    income_record_id := v_income_id;
    user_id := v_user_record.owner_id;
    listing_count := v_user_record.listing_count;
    total_amount := v_user_record.total_fee;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$function$;