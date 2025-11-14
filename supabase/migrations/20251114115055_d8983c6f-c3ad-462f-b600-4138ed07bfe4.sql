-- Create enum types for STEP 3
CREATE TYPE message_type AS ENUM ('text', 'system');
CREATE TYPE subscription_plan AS ENUM ('basic', 'pro', 'enterprise');
CREATE TYPE fraud_signal_type AS ENUM (
  'duplicate_polygon',
  'similar_polygon',
  'cross_boundary_error',
  'fake_payment',
  'self_intersecting_polygon',
  'rapid_price_drop',
  'multiple_accounts_same_phone',
  'immediate_closure_attempt'
);
CREATE TYPE notification_type AS ENUM (
  'new_message',
  'payment_proof_submitted',
  'payment_confirmed',
  'deal_approved',
  'deal_rejected',
  'compliance_flag',
  'subscription_expiring',
  'listing_verified'
);

-- Messages Table (Module 1)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reputation Scores Table (Module 2)
CREATE TABLE public.reputation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0,
  reliability_score INTEGER NOT NULL DEFAULT 50 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  communication_score INTEGER NOT NULL DEFAULT 50 CHECK (communication_score >= 0 AND communication_score <= 100),
  honesty_score INTEGER NOT NULL DEFAULT 50 CHECK (honesty_score >= 0 AND honesty_score <= 100),
  deals_closed_count INTEGER NOT NULL DEFAULT 0,
  fraud_flags_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fraud Signals Table (Module 3)
CREATE TABLE public.fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type fraud_signal_type NOT NULL,
  signal_score INTEGER NOT NULL CHECK (signal_score >= 1 AND signal_score <= 20),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions Table (Module 4)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type subscription_plan NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  amount_paid NUMERIC,
  invoice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications Table (Module 6)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_messages_listing ON public.messages(listing_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_timestamp ON public.messages(timestamp DESC);
CREATE INDEX idx_reputation_user ON public.reputation_scores(user_id);
CREATE INDEX idx_reputation_total_score ON public.reputation_scores(total_score DESC);
CREATE INDEX idx_fraud_signals_listing ON public.fraud_signals(listing_id);
CREATE INDEX idx_fraud_signals_user ON public.fraud_signals(user_id);
CREATE INDEX idx_fraud_signals_type ON public.fraud_signals(signal_type);
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_active ON public.subscriptions(is_active, end_date);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can mark their received messages as read"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id);

CREATE POLICY "Admins can view all messages"
ON public.messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'compliance_officer')
));

-- RLS Policies for reputation_scores
CREATE POLICY "Users can view all reputation scores"
ON public.reputation_scores FOR SELECT
USING (true);

CREATE POLICY "System can update reputation scores"
ON public.reputation_scores FOR UPDATE
USING (true);

CREATE POLICY "System can insert reputation scores"
ON public.reputation_scores FOR INSERT
WITH CHECK (true);

-- RLS Policies for fraud_signals
CREATE POLICY "Admins can view all fraud signals"
ON public.fraud_signals FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('admin', 'compliance_officer', 'verification_officer')
));

CREATE POLICY "System can create fraud signals"
ON public.fraud_signals FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'admin'
));

CREATE POLICY "Admins can update subscriptions"
ON public.subscriptions FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'admin'
));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create reputation score on profile creation
CREATE OR REPLACE FUNCTION create_reputation_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.reputation_scores (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_reputation_score_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION create_reputation_score();

-- Function to update reputation on deal closure
CREATE OR REPLACE FUNCTION update_reputation_on_closure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.closure_status = 'closed' AND OLD.closure_status != 'closed' THEN
    -- Update buyer reputation
    UPDATE public.reputation_scores
    SET 
      reliability_score = LEAST(100, reliability_score + 2),
      deals_closed_count = deals_closed_count + 1,
      total_score = total_score + 2,
      last_updated = NOW()
    WHERE user_id = NEW.buyer_id;
    
    -- Update seller reputation
    UPDATE public.reputation_scores
    SET 
      honesty_score = LEAST(100, honesty_score + 2),
      reliability_score = LEAST(100, reliability_score + 3),
      deals_closed_count = deals_closed_count + 1,
      total_score = total_score + 5,
      last_updated = NOW()
    WHERE user_id = NEW.seller_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_reputation_on_closure_trigger
AFTER UPDATE ON public.deal_closures
FOR EACH ROW
EXECUTE FUNCTION update_reputation_on_closure();

-- Function to update reputation on compliance flag
CREATE OR REPLACE FUNCTION update_reputation_on_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.reputation_scores
  SET 
    honesty_score = GREATEST(0, honesty_score - 5),
    fraud_flags_count = fraud_flags_count + 1,
    total_score = total_score - 5,
    last_updated = NOW()
  WHERE user_id = NEW.triggered_by;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_reputation_on_flag_trigger
AFTER INSERT ON public.compliance_flags
FOR EACH ROW
EXECUTE FUNCTION update_reputation_on_flag();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_link_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_link_url)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function to notify on new message
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_listing_title TEXT;
BEGIN
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  SELECT title INTO v_listing_title FROM public.listings WHERE id = NEW.listing_id;
  
  PERFORM create_notification(
    NEW.receiver_id,
    'new_message',
    'New Message',
    v_sender_name || ' sent you a message about "' || v_listing_title || '"',
    '/messages?listing=' || NEW.listing_id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_new_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_message();

-- Function to notify on payment proof submission
CREATE OR REPLACE FUNCTION notify_on_payment_proof()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_title TEXT;
  v_buyer_name TEXT;
BEGIN
  SELECT title INTO v_listing_title FROM public.listings WHERE id = NEW.listing_id;
  SELECT full_name INTO v_buyer_name FROM public.profiles WHERE id = NEW.buyer_id;
  
  -- Notify seller
  PERFORM create_notification(
    NEW.seller_id,
    'payment_proof_submitted',
    'Payment Proof Submitted',
    v_buyer_name || ' submitted payment proof for "' || v_listing_title || '"',
    '/payment-proofs'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_payment_proof_trigger
AFTER INSERT ON public.payment_proofs
FOR EACH ROW
EXECUTE FUNCTION notify_on_payment_proof();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;