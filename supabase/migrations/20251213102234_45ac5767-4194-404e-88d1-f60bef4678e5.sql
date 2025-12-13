-- Add staff assignment and commission tracking to buying_process_tracker
ALTER TABLE public.buying_process_tracker
ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.05,
ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS commission_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS commission_amount NUMERIC,
ADD COLUMN IF NOT EXISTS staff_notes TEXT;

-- Create index for staff assignments
CREATE INDEX IF NOT EXISTS idx_buying_process_assigned_staff ON buying_process_tracker(assigned_staff_id);

-- Update RLS policies for staff access
DROP POLICY IF EXISTS "Staff can view all buying processes" ON buying_process_tracker;
CREATE POLICY "Staff can view all buying processes"
ON buying_process_tracker FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'verification_officer'::app_role) OR
  has_role(auth.uid(), 'compliance_officer'::app_role) OR
  has_role(auth.uid(), 'spatial_analyst'::app_role) OR
  has_role(auth.uid(), 'customer_success'::app_role) OR
  auth.uid() = buyer_id OR
  auth.uid() = seller_id
);

DROP POLICY IF EXISTS "Staff can update buying processes" ON buying_process_tracker;
CREATE POLICY "Staff can update buying processes"
ON buying_process_tracker FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'verification_officer'::app_role) OR
  has_role(auth.uid(), 'compliance_officer'::app_role) OR
  has_role(auth.uid(), 'spatial_analyst'::app_role) OR
  has_role(auth.uid(), 'customer_success'::app_role) OR
  auth.uid() = buyer_id OR
  auth.uid() = seller_id
);

-- Allow staff to assign themselves
DROP POLICY IF EXISTS "Staff can assign themselves" ON buying_process_tracker;
CREATE POLICY "Staff can assign themselves"
ON buying_process_tracker FOR UPDATE
USING (
  assigned_staff_id IS NULL OR
  assigned_staff_id = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role)
);