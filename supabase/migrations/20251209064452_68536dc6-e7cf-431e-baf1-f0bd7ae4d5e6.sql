-- Drop the existing foreign key constraint that points to the wrong table
ALTER TABLE public.service_requests 
DROP CONSTRAINT IF EXISTS service_requests_service_provider_id_fkey;

-- Add a new foreign key that references service_provider_profiles instead
ALTER TABLE public.service_requests
ADD CONSTRAINT service_requests_service_provider_id_fkey 
FOREIGN KEY (service_provider_id) 
REFERENCES public.service_provider_profiles(id) 
ON DELETE SET NULL;

-- Add a column for selected service from provider_services
ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS selected_service_id uuid REFERENCES public.provider_services(id) ON DELETE SET NULL;

-- Add quoted price from provider's service
ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS service_price numeric;