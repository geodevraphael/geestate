-- Add location coordinates to service_provider_profiles for proximity search
ALTER TABLE public.service_provider_profiles 
ADD COLUMN IF NOT EXISTS office_latitude numeric,
ADD COLUMN IF NOT EXISTS office_longitude numeric,
ADD COLUMN IF NOT EXISTS office_address text;