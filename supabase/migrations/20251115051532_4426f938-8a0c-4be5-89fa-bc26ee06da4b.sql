-- Create payment account settings table for admin to configure payment details
CREATE TABLE IF NOT EXISTS public.payment_account_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  swift_code TEXT,
  currency TEXT NOT NULL DEFAULT 'TZS',
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscription payment proofs table
CREATE TABLE IF NOT EXISTS public.subscription_payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  subscription_id UUID REFERENCES public.subscriptions(id),
  plan_type subscription_plan NOT NULL,
  amount_paid NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_reference TEXT,
  proof_file_url TEXT NOT NULL,
  buyer_notes TEXT,
  admin_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transaction reviews table for buyer-seller ratings
CREATE TABLE IF NOT EXISTS public.transaction_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_closure_id UUID NOT NULL REFERENCES public.deal_closures(id),
  listing_id UUID NOT NULL REFERENCES public.listings(id),
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  reviewed_user_id UUID NOT NULL REFERENCES public.profiles(id),
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('buyer', 'seller')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 5),
  reliability_score INTEGER CHECK (reliability_score >= 1 AND reliability_score <= 5),
  honesty_score INTEGER CHECK (honesty_score >= 1 AND honesty_score <= 5),
  review_text TEXT,
  would_transact_again BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_closure_id, reviewer_id)
);

-- Enable RLS
ALTER TABLE public.payment_account_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_account_settings
CREATE POLICY "Anyone can view active payment accounts"
  ON public.payment_account_settings FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage payment accounts"
  ON public.payment_account_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for subscription_payment_proofs
CREATE POLICY "Users can create their own subscription payment proofs"
  ON public.subscription_payment_proofs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscription payment proofs"
  ON public.subscription_payment_proofs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscription payment proofs"
  ON public.subscription_payment_proofs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'verification_officer'::app_role));

CREATE POLICY "Admins can update subscription payment proofs"
  ON public.subscription_payment_proofs FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'verification_officer'::app_role));

-- RLS Policies for transaction_reviews
CREATE POLICY "Users can create reviews for their completed deals"
  ON public.transaction_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM public.deal_closures
      WHERE deal_closures.id = transaction_reviews.deal_closure_id
      AND deal_closures.closure_status = 'closed'
      AND (
        (deal_closures.buyer_id = auth.uid() AND transaction_reviews.reviewer_role = 'buyer') OR
        (deal_closures.seller_id = auth.uid() AND transaction_reviews.reviewer_role = 'seller')
      )
    )
  );

CREATE POLICY "Anyone can view transaction reviews"
  ON public.transaction_reviews FOR SELECT
  USING (true);

CREATE POLICY "Admins can view all reviews"
  ON public.transaction_reviews FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update reputation scores from transaction reviews
CREATE OR REPLACE FUNCTION public.update_reputation_from_review()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.reputation_scores
  SET 
    communication_score = LEAST(100, communication_score + (NEW.communication_score - 3)),
    reliability_score = LEAST(100, reliability_score + (NEW.reliability_score - 3)),
    honesty_score = LEAST(100, honesty_score + (NEW.honesty_score - 3)),
    total_score = total_score + ((NEW.rating - 3) * 2),
    last_updated = NOW()
  WHERE user_id = NEW.reviewed_user_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_transaction_review_created
  AFTER INSERT ON public.transaction_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reputation_from_review();

-- Add updated_at trigger
CREATE TRIGGER update_payment_account_settings_updated_at
  BEFORE UPDATE ON public.payment_account_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_payment_proofs_updated_at
  BEFORE UPDATE ON public.subscription_payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transaction_reviews_updated_at
  BEFORE UPDATE ON public.transaction_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();