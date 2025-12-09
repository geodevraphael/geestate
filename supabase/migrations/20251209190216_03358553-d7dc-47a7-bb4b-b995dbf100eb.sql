-- Add payment tracking columns to service_requests
ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC,
ADD COLUMN IF NOT EXISTS client_payment_reference TEXT;

-- Create trigger to generate 2% commission when provider confirms payment
CREATE OR REPLACE FUNCTION public.create_service_request_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_definition geoinsight_fee_definitions%ROWTYPE;
  v_commission_amount NUMERIC;
  v_income_id UUID;
  v_provider_user_id UUID;
  v_service_name TEXT;
BEGIN
  -- Only trigger when payment is confirmed for the first time
  IF NEW.payment_confirmed_at IS NOT NULL AND OLD.payment_confirmed_at IS NULL THEN
    -- Get the service commission fee definition (2%)
    SELECT * INTO v_fee_definition 
    FROM geoinsight_fee_definitions 
    WHERE code = 'SERVICE_COMMISSION' AND is_active = true
    LIMIT 1;
    
    IF v_fee_definition.id IS NOT NULL THEN
      -- Get provider user_id from provider profile
      SELECT user_id INTO v_provider_user_id
      FROM service_provider_profiles
      WHERE id = NEW.service_provider_id;
      
      -- Get service name
      v_service_name := NEW.service_type;
      
      -- Calculate 2% commission from payment amount or service price
      v_commission_amount := COALESCE(NEW.payment_amount, NEW.service_price, 0) * COALESCE(v_fee_definition.percentage_rate, 0.02);
      
      IF v_commission_amount > 0 AND v_provider_user_id IS NOT NULL THEN
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
          v_provider_user_id,
          v_fee_definition.id,
          'Service commission (2%) for: ' || v_service_name,
          v_commission_amount,
          COALESCE(v_fee_definition.currency, 'TZS'),
          'pending',
          NOW() + INTERVAL '7 days'
        )
        RETURNING id INTO v_income_id;
        
        -- Notify service provider about the commission
        PERFORM create_notification(
          v_provider_user_id,
          'payment_proof_submitted',
          'Service Commission Due',
          'A commission of TZS ' || v_commission_amount::TEXT || ' (2%) is due for your completed service: ' || v_service_name,
          '/geoinsight-payments'
        );
        
        -- Log audit
        INSERT INTO audit_logs (action_type, actor_id, action_details)
        VALUES (
          'CREATE_SERVICE_COMMISSION',
          v_provider_user_id,
          jsonb_build_object(
            'service_request_id', NEW.id,
            'service_name', v_service_name,
            'payment_amount', NEW.payment_amount,
            'commission_amount', v_commission_amount,
            'income_record_id', v_income_id
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for service request commission
DROP TRIGGER IF EXISTS trigger_service_request_commission ON public.service_requests;
CREATE TRIGGER trigger_service_request_commission
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_service_request_commission();