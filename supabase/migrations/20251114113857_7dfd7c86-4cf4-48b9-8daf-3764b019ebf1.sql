-- Create enum types for payment proofs and deal closures
CREATE TYPE payment_proof_status AS ENUM (
  'pending_seller_confirmation',
  'pending_admin_review',
  'approved',
  'rejected'
);

CREATE TYPE deal_closure_status AS ENUM (
  'pending_admin_validation',
  'closed',
  'disputed',
  'cancelled'
);

CREATE TYPE compliance_flag_type AS ENUM (
  'payment_mismatch',
  'duplicate_polygon',
  'suspicious_listing',
  'buyer_seller_conflict',
  'other'
);

-- Payment Proofs Table
CREATE TABLE public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_reference TEXT,
  proof_file_url TEXT NOT NULL,
  proof_type TEXT NOT NULL,
  buyer_notes TEXT,
  status payment_proof_status NOT NULL DEFAULT 'pending_seller_confirmation',
  seller_notes TEXT,
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seller_confirmed_at TIMESTAMPTZ,
  admin_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deal Closures Table
CREATE TABLE public.deal_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_proof_id UUID NOT NULL REFERENCES public.payment_proofs(id) ON DELETE CASCADE,
  final_price NUMERIC NOT NULL,
  closure_status deal_closure_status NOT NULL DEFAULT 'pending_admin_validation',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Compliance Flags Table
CREATE TABLE public.compliance_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  payment_proof_id UUID REFERENCES public.payment_proofs(id) ON DELETE SET NULL,
  triggered_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type compliance_flag_type NOT NULL,
  severity INTEGER NOT NULL DEFAULT 3 CHECK (severity >= 1 AND severity <= 5),
  notes TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_proofs

-- Buyers can insert their own payment proofs
CREATE POLICY "Buyers can submit payment proofs"
ON public.payment_proofs FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Buyers can view their own payment proofs
CREATE POLICY "Buyers can view own payment proofs"
ON public.payment_proofs FOR SELECT
USING (auth.uid() = buyer_id);

-- Sellers can view payment proofs for their listings
CREATE POLICY "Sellers can view payment proofs for their listings"
ON public.payment_proofs FOR SELECT
USING (auth.uid() = seller_id);

-- Sellers can update payment proofs for confirmation
CREATE POLICY "Sellers can confirm payment proofs"
ON public.payment_proofs FOR UPDATE
USING (auth.uid() = seller_id);

-- Admins can view all payment proofs
CREATE POLICY "Admins can view all payment proofs"
ON public.payment_proofs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'verification_officer', 'compliance_officer')
));

-- Admins can update all payment proofs
CREATE POLICY "Admins can update all payment proofs"
ON public.payment_proofs FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'verification_officer', 'compliance_officer')
));

-- RLS Policies for deal_closures

-- Buyers can view their own deal closures
CREATE POLICY "Buyers can view own deal closures"
ON public.deal_closures FOR SELECT
USING (auth.uid() = buyer_id);

-- Sellers can view their deal closures
CREATE POLICY "Sellers can view their deal closures"
ON public.deal_closures FOR SELECT
USING (auth.uid() = seller_id);

-- Admins can view all deal closures
CREATE POLICY "Admins can view all deal closures"
ON public.deal_closures FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'verification_officer', 'compliance_officer')
));

-- Admins can insert deal closures
CREATE POLICY "Admins can create deal closures"
ON public.deal_closures FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'verification_officer')
));

-- Admins can update deal closures
CREATE POLICY "Admins can update deal closures"
ON public.deal_closures FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'verification_officer')
));

-- RLS Policies for compliance_flags

-- Admins and compliance officers can view all flags
CREATE POLICY "Admins can view all compliance flags"
ON public.compliance_flags FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'verification_officer', 'compliance_officer')
));

-- System can insert flags
CREATE POLICY "System can create compliance flags"
ON public.compliance_flags FOR INSERT
WITH CHECK (auth.uid() = triggered_by);

-- Admins can update flags
CREATE POLICY "Admins can update compliance flags"
ON public.compliance_flags FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'compliance_officer')
));

-- Storage policies for payment-proofs bucket
CREATE POLICY "Users can upload their payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'verification_officer', 'compliance_officer')
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_payment_proofs_updated_at
BEFORE UPDATE ON public.payment_proofs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deal_closures_updated_at
BEFORE UPDATE ON public.deal_closures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_flags_updated_at
BEFORE UPDATE ON public.compliance_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create compliance flags on payment mismatches
CREATE OR REPLACE FUNCTION check_payment_mismatch()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_payment_mismatch_trigger
AFTER INSERT ON public.payment_proofs
FOR EACH ROW
EXECUTE FUNCTION check_payment_mismatch();

-- Add closed status to listing_status enum
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'closed';