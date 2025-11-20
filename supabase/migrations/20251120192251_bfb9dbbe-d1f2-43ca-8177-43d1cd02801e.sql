-- Create role_requests table for managing seller/broker role applications
CREATE TABLE IF NOT EXISTS public.role_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_role app_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  business_name TEXT,
  license_number TEXT,
  experience_years INTEGER,
  portfolio_url TEXT,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,
  UNIQUE(user_id, requested_role)
);

-- Enable RLS
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own role requests"
ON public.role_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND requested_role IN ('seller'::app_role, 'broker'::app_role));

CREATE POLICY "Users can view their own role requests"
ON public.role_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update role requests"
ON public.role_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all role requests"
ON public.role_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to handle role request approval
CREATE OR REPLACE FUNCTION public.approve_role_request(request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request role_requests%ROWTYPE;
BEGIN
  -- Get the request
  SELECT * INTO v_request FROM role_requests WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role request not found';
  END IF;
  
  -- Assign the role
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (v_request.user_id, v_request.requested_role, auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update request status
  UPDATE public.role_requests
  SET 
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = request_id;
  
  -- Notify user
  PERFORM create_notification(
    v_request.user_id,
    'listing_verified',
    'Role Request Approved',
    'Your application to become a ' || v_request.requested_role || ' has been approved!',
    '/dashboard'
  );
END;
$$;

-- Function to handle role request rejection
CREATE OR REPLACE FUNCTION public.reject_role_request(request_id UUID, reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request role_requests%ROWTYPE;
BEGIN
  -- Get the request
  SELECT * INTO v_request FROM role_requests WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role request not found';
  END IF;
  
  -- Update request status
  UPDATE public.role_requests
  SET 
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    rejection_reason = reason
  WHERE id = request_id;
  
  -- Notify user
  PERFORM create_notification(
    v_request.user_id,
    'listing_verified',
    'Role Request Rejected',
    'Your application to become a ' || v_request.requested_role || ' was not approved. ' || COALESCE(reason, ''),
    '/dashboard'
  );
END;
$$;