-- Fix search_path security issue for check_payment_mismatch function
CREATE OR REPLACE FUNCTION check_payment_mismatch()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if payment amount differs significantly from listing price
  IF EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = NEW.listing_id
    AND price IS NOT NULL
    AND ABS(price - NEW.amount_paid) > (price * 0.1) -- 10% tolerance
  ) THEN
    INSERT INTO public.compliance_flags (
      listing_id,
      payment_proof_id,
      triggered_by,
      type,
      severity,
      notes
    ) VALUES (
      NEW.listing_id,
      NEW.id,
      NEW.buyer_id,
      'payment_mismatch',
      3,
      'Payment amount differs from listing price by more than 10%'
    );
  END IF;
  
  RETURN NEW;
END;
$$;