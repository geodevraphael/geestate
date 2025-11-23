-- Function to auto-set price from valuation estimate when publishing without price
CREATE OR REPLACE FUNCTION public.set_price_from_valuation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_estimated_value NUMERIC;
  v_currency TEXT;
BEGIN
  -- Only run when listing is being published (status changes to 'published')
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Check if price is NULL or 0
    IF NEW.price IS NULL OR NEW.price = 0 THEN
      -- Try to get valuation estimate
      SELECT estimated_value, estimation_currency 
      INTO v_estimated_value, v_currency
      FROM public.valuation_estimates
      WHERE listing_id = NEW.id
      ORDER BY created_at DESC
      LIMIT 1;
      
      -- If valuation exists, set it as price
      IF v_estimated_value IS NOT NULL AND v_estimated_value > 0 THEN
        NEW.price := v_estimated_value;
        -- Use valuation currency if available, otherwise keep existing currency
        IF v_currency IS NOT NULL THEN
          NEW.currency := v_currency;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS set_price_from_valuation_trigger ON public.listings;
CREATE TRIGGER set_price_from_valuation_trigger
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_price_from_valuation();