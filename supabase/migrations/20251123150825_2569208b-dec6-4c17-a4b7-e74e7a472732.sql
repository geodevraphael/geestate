-- Add monthly subscription fee definition
INSERT INTO geoinsight_fee_definitions (code, name, description, fee_type, fixed_amount, currency, is_active)
VALUES (
  'MONTHLY_SUBSCRIPTION',
  'Monthly GeoInsight Fee',
  'Monthly platform subscription fee for all users (except buyers)',
  'fixed',
  100000,
  'TZS',
  true
)
ON CONFLICT (code) DO UPDATE SET
  fixed_amount = 100000,
  is_active = true,
  updated_at = NOW();

-- Create function to generate monthly fees for eligible users
CREATE OR REPLACE FUNCTION generate_monthly_fees()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_definition geoinsight_fee_definitions%ROWTYPE;
  v_user_record RECORD;
  v_existing_record geoinsight_income_records%ROWTYPE;
BEGIN
  -- Get the monthly subscription fee definition
  SELECT * INTO v_fee_definition 
  FROM geoinsight_fee_definitions 
  WHERE code = 'MONTHLY_SUBSCRIPTION' AND is_active = true
  LIMIT 1;
  
  IF v_fee_definition.id IS NULL THEN
    RAISE EXCEPTION 'MONTHLY_SUBSCRIPTION fee definition not found';
  END IF;
  
  -- Generate fees for all users with roles other than buyer
  FOR v_user_record IN 
    SELECT DISTINCT p.id, p.full_name, p.email
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role != 'buyer'
  LOOP
    -- Check if user already has a pending/awaiting_review monthly fee for current month
    SELECT * INTO v_existing_record
    FROM geoinsight_income_records
    WHERE user_id = v_user_record.id
      AND fee_definition_id = v_fee_definition.id
      AND status IN ('pending', 'awaiting_review')
      AND due_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    LIMIT 1;
    
    -- Only create if no existing record for this month
    IF v_existing_record.id IS NULL THEN
      INSERT INTO geoinsight_income_records (
        user_id,
        fee_definition_id,
        description,
        amount_due,
        currency,
        status,
        due_date
      ) VALUES (
        v_user_record.id,
        v_fee_definition.id,
        'Monthly GeoInsight platform fee for ' || TO_CHAR(CURRENT_DATE, 'Month YYYY'),
        v_fee_definition.fixed_amount,
        v_fee_definition.currency,
        'pending',
        DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'
      );
      
      -- Notify user
      PERFORM create_notification(
        v_user_record.id,
        'payment_proof_submitted',
        'Monthly Fee Due',
        'Your monthly GeoInsight fee of ' || v_fee_definition.fixed_amount || ' ' || 
        v_fee_definition.currency || ' is now due. Please submit payment.',
        '/geoinsight-payments'
      );
    END IF;
  END LOOP;
END;
$$;