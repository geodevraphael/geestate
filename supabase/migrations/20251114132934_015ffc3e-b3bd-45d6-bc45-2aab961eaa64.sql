-- Phase 1: Critical Security Fix - Secure Role System
-- This migration creates a separate user_roles table to prevent privilege escalation

-- Step 1: Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 3: Create helper function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_primary_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY assigned_at ASC
  LIMIT 1
$$;

-- Step 4: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
SELECT id, role, NULL, created_at
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can assign roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can revoke roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Step 6: Drop all existing role-based RLS policies and recreate with has_role()

-- audit_logs policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- compliance_flags policies
DROP POLICY IF EXISTS "Admins can update compliance flags" ON public.compliance_flags;
DROP POLICY IF EXISTS "Admins can view all compliance flags" ON public.compliance_flags;

CREATE POLICY "Admins can update compliance flags"
ON public.compliance_flags FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'compliance_officer'));

CREATE POLICY "Admins can view all compliance flags"
ON public.compliance_flags FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'verification_officer') OR 
  public.has_role(auth.uid(), 'compliance_officer')
);

-- deal_closures policies
DROP POLICY IF EXISTS "Admins can create deal closures" ON public.deal_closures;
DROP POLICY IF EXISTS "Admins can update deal closures" ON public.deal_closures;
DROP POLICY IF EXISTS "Admins can view all deal closures" ON public.deal_closures;

CREATE POLICY "Admins can create deal closures"
ON public.deal_closures FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'verification_officer')
);

CREATE POLICY "Admins can update deal closures"
ON public.deal_closures FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'verification_officer')
);

CREATE POLICY "Admins can view all deal closures"
ON public.deal_closures FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'verification_officer') OR 
  public.has_role(auth.uid(), 'compliance_officer') OR
  auth.uid() = buyer_id OR
  auth.uid() = seller_id
);

-- disputes policies
DROP POLICY IF EXISTS "Admins can update disputes" ON public.disputes;
DROP POLICY IF EXISTS "Admins can view all disputes" ON public.disputes;

CREATE POLICY "Admins can update disputes"
ON public.disputes FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'compliance_officer')
);

CREATE POLICY "Admins can view all disputes"
ON public.disputes FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'compliance_officer') OR 
  public.has_role(auth.uid(), 'verification_officer') OR
  auth.uid() = opened_by OR
  auth.uid() = buyer_id OR
  auth.uid() = seller_id
);

-- districts policies
DROP POLICY IF EXISTS "Admins can manage districts" ON public.districts;
CREATE POLICY "Admins can manage districts"
ON public.districts FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- fraud_signals policies
DROP POLICY IF EXISTS "Admins can view all fraud signals" ON public.fraud_signals;
CREATE POLICY "Admins can view all fraud signals"
ON public.fraud_signals FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'compliance_officer') OR 
  public.has_role(auth.uid(), 'verification_officer')
);

-- institutional_sellers policies
DROP POLICY IF EXISTS "Admins can update institutional sellers" ON public.institutional_sellers;
DROP POLICY IF EXISTS "Admins can view all institutional sellers" ON public.institutional_sellers;

CREATE POLICY "Admins can update institutional sellers"
ON public.institutional_sellers FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all institutional sellers"
ON public.institutional_sellers FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = profile_id);

-- listing_media policies
DROP POLICY IF EXISTS "Admins can view all media" ON public.listing_media;
CREATE POLICY "Admins can view all media"
ON public.listing_media FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'verification_officer') OR 
  public.has_role(auth.uid(), 'compliance_officer') OR
  EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_media.listing_id AND (listings.status = 'published' OR listings.owner_id = auth.uid()))
);

-- listing_polygons policies
DROP POLICY IF EXISTS "Admins can view all polygons" ON public.listing_polygons;
CREATE POLICY "Admins can view all polygons"
ON public.listing_polygons FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'verification_officer') OR 
  public.has_role(auth.uid(), 'compliance_officer') OR
  EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_polygons.listing_id AND (listings.status = 'published' OR listings.owner_id = auth.uid()))
);

-- listings policies
DROP POLICY IF EXISTS "Admins can update any listing" ON public.listings;
DROP POLICY IF EXISTS "Admins can view all listings" ON public.listings;
DROP POLICY IF EXISTS "Owners can insert own listings" ON public.listings;

CREATE POLICY "Admins can update any listing"
ON public.listings FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'verification_officer') OR 
  public.has_role(auth.uid(), 'compliance_officer') OR
  auth.uid() = owner_id
);

CREATE POLICY "Admins can view all listings"
ON public.listings FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'verification_officer') OR 
  public.has_role(auth.uid(), 'compliance_officer') OR
  status = 'published' OR
  owner_id = auth.uid()
);

CREATE POLICY "Owners can insert own listings"
ON public.listings FOR INSERT
WITH CHECK (
  auth.uid() = owner_id AND (
    public.has_role(auth.uid(), 'seller') OR 
    public.has_role(auth.uid(), 'broker') OR 
    public.has_role(auth.uid(), 'admin')
  )
);

-- messages policies
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
CREATE POLICY "Admins can view all messages"
ON public.messages FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'compliance_officer') OR
  auth.uid() = sender_id OR
  auth.uid() = receiver_id
);

-- payment_proofs policies
DROP POLICY IF EXISTS "Admins can update all payment proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Admins can view all payment proofs" ON public.payment_proofs;

CREATE POLICY "Admins can update all payment proofs"
ON public.payment_proofs FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'verification_officer') OR 
  public.has_role(auth.uid(), 'compliance_officer') OR
  auth.uid() = seller_id
);

CREATE POLICY "Admins can view all payment proofs"
ON public.payment_proofs FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'verification_officer') OR 
  public.has_role(auth.uid(), 'compliance_officer') OR
  auth.uid() = buyer_id OR
  auth.uid() = seller_id
);

-- regions policies
DROP POLICY IF EXISTS "Admins can manage regions" ON public.regions;
CREATE POLICY "Admins can manage regions"
ON public.regions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- streets_villages policies
DROP POLICY IF EXISTS "Admins can manage streets_villages" ON public.streets_villages;
CREATE POLICY "Admins can manage streets_villages"
ON public.streets_villages FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- subscriptions policies
DROP POLICY IF EXISTS "Admins can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;

CREATE POLICY "Admins can update subscriptions"
ON public.subscriptions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- visit_requests policies
DROP POLICY IF EXISTS "Admins can view all visit requests" ON public.visit_requests;
CREATE POLICY "Admins can view all visit requests"
ON public.visit_requests FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  auth.uid() = buyer_id OR
  auth.uid() = seller_id
);

-- wards policies
DROP POLICY IF EXISTS "Admins can manage wards" ON public.wards;
CREATE POLICY "Admins can manage wards"
ON public.wards FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Step 7: Create trigger to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action_type, actor_id, action_details)
    VALUES ('role_assigned', NEW.assigned_by, jsonb_build_object(
      'user_id', NEW.user_id,
      'role', NEW.role,
      'operation', 'INSERT'
    ));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action_type, actor_id, action_details)
    VALUES ('role_revoked', auth.uid(), jsonb_build_object(
      'user_id', OLD.user_id,
      'role', OLD.role,
      'operation', 'DELETE'
    ));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_role_changes
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- Step 8: Remove role column from profiles (keeping it for now for compatibility, will remove in Phase 2)
-- COMMENT: We'll keep the role column for now to avoid breaking existing queries
-- It will be removed after all code is updated to use user_roles table

-- Step 9: Create index for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);