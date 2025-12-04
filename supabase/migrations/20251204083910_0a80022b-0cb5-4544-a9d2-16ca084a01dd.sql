-- Create table for survey plan listing requests
CREATE TABLE public.listing_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  survey_plan_url TEXT NOT NULL,
  location_description TEXT,
  contact_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listing_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create their own listing requests"
ON public.listing_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own listing requests"
ON public.listing_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all listing requests"
ON public.listing_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'verification_officer'));

CREATE POLICY "Admins can update listing requests"
ON public.listing_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'verification_officer'));

-- Create storage bucket for survey plans
INSERT INTO storage.buckets (id, name, public) VALUES ('survey-plans', 'survey-plans', true);

-- Storage policies
CREATE POLICY "Anyone can view survey plans"
ON storage.objects FOR SELECT
USING (bucket_id = 'survey-plans');

CREATE POLICY "Authenticated users can upload survey plans"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'survey-plans' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own survey plans"
ON storage.objects FOR UPDATE
USING (bucket_id = 'survey-plans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own survey plans"
ON storage.objects FOR DELETE
USING (bucket_id = 'survey-plans' AND auth.uid()::text = (storage.foldername(name))[1]);