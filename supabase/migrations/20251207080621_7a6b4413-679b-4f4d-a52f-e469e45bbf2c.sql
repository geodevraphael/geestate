-- Make listing_id nullable for general service requests (not linked to a specific listing)
ALTER TABLE public.service_requests ALTER COLUMN listing_id DROP NOT NULL;