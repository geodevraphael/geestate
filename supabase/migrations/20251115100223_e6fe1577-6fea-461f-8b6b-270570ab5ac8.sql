-- GeoInsight Income Model
-- Table 1: Fee Definitions
CREATE TABLE IF NOT EXISTS public.geoinsight_fee_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('percentage', 'fixed')),
  percentage_rate NUMERIC,
  fixed_amount NUMERIC,
  currency TEXT DEFAULT 'TZS',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 2: Income Records
CREATE TABLE IF NOT EXISTS public.geoinsight_income_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  related_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  related_subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  fee_definition_id UUID NOT NULL REFERENCES public.geoinsight_fee_definitions(id),
  description TEXT NOT NULL,
  amount_due NUMERIC NOT NULL,
  currency TEXT DEFAULT 'TZS',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_review', 'paid', 'overdue', 'cancelled')),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  admin_verified_by UUID REFERENCES public.profiles(id),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 3: Payment Proofs for GeoInsight
CREATE TABLE IF NOT EXISTS public.geoinsight_payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_record_id UUID NOT NULL REFERENCES public.geoinsight_income_records(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proof_file_url TEXT,
  proof_text TEXT,
  payment_channel TEXT,
  transaction_reference TEXT,
  amount_paid NUMERIC,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected')),
  admin_reviewed_by UUID REFERENCES public.profiles(id),
  admin_review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 4: Invoices
CREATE TABLE IF NOT EXISTS public.geoinsight_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_record_id UUID UNIQUE NOT NULL REFERENCES public.geoinsight_income_records(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'sent', 'paid', 'cancelled')),
  issued_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_income_records_user ON public.geoinsight_income_records(user_id);
CREATE INDEX idx_income_records_status ON public.geoinsight_income_records(status);
CREATE INDEX idx_income_records_listing ON public.geoinsight_income_records(related_listing_id);
CREATE INDEX idx_payment_proofs_income ON public.geoinsight_payment_proofs(income_record_id);
CREATE INDEX idx_payment_proofs_status ON public.geoinsight_payment_proofs(status);
CREATE INDEX idx_invoices_income ON public.geoinsight_invoices(income_record_id);

-- Update triggers
CREATE TRIGGER update_fee_definitions_updated_at BEFORE UPDATE ON public.geoinsight_fee_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_income_records_updated_at BEFORE UPDATE ON public.geoinsight_income_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_proofs_updated_at BEFORE UPDATE ON public.geoinsight_payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.geoinsight_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Fee Definitions: Everyone can view active fees, only admins can manage
ALTER TABLE public.geoinsight_fee_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active fee definitions"
  ON public.geoinsight_fee_definitions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage fee definitions"
  ON public.geoinsight_fee_definitions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Income Records: Users can view their own, admins can view all
ALTER TABLE public.geoinsight_income_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own income records"
  ON public.geoinsight_income_records FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'compliance_officer'::app_role));

CREATE POLICY "System can create income records"
  ON public.geoinsight_income_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update income records"
  ON public.geoinsight_income_records FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'compliance_officer'::app_role));

-- Payment Proofs: Users can create their own, admins can review
ALTER TABLE public.geoinsight_payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment proofs"
  ON public.geoinsight_payment_proofs FOR SELECT
  USING (auth.uid() = payer_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'compliance_officer'::app_role));

CREATE POLICY "Users can create their own payment proofs"
  ON public.geoinsight_payment_proofs FOR INSERT
  WITH CHECK (auth.uid() = payer_id);

CREATE POLICY "Admins can update payment proofs"
  ON public.geoinsight_payment_proofs FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'compliance_officer'::app_role));

-- Invoices: Users can view their own, admins can manage
ALTER TABLE public.geoinsight_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices"
  ON public.geoinsight_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.geoinsight_income_records 
      WHERE geoinsight_income_records.id = geoinsight_invoices.income_record_id 
      AND geoinsight_income_records.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can manage invoices"
  ON public.geoinsight_invoices FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default fee definitions
INSERT INTO public.geoinsight_fee_definitions (code, name, description, fee_type, percentage_rate, currency, is_active) VALUES
  ('SALE_COMMISSION', 'Sale Commission', 'Commission on property sales', 'percentage', 0.02, 'TZS', true),
  ('RENT_COMMISSION', 'Rental Commission', 'Commission on rental listings', 'percentage', 0.10, 'TZS', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.geoinsight_fee_definitions (code, name, description, fee_type, fixed_amount, currency, is_active) VALUES
  ('LISTING_VERIFICATION', 'Listing Verification Fee', 'Fee for professional listing verification', 'fixed', 50000, 'TZS', true),
  ('PREMIUM_LISTING', 'Premium Listing Fee', 'Fee for premium listing boost', 'fixed', 100000, 'TZS', true),
  ('SUBSCRIPTION_BASIC', 'Basic Subscription', 'Monthly basic subscription fee', 'fixed', 50000, 'TZS', true),
  ('SUBSCRIPTION_PRO', 'Pro Subscription', 'Monthly pro subscription fee', 'fixed', 150000, 'TZS', true),
  ('SUBSCRIPTION_ENTERPRISE', 'Enterprise Subscription', 'Monthly enterprise subscription fee', 'fixed', 500000, 'TZS', true),
  ('FRAUD_PENALTY', 'Fraud Penalty', 'Penalty for fraudulent activity', 'fixed', 500000, 'TZS', true),
  ('LATE_REPORTING_PENALTY', 'Late Reporting Penalty', 'Penalty for late commission payment', 'fixed', 50000, 'TZS', true)
ON CONFLICT (code) DO NOTHING;

-- Function to create commission income record when deal closes
CREATE OR REPLACE FUNCTION public.create_commission_on_deal_closure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing listings%ROWTYPE;
  v_fee_definition geoinsight_fee_definitions%ROWTYPE;
  v_commission_amount NUMERIC;
  v_description TEXT;
BEGIN
  IF NEW.closure_status = 'closed' AND (OLD.closure_status IS NULL OR OLD.closure_status != 'closed') THEN
    -- Get listing details
    SELECT * INTO v_listing FROM listings WHERE id = NEW.listing_id;
    
    -- Determine fee type based on listing type
    IF v_listing.listing_type = 'sale' THEN
      SELECT * INTO v_fee_definition FROM geoinsight_fee_definitions WHERE code = 'SALE_COMMISSION' AND is_active = true;
    ELSIF v_listing.listing_type = 'rent' THEN
      SELECT * INTO v_fee_definition FROM geoinsight_fee_definitions WHERE code = 'RENT_COMMISSION' AND is_active = true;
    END IF;
    
    -- Calculate commission
    IF v_fee_definition.fee_type = 'percentage' THEN
      v_commission_amount := NEW.final_price * v_fee_definition.percentage_rate;
    ELSE
      v_commission_amount := v_fee_definition.fixed_amount;
    END IF;
    
    v_description := 'Commission for closed ' || v_listing.listing_type || ' on listing: ' || v_listing.title;
    
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
      NEW.seller_id,
      NEW.listing_id,
      v_fee_definition.id,
      v_description,
      v_commission_amount,
      v_listing.currency,
      'pending',
      NEW.closed_at + INTERVAL '7 days'
    );
    
    -- Log audit
    INSERT INTO audit_logs (action_type, actor_id, listing_id, action_details)
    VALUES (
      'CREATE_INCOME_RECORD',
      NEW.seller_id,
      NEW.listing_id,
      jsonb_build_object(
        'fee_type', v_fee_definition.code,
        'amount', v_commission_amount,
        'deal_closure_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on deal closures
CREATE TRIGGER trigger_create_commission_on_closure
  AFTER INSERT OR UPDATE ON public.deal_closures
  FOR EACH ROW
  EXECUTE FUNCTION public.create_commission_on_deal_closure();

-- Function to update income record when payment proof is accepted
CREATE OR REPLACE FUNCTION public.update_income_on_proof_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Update income record to paid
    UPDATE geoinsight_income_records
    SET 
      status = 'paid',
      paid_at = now(),
      admin_verified_by = NEW.admin_reviewed_by
    WHERE id = NEW.income_record_id;
    
    -- Log audit
    INSERT INTO audit_logs (action_type, actor_id, action_details)
    VALUES (
      'ACCEPT_PAYMENT_PROOF',
      NEW.admin_reviewed_by,
      jsonb_build_object(
        'proof_id', NEW.id,
        'income_record_id', NEW.income_record_id,
        'amount_paid', NEW.amount_paid
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on payment proof updates
CREATE TRIGGER trigger_update_income_on_proof
  AFTER UPDATE ON public.geoinsight_payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_income_on_proof_acceptance();