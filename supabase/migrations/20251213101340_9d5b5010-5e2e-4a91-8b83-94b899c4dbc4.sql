-- Attach the listing fee trigger (function exists but trigger wasn't created)
DROP TRIGGER IF EXISTS trigger_charge_listing_fee ON listings;

CREATE TRIGGER trigger_charge_listing_fee
  AFTER INSERT OR UPDATE OF status ON listings
  FOR EACH ROW
  EXECUTE FUNCTION charge_listing_fee();

-- Create function to update fees when price changes
CREATE OR REPLACE FUNCTION public.update_listing_fee_on_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fee_definition geoinsight_fee_definitions%ROWTYPE;
  v_new_fee_amount NUMERIC;
  v_listing_count INTEGER;
  v_total_value NUMERIC;
BEGIN
  -- Only trigger when price changes on a published listing
  IF NEW.status = 'published' AND NEW.price IS NOT NULL AND NEW.price > 0 
     AND (OLD.price IS NULL OR OLD.price != NEW.price) THEN
    
    -- Get the listing fee definition
    SELECT * INTO v_fee_definition 
    FROM geoinsight_fee_definitions 
    WHERE code = 'LISTING_FEE' AND is_active = true
    LIMIT 1;
    
    IF v_fee_definition.id IS NOT NULL THEN
      -- Calculate new totals for this user's published listings
      SELECT COUNT(*), SUM(price)
      INTO v_listing_count, v_total_value
      FROM listings
      WHERE owner_id = NEW.owner_id
        AND status = 'published'
        AND price IS NOT NULL
        AND price > 0;
      
      -- Calculate new fee amount
      v_new_fee_amount := v_total_value * v_fee_definition.percentage_rate;
      
      -- Update existing pending/awaiting_review grouped record
      UPDATE geoinsight_income_records
      SET 
        amount_due = v_new_fee_amount,
        description = 'Listing fees (0.1% of selling price) for ' || v_listing_count || ' properties - Total value: ' || v_total_value || ' TZS',
        updated_at = NOW()
      WHERE user_id = NEW.owner_id
        AND fee_definition_id = v_fee_definition.id
        AND status IN ('pending', 'awaiting_review')
        AND related_listing_id IS NULL;
      
      -- If no grouped record exists, update individual record for this listing
      IF NOT FOUND THEN
        UPDATE geoinsight_income_records
        SET 
          amount_due = NEW.price * v_fee_definition.percentage_rate,
          description = 'Listing fee (0.1%) for: ' || NEW.title,
          updated_at = NOW()
        WHERE related_listing_id = NEW.id
          AND fee_definition_id = v_fee_definition.id
          AND status IN ('pending', 'awaiting_review');
      END IF;
      
      -- Log audit
      INSERT INTO audit_logs (action_type, actor_id, listing_id, action_details)
      VALUES (
        'UPDATE_LISTING_FEE',
        NEW.owner_id,
        NEW.id,
        jsonb_build_object(
          'old_price', OLD.price,
          'new_price', NEW.price,
          'new_fee_amount', NEW.price * v_fee_definition.percentage_rate
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for price changes
DROP TRIGGER IF EXISTS trigger_update_listing_fee_on_price ON listings;

CREATE TRIGGER trigger_update_listing_fee_on_price
  AFTER UPDATE OF price ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_fee_on_price_change();