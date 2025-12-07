-- Add 2% service commission fee definition
INSERT INTO geoinsight_fee_definitions (code, name, description, fee_type, percentage_rate, currency, is_active)
VALUES ('SERVICE_COMMISSION', 'Service Transaction Commission', '2% commission on all service transactions completed through the platform', 'percentage', 0.02, 'TZS', true)
ON CONFLICT (code) DO UPDATE SET percentage_rate = 0.02, is_active = true;

-- Add payment confirmation columns to service_bookings
ALTER TABLE service_bookings 
ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS payment_confirmed_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS payment_reference text,
ADD COLUMN IF NOT EXISTS commission_record_id uuid REFERENCES geoinsight_income_records(id);

-- Create function to create commission record when client confirms payment
CREATE OR REPLACE FUNCTION create_service_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_fee_definition geoinsight_fee_definitions%ROWTYPE;
  v_commission_amount NUMERIC;
  v_provider_profile service_provider_profiles%ROWTYPE;
  v_service provider_services%ROWTYPE;
  v_income_id UUID;
BEGIN
  -- Only trigger when payment is confirmed and no commission record exists yet
  IF NEW.payment_confirmed_at IS NOT NULL AND OLD.payment_confirmed_at IS NULL AND NEW.commission_record_id IS NULL THEN
    -- Get the service commission fee definition
    SELECT * INTO v_fee_definition 
    FROM geoinsight_fee_definitions 
    WHERE code = 'SERVICE_COMMISSION' AND is_active = true
    LIMIT 1;
    
    IF v_fee_definition.id IS NOT NULL THEN
      -- Get service details
      SELECT * INTO v_service FROM provider_services WHERE id = NEW.service_id;
      
      -- Calculate 2% commission
      v_commission_amount := COALESCE(NEW.total_price, v_service.price, 0) * v_fee_definition.percentage_rate;
      
      -- Create income record for the service provider
      INSERT INTO geoinsight_income_records (
        user_id,
        fee_definition_id,
        description,
        amount_due,
        currency,
        status,
        due_date
      ) VALUES (
        NEW.provider_id,
        v_fee_definition.id,
        'Service commission (2%) for: ' || COALESCE(v_service.name, 'Service'),
        v_commission_amount,
        v_fee_definition.currency,
        'pending',
        NOW() + INTERVAL '7 days'
      )
      RETURNING id INTO v_income_id;
      
      -- Update booking with commission record reference
      NEW.commission_record_id := v_income_id;
      
      -- Notify service provider about the commission
      PERFORM create_notification(
        NEW.provider_id,
        'payment_proof_submitted',
        'Service Commission Due',
        'A commission of ' || v_commission_amount || ' TZS (2%) is due for your completed service.',
        '/geoinsight-payments'
      );
      
      -- Log audit
      INSERT INTO audit_logs (action_type, actor_id, action_details)
      VALUES (
        'CREATE_SERVICE_COMMISSION',
        NEW.payment_confirmed_by,
        jsonb_build_object(
          'booking_id', NEW.id,
          'service_name', v_service.name,
          'total_price', NEW.total_price,
          'commission_amount', v_commission_amount,
          'income_record_id', v_income_id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for service commission
DROP TRIGGER IF EXISTS trigger_create_service_commission ON service_bookings;
CREATE TRIGGER trigger_create_service_commission
  BEFORE UPDATE ON service_bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_service_commission();