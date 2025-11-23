-- Create buying process tracker table
CREATE TABLE IF NOT EXISTS public.buying_process_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  visit_request_id UUID REFERENCES public.visit_requests(id),
  current_step INTEGER NOT NULL DEFAULT 0,
  
  -- Step 0: Field Visit
  visit_completed BOOLEAN DEFAULT false,
  visit_completed_at TIMESTAMP WITH TIME ZONE,
  visit_notes TEXT,
  
  -- Step 1: Title Deed Verification
  title_verification_completed BOOLEAN DEFAULT false,
  title_verification_completed_at TIMESTAMP WITH TIME ZONE,
  title_deed_number TEXT,
  title_registry_office TEXT,
  title_verification_date DATE,
  title_verification_notes TEXT,
  
  -- Step 2: Land Registry Search
  registry_search_completed BOOLEAN DEFAULT false,
  registry_search_completed_at TIMESTAMP WITH TIME ZONE,
  registry_search_date DATE,
  encumbrance_status TEXT,
  registry_search_findings TEXT,
  
  -- Step 3: Sale Agreement
  sale_agreement_completed BOOLEAN DEFAULT false,
  sale_agreement_completed_at TIMESTAMP WITH TIME ZONE,
  lawyer_name TEXT,
  lawyer_contact TEXT,
  agreement_date DATE,
  agreement_notes TEXT,
  
  -- Step 4: Payment Arrangement
  payment_completed BOOLEAN DEFAULT false,
  payment_completed_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  payment_reference TEXT,
  payment_date DATE,
  payment_notes TEXT,
  
  -- Step 5: Ownership Transfer
  transfer_completed BOOLEAN DEFAULT false,
  transfer_completed_at TIMESTAMP WITH TIME ZONE,
  transfer_date DATE,
  new_title_deed_number TEXT,
  final_completion_date DATE,
  transfer_notes TEXT,
  
  -- Process status
  process_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (process_status IN ('in_progress', 'completed', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_buying_process_buyer ON public.buying_process_tracker(buyer_id);
CREATE INDEX idx_buying_process_listing ON public.buying_process_tracker(listing_id);

-- Enable RLS
ALTER TABLE public.buying_process_tracker ENABLE ROW LEVEL SECURITY;

-- Buyers can view and manage their own buying processes
CREATE POLICY "Buyers can view own buying processes"
  ON public.buying_process_tracker
  FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can insert own buying processes"
  ON public.buying_process_tracker
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update own buying processes"
  ON public.buying_process_tracker
  FOR UPDATE
  USING (auth.uid() = buyer_id);

-- Sellers can view buying processes for their listings
CREATE POLICY "Sellers can view buying processes for their listings"
  ON public.buying_process_tracker
  FOR SELECT
  USING (auth.uid() = seller_id);

-- Admins can view all buying processes
CREATE POLICY "Admins can view all buying processes"
  ON public.buying_process_tracker
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'compliance_officer'::app_role) OR 
    has_role(auth.uid(), 'verification_officer'::app_role)
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_buying_process_tracker_updated_at
  BEFORE UPDATE ON public.buying_process_tracker
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();