-- STEP 6 DATABASE SCHEMA

-- ========================================
-- MODULE 1: Multilingual Support
-- ========================================

-- Add locale preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_locale text DEFAULT 'en' CHECK (preferred_locale IN ('en', 'sw'));

-- Add Swahili fields to listings
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS title_sw text,
ADD COLUMN IF NOT EXISTS description_sw text;

-- ========================================
-- MODULE 3: CRM Tables
-- ========================================

-- Lead source enum
CREATE TYPE lead_source AS ENUM ('message', 'visit_request', 'direct_contact', 'import');

-- Lead status enum
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'interested', 'not_interested', 'under_offer', 'closed', 'lost');

-- CRM task status enum
CREATE TYPE crm_task_status AS ENUM ('pending', 'done', 'overdue');

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source lead_source NOT NULL,
  status lead_status NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CRM Tasks table
CREATE TABLE public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status crm_task_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_leads_seller ON public.leads(seller_id);
CREATE INDEX idx_leads_buyer ON public.leads(buyer_id);
CREATE INDEX idx_leads_listing ON public.leads(listing_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_crm_tasks_seller ON public.crm_tasks(seller_id);
CREATE INDEX idx_crm_tasks_lead ON public.crm_tasks(lead_id);
CREATE INDEX idx_crm_tasks_due_date ON public.crm_tasks(due_date) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Sellers can view their own leads"
  ON public.leads FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can view leads where they are the buyer"
  ON public.leads FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Admins can view all leads"
  ON public.leads FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'customer_success'::app_role));

CREATE POLICY "Sellers can insert their own leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own leads"
  ON public.leads FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Admins can update all leads"
  ON public.leads FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'customer_success'::app_role));

-- RLS Policies for crm_tasks
CREATE POLICY "Sellers can view their own tasks"
  ON public.crm_tasks FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all tasks"
  ON public.crm_tasks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers can manage their own tasks"
  ON public.crm_tasks FOR ALL
  USING (auth.uid() = seller_id);

-- ========================================
-- MODULE 4: Webhooks & Integrations
-- ========================================

-- Webhook event type enum
CREATE TYPE webhook_event_type AS ENUM (
  'listing_created',
  'listing_closed',
  'payment_proof_submitted',
  'deal_closed',
  'dispute_opened',
  'visit_requested'
);

-- Webhook subscriptions table
CREATE TABLE public.webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  secret_token TEXT NOT NULL,
  event_type webhook_event_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_delivery_at TIMESTAMPTZ,
  last_delivery_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook delivery log
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  event_type webhook_event_type NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_webhook_subscriptions_owner ON public.webhook_subscriptions(owner_id);
CREATE INDEX idx_webhook_subscriptions_event ON public.webhook_subscriptions(event_type) WHERE is_active = true;
CREATE INDEX idx_webhook_deliveries_subscription ON public.webhook_deliveries(subscription_id);
CREATE INDEX idx_webhook_deliveries_created ON public.webhook_deliveries(created_at);

-- Enable RLS
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_subscriptions
CREATE POLICY "Users can view their own webhooks"
  ON public.webhook_subscriptions FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can manage their own webhooks"
  ON public.webhook_subscriptions FOR ALL
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can view all webhooks"
  ON public.webhook_subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for webhook_deliveries
CREATE POLICY "Webhook owners can view their deliveries"
  ON public.webhook_deliveries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.webhook_subscriptions
    WHERE webhook_subscriptions.id = webhook_deliveries.subscription_id
    AND webhook_subscriptions.owner_id = auth.uid()
  ));

CREATE POLICY "System can insert deliveries"
  ON public.webhook_deliveries FOR INSERT
  WITH CHECK (true);

-- ========================================
-- MODULE 7: System Monitoring
-- ========================================

-- System errors log
CREATE TABLE public.system_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  stack_trace TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for recent errors
CREATE INDEX idx_system_errors_created ON public.system_errors(created_at DESC);

-- Enable RLS
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Only admins can view errors
CREATE POLICY "Admins can view system errors"
  ON public.system_errors FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert errors"
  ON public.system_errors FOR INSERT
  WITH CHECK (true);

-- ========================================
-- TRIGGERS
-- ========================================

-- Auto-create leads from messages
CREATE OR REPLACE FUNCTION create_lead_from_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create lead if message is about a listing and from buyer to seller
  IF NEW.listing_id IS NOT NULL THEN
    INSERT INTO public.leads (listing_id, seller_id, buyer_id, source, status)
    SELECT 
      NEW.listing_id,
      NEW.receiver_id,
      NEW.sender_id,
      'message'::lead_source,
      'new'::lead_status
    FROM public.listings
    WHERE listings.id = NEW.listing_id
    AND listings.owner_id = NEW.receiver_id
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_message_create_lead
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION create_lead_from_message();

-- Auto-create leads from visit requests
CREATE OR REPLACE FUNCTION create_lead_from_visit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.leads (listing_id, seller_id, buyer_id, source, status)
  VALUES (
    NEW.listing_id,
    NEW.seller_id,
    NEW.buyer_id,
    'visit_request'::lead_source,
    'interested'::lead_status
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_visit_request_create_lead
  AFTER INSERT ON public.visit_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_lead_from_visit();

-- Update task status to overdue
CREATE OR REPLACE FUNCTION update_overdue_tasks()
RETURNS void AS $$
BEGIN
  UPDATE public.crm_tasks
  SET status = 'overdue'::crm_task_status
  WHERE status = 'pending'::crm_task_status
  AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update timestamps
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_tasks_updated_at
  BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_subscriptions_updated_at
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();